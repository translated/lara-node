import type { Readable } from "node:stream";
import { AccessKey, AuthToken } from "../../credentials";
import cryptoInstance, { type PortableCrypto } from "../../crypto";
import { LaraApiError } from "../../errors";
import { parseContent } from "../../utils/parse-content";
import { version as SdkVersion } from "../../utils/sdk-version";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/** @internal */
export type BaseURL = {
    secure: boolean;
    hostname: string;
    port: number;
};

/** @internal */
export type ClientResponse = {
    statusCode: number;
    body: any;
    headers: Record<string, string | string[] | undefined>;
};

export type BrowserMultiPartFile = File;
export type NodeMultiPartFile = Readable | string;
export type MultiPartFile = BrowserMultiPartFile | NodeMultiPartFile;

/** @internal */
export abstract class LaraClient {
    private readonly crypto: PortableCrypto = cryptoInstance();
    private readonly extraHeaders: Record<string, string> = {};

    private readonly accessKey?: AccessKey;
    private authToken?: AuthToken;

    protected token?: string;
    protected refreshToken?: string;
    private authenticationPromise?: Promise<void>;
    private refreshPromise?: Promise<void>;

    protected constructor(auth: AccessKey | AuthToken) {
        if (auth instanceof AccessKey) {
            this.accessKey = auth;
        } else if (auth instanceof AuthToken) {
            this.authToken = auth;
        } else {
            throw new Error("Invalid authentication method provided");
        }
    }

