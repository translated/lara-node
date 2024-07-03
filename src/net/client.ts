import {version as SdkVersion} from "../sdk-version";
import cryptoInstance, {PortableCrypto} from "../crypto";
import {LaraApiError} from "../errors";

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

    protected constructor(accessKeyId: string, accessKeySecret: string) {
        this.accessKeyId = accessKeyId;
        this.accessKeySecret = accessKeySecret;
    }

    get<T>(path: string, params?: Record<string, any>): Promise<T> {
        return this.request("GET", path, params);
    }

    delete<T>(path: string, params?: Record<string, any>): Promise<T> {
        return this.request("DELETE", path, params);
    }

    post<T>(path: string, body?: Record<string, any>, files?: Record<string, string>): Promise<T> {
        return this.request("POST", path, body, files);
    }

    put<T>(path: string, body?: Record<string, any>, files?: Record<string, string>): Promise<T> {
        return this.request("PUT", path, body, files);
    }

    protected async request<T>(method: HttpMethod, path: string, body?: Record<string, any>, files?: Record<string, any>): Promise<T> {
        if (!path.startsWith("/"))
            path = "/" + path;

        const headers: Record<string, string> = {
            "X-HTTP-Method-Override": method,
            "X-Lara-Date": new Date().toUTCString(),
            "X-Lara-SDK-Name": "lara-node",
            'X-Lara-SDK-Version': SdkVersion
        }

        if (body) {
            body = Object.fromEntries(Object.entries(body).filter(
                ([_, v]) => v !== undefined && v !== null
            ));

            if (Object.keys(body).length === 0)
                body = undefined;

            if (body) {
                const jsonBody = JSON.stringify(body, undefined, 0);
                headers["Content-MD5"] = await this.crypto.digest(jsonBody);
            }
        }

        let requestBody: Record<string, any> | undefined = undefined;
        if (files) {
            headers["Content-Type"] = "multipart/form-data";
            requestBody = Object.assign({}, files, body);
        } else {
            headers["Content-Type"] = "application/json";
            if (body) requestBody = body;
        }

        const signature = await this.sign(method, path, headers);
        headers["Authorization"] = `Lara ${this.accessKeyId}:${signature}`;

        const response: ClientResponse = await this.send(path, headers, requestBody);
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

}
