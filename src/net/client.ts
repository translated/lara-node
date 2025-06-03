import {version as SdkVersion} from "../sdk-version";
import cryptoInstance, {PortableCrypto} from "../crypto";
import {LaraApiError} from "../errors";
import {Readable} from "node:stream";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/** @internal */
export type BaseURL = {
    secure: boolean;
    hostname: string;
    port: number;
}

/** @internal */
export type ClientResponse = {
    statusCode: number;
    body: any;
}

export type BrowserMultiPartFile = File;
export type NodeMultiPartFile = Readable | string;
export type MultiPartFile = BrowserMultiPartFile | NodeMultiPartFile;

function parseContent(content: any): any {
    if (content === undefined || content === null)
        return content;
    if (Array.isArray(content))
        return content.map(parseContent);

    if (typeof content === "string") {
        // Test if it's a date
        if (content.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.[0-9]{3}Z$/))
            return new Date(content);
        else
            return content;
    }

    if (typeof content == "object") {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(content)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = parseContent(value);
        }

        return result;
    }

    return content;
}

/** @internal */
export abstract class LaraClient {

    private readonly crypto: PortableCrypto = cryptoInstance();
    private readonly accessKeyId: string;
    private readonly accessKeySecret: string;
    private readonly extraHeaders: Record<string, string> = {};

    protected constructor(accessKeyId: string, accessKeySecret: string) {
        this.accessKeyId = accessKeyId;
        this.accessKeySecret = accessKeySecret;
    }

    setExtraHeader(name: string, value: string): void {
        this.extraHeaders[name] = value;
    }

    get<T>(path: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<T> {
        return this.request("GET", path, params, undefined, headers);
    }

    delete<T>(path: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<T> {
        return this.request("DELETE", path, params, undefined, headers);
    }

    post<T>(
        path: string,
        body?: Record<string, any>,
        files?: Record<string, MultiPartFile>,
        headers?: Record<string, string>
    ): Promise<T> {
        return this.request("POST", path, body, files, headers);
    }

    put<T>(
        path: string,
        body?: Record<string, any>,
        files?: Record<string, MultiPartFile>,
        headers?: Record<string, string>
    ): Promise<T> {
        return this.request("PUT", path, body, files, headers);
    }

    protected async request<T>(
        method: HttpMethod,
        path: string,
        body?: Record<string, any>,
        files?: Record<string, MultiPartFile>,
        headers?: Record<string, string>
    ): Promise<T> {
        if (!path.startsWith("/"))
            path = "/" + path;

        const _headers: Record<string, string> = {
            "X-HTTP-Method-Override": method,
            "X-Lara-Date": new Date().toUTCString(),
            "X-Lara-SDK-Name": "lara-node",
            'X-Lara-SDK-Version': SdkVersion,
            ...this.extraHeaders,
            ...headers
        };

        if (body) {
            body = Object.fromEntries(Object.entries(body).filter(
                ([_, v]) => v !== undefined && v !== null
            ));

            if (Object.keys(body).length === 0)
                body = undefined;

            if (body) {
                const jsonBody = JSON.stringify(body, undefined, 0);
                _headers["Content-MD5"] = await this.crypto.digest(jsonBody);
            }
        }

        let requestBody: Record<string, any> | undefined = undefined;
        if (files) {
            // validate files
            for (const [key, file] of Object.entries(files))
                files[key] = this.wrapMultiPartFile(file);

            _headers["Content-Type"] = "multipart/form-data";
            requestBody = Object.assign({}, files, body);
        } else {
            _headers["Content-Type"] = "application/json";
            if (body) requestBody = body;
        }

        const signature = await this.sign(method, path, _headers);
        _headers["Authorization"] = `Lara ${this.accessKeyId}:${signature}`;

        const response: ClientResponse = await this.send(path, _headers, requestBody);
        if (200 <= response.statusCode && response.statusCode < 300) {
            return parseContent(response.body.content);
        } else {
            const error = response.body.error || {}
            throw new LaraApiError(
                response.statusCode,
                error.type || "UnknownError",
                error.message || "An unknown error occurred"
            );
        }
    }

    private async sign(method: HttpMethod, path: string, headers: Record<string, string>): Promise<string> {
        const date = headers["X-Lara-Date"].trim();
        const contentMD5 = (headers["Content-MD5"] || "").trim();
        const contentType = (headers["Content-Type"] || "").trim();
        const httpMethod = (headers["X-HTTP-Method-Override"] || method).trim().toUpperCase();

        const challenge = `${httpMethod}\n${path}\n${contentMD5}\n${contentType}\n${date}`;
        return await this.crypto.hmac(this.accessKeySecret, challenge);
    }

    protected abstract send(path: string, headers: Record<string, string>, body?: Record<string, any>): Promise<ClientResponse>;

    protected abstract wrapMultiPartFile(file: MultiPartFile): any;
}