    setExtraHeader(name: string, value: string): void {
        this.extraHeaders[name] = value;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Public HTTP Methods
    // ─────────────────────────────────────────────────────────────────────────────

    get<T>(path: string, queryParams?: Record<string, any>, headers?: Record<string, string>): Promise<T> {
        return this.request("GET", this.buildPathWithQuery(path, queryParams), undefined, undefined, headers);
    }

    delete<T>(
        path: string,
        queryParams?: Record<string, any>,
        body?: Record<string, any>,
        headers?: Record<string, string>
    ): Promise<T> {
        return this.request("DELETE", this.buildPathWithQuery(path, queryParams), body, undefined, headers);
    }

    post<T>(
        path: string,
        body?: Record<string, any>,
        files?: Record<string, MultiPartFile>,
        headers?: Record<string, string>,
        streamResponse?: boolean
    ): Promise<T> {
        return this.request("POST", path, body, files, headers, undefined, streamResponse);
    }

    async *postAndGetStream<T>(
        path: string,
        body?: Record<string, any>,
        files?: Record<string, MultiPartFile>,
        headers?: Record<string, string>
    ): AsyncGenerator<T> {
        for await (const chunk of this.requestStream<T>("POST", path, body, files, headers)) {
            yield chunk;
        }
    }

    put<T>(
        path: string,
        body?: Record<string, any>,
        files?: Record<string, MultiPartFile>,
        headers?: Record<string, string>
    ): Promise<T> {
        return this.request("PUT", path, body, files, headers);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Request Handling
    // ─────────────────────────────────────────────────────────────────────────────

    protected async request<T>(
        method: HttpMethod,
        path: string,
        body?: Record<string, any>,
        files?: Record<string, MultiPartFile>,
        headers?: Record<string, string>,
        retryCount: number = 0,
        streamResponse?: boolean
    ): Promise<T> {
        await this.ensureAuthenticated();

        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        const requestHeaders = await this.buildRequestHeaders(body, files, headers);
        const requestBody = this.buildRequestBody(body, files);

        requestHeaders.Authorization = `Bearer ${this.token}`;

        const response = await this.send(method, normalizedPath, requestHeaders, requestBody, streamResponse);

        if (this.isSuccessResponse(response)) {
            return streamResponse ? (response.body as T) : (parseContent(response.body) as T);
        }

        // Handle 401 - token expired, refresh and retry once
        if (response.statusCode === 401 && retryCount < 1) {
            this.token = undefined;
            await this.refreshOrReauthenticate();
            return this.request(method, path, body, files, headers, retryCount + 1, streamResponse);
        }

        throw this.createApiError(response);
    }

    protected async *requestStream<T>(
        method: HttpMethod,
        path: string,
        body?: Record<string, any>,
        files?: Record<string, MultiPartFile>,
        headers?: Record<string, string>,
        retryCount: number = 0
    ): AsyncGenerator<T> {
        await this.ensureAuthenticated();

        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        const requestHeaders = await this.buildRequestHeaders(body, files, headers);
        const requestBody = this.buildRequestBody(body, files);

        requestHeaders.Authorization = `Bearer ${this.token}`;

        for await (const chunk of this.sendAndGetStream(method, normalizedPath, requestHeaders, requestBody)) {
            // Handle 401 - token expired, refresh and retry once
            if (chunk.statusCode === 401 && retryCount < 1) {
                this.token = undefined;
                await this.refreshOrReauthenticate();
                yield* this.requestStream<T>(method, path, body, files, headers, retryCount + 1);
                return;
            }

            // Handle other errors
            if (!this.isSuccessResponse(chunk)) {
                throw this.createApiError(chunk);
            }

            yield parseContent(chunk.body.content || chunk.body) as T;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Authentication
    // ─────────────────────────────────────────────────────────────────────────────

    private isTokenExpired(bufferMs: number = 5_000): boolean {
        if (!this.token) return true;
        try {
            const parts = this.token.split(".");
            if (parts.length !== 3) return true;
            let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            while (b64.length % 4) b64 += "=";
            const decoded =
                typeof Buffer !== "undefined"
                    ? // Node solution
                      Buffer.from(b64, "base64").toString("utf-8")
                    : // Browser solution
                      atob(b64);
            const { exp } = JSON.parse(decoded);
            return typeof exp === "number" && exp * 1000 <= Date.now() + bufferMs;
        } catch {
            return true;
        }
    }

    private async ensureAuthenticated(): Promise<void> {
        if (this.token && !this.isTokenExpired()) return;
        this.token = undefined;

        // Use existing promise if authentication is already in progress (mutex pattern)
        if (this.authenticationPromise) {
            return this.authenticationPromise;
        }

        // Start new authentication with single retry on failure
        this.authenticationPromise = this.performAuthentication();

        try {
            await this.authenticationPromise;
            this.authenticationPromise = undefined;
        } catch (error) {
            // Clear promise and retry once
            this.authenticationPromise = undefined;

            // Only retry if the error is not a 401 or 403
            if (error instanceof LaraApiError && (error.statusCode === 401 || error.statusCode === 403)) {
                throw error;
            }
            try {
                this.authenticationPromise = this.performAuthentication();
                await this.authenticationPromise;
                this.authenticationPromise = undefined;
            } catch (retryError) {
                this.authenticationPromise = undefined;
                throw retryError instanceof LaraApiError
                    ? retryError
                    : new LaraApiError(500, "AuthenticationError", (retryError as Error).message);
            }
        }
    }

    private async performAuthentication(): Promise<void> {
        // If we have a pre-existing auth token, use it directly (one-shot, consumed before any network call)
        if (this.authToken) {
            this.token = this.authToken.token;
            this.refreshToken = this.authToken.refreshToken;
            this.authToken = undefined;
            return;
        }

        return this.doRefreshOrReauthenticate();
    }

    private refreshOrReauthenticate(): Promise<void> {
        if (this.refreshPromise) return this.refreshPromise;

        this.refreshPromise = this.doRefreshOrReauthenticate().finally(() => {
            this.refreshPromise = undefined;
        });

        return this.refreshPromise;
    }

    private async doRefreshOrReauthenticate(): Promise<void> {
        if (this.refreshToken) {
            try {
                await this.refreshTokens();
                return;
            } catch (error) {
                this.refreshToken = undefined;

                if (!this.accessKey) throw error;
            }
        }

        if (this.accessKey) {
            await this.authenticateWithAccessKey();
            return;
        }

        throw new Error("No authentication method available for token renewal");
    }

    private async refreshTokens(): Promise<void> {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.refreshToken}`,
            "X-Lara-Date": new Date().toUTCString(),
            ...this.extraHeaders
        };

        const response = await this.send("POST", "/v2/auth/refresh", headers);
        this.handleAuthResponse(response);
    }

    private async authenticateWithAccessKey(): Promise<void> {
        if (!this.accessKey) {
            throw new Error("No access key provided");
        }

        const body = { id: this.accessKey.id };
        const contentMD5 = await this.crypto.digestBase64(JSON.stringify(body));
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "X-Lara-Date": new Date().toUTCString(),
            "Content-MD5": contentMD5,
            ...this.extraHeaders
        };

        headers.Authorization = `Lara:${await this.sign("POST", "/v2/auth", headers)}`;

        const response = await this.send("POST", "/v2/auth", headers, body);
        this.handleAuthResponse(response);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────────────────────

    private buildPathWithQuery(path: string, queryParams?: Record<string, any>): string {
        const filteredParams = this.filterNullish(queryParams);
        if (!filteredParams) return path;
        return `${path}?${new URLSearchParams(filteredParams).toString()}`;
    }

    private async buildRequestHeaders(
        body?: Record<string, any>,
        files?: Record<string, MultiPartFile>,
        customHeaders?: Record<string, string>
    ): Promise<Record<string, string>> {
        const headers: Record<string, string> = {
            "X-Lara-Date": new Date().toUTCString(),
            "X-Lara-SDK-Name": "lara-node",
            "X-Lara-SDK-Version": SdkVersion,
            ...this.extraHeaders,
            ...customHeaders
        };

        const filteredBody = this.filterNullish(body);

        if (files) {
            headers["Content-Type"] = "multipart/form-data";
        } else if (filteredBody) {
            headers["Content-Type"] = "application/json";
            const jsonBody = JSON.stringify(filteredBody, undefined, 0);
            // The content length header is needed to send delete requests with a body in some environments
            headers["Content-Length"] = new TextEncoder().encode(jsonBody).length.toString();
        }

        return headers;
    }

    private buildRequestBody(
        body?: Record<string, any>,
        files?: Record<string, MultiPartFile>
    ): Record<string, any> | undefined {
        const filteredBody = this.filterNullish(body);

        if (files) {
            // Validate and wrap files
            const wrappedFiles: Record<string, any> = {};
            for (const [key, file] of Object.entries(files)) {
                wrappedFiles[key] = this.wrapMultiPartFile(file);
            }
            return { ...wrappedFiles, ...filteredBody };
        }

        return filteredBody;
    }

    private filterNullish(obj?: Record<string, any>): Record<string, any> | undefined {
        if (!obj) return undefined;

        const filtered = Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null));

        return Object.keys(filtered).length > 0 ? filtered : undefined;
    }

    private isSuccessResponse(response: ClientResponse): boolean {
        return response.statusCode >= 200 && response.statusCode < 300;
    }

    private handleAuthResponse(response: ClientResponse): void {
        if (this.isSuccessResponse(response)) {
            this.token = response.body.token;
            const newRefreshToken = response.headers["x-lara-refresh-token"] as string | undefined;
            if (newRefreshToken) {
                this.refreshToken = newRefreshToken;
            }
            return;
        }

        throw this.createApiError(response);
    }

    private createApiError(response: ClientResponse): LaraApiError {
        const error = response.body?.error || response.body || {};
        return new LaraApiError(
            response.statusCode,
            error.type || "UnknownError",
            error.message || "An unknown error occurred"
        );
    }

    private async sign(method: HttpMethod, path: string, headers: Record<string, string>): Promise<string> {
        if (!this.accessKey) {
            throw new Error("Access key not provided for signing");
        }

        const date = headers["X-Lara-Date"].trim();
        const contentMD5 = (headers["Content-MD5"] || "").trim();
        const contentType = (headers["Content-Type"] || "").trim();
        const httpMethod = (headers["X-HTTP-Method-Override"] || method).trim().toUpperCase();

        const challenge = `${httpMethod}\n${path}\n${contentMD5}\n${contentType}\n${date}`;
        return this.crypto.hmac(this.accessKey.secret, challenge);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Abstract Methods (implemented by Node/Browser clients)
    // ─────────────────────────────────────────────────────────────────────────────

    protected abstract send(
        method: HttpMethod,
        path: string,
        headers: Record<string, string>,
        body?: Record<string, any>,
        stream?: boolean
    ): Promise<ClientResponse>;

    protected abstract sendAndGetStream(
        method: HttpMethod,
        path: string,
        headers: Record<string, string>,
        body?: Record<string, any>
    ): AsyncGenerator<ClientResponse>;

    protected abstract wrapMultiPartFile(file: MultiPartFile): any;
}
