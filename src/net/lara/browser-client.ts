import type { AccessKey, AuthToken } from "../../credentials";
import { TimeoutError } from "../../errors";
import { type BaseURL, type ClientResponse, LaraClient, type MultiPartFile } from "./client";

function hasDefaultPort(port: number, secure: boolean): boolean {
    return (port === 80 && !secure) || (port === 443 && secure);
}

/** @internal */
export class BrowserLaraClient extends LaraClient {
    private readonly baseUrl: string;
    private readonly timeout: number | undefined;

    constructor(baseUrl: BaseURL, auth: AccessKey | AuthToken, _keepAlive: boolean, timeout?: number) {
        super(auth);

        let url = `${baseUrl.secure ? "https" : "http"}://${baseUrl.hostname}`;
        if (!hasDefaultPort(baseUrl.port, baseUrl.secure)) url += `:${baseUrl.port}`;

        this.baseUrl = url;
        this.timeout = timeout;
    }

    protected async send(
        method: string,
        path: string,
        headers: Record<string, string>,
        body?: Record<string, any>,
        streamResponse?: boolean
    ): Promise<ClientResponse> {
        let requestBody: string | FormData | undefined;

        if (body) {
            if (headers["Content-Type"] === "multipart/form-data") {
                delete headers["Content-Type"]; // browser will set it automatically

                const formBody = new FormData();
                for (const [key, value] of Object.entries(body!)) {
                    if (!value) continue;

                    if (Array.isArray(value)) {
                        for (const v of value) formBody!.append(key, v);
                    } else {
                        formBody!.append(key, value);
                    }
                }

                requestBody = formBody;
            } else {
                requestBody = JSON.stringify(body, undefined, 0);
            }
        }

        const signal = this.timeout && this.timeout > 0 ? AbortSignal.timeout(this.timeout) : undefined;

        try {
            const response = await fetch(this.baseUrl + path, {
                headers,
                method,
                body: requestBody,
                signal
            });

            if (streamResponse && response.status >= 200 && response.status < 300) {
                return {
                    statusCode: response.status,
                    body: response.body,
                    headers: Object.fromEntries(response.headers)
                };
            }

            if (response.headers.get("Content-Type")?.includes("text/csv")) {
                return {
                    statusCode: response.status,
                    body: {
                        content: await response.text()
                    },
                    headers: Object.fromEntries(response.headers)
                };
            }

            return {
                statusCode: response.status,
                body: await response.json(),
                headers: Object.fromEntries(response.headers)
            };
        } catch (err) {
            if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
                throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
            }
            throw err;
        }
    }

    protected async *sendAndGetStream(
        method: string,
        path: string,
        headers: Record<string, string>,
        body?: Record<string, any>
    ): AsyncGenerator<ClientResponse> {
        let requestBody: string | FormData | undefined;

        if (body) {
            if (headers["Content-Type"] === "multipart/form-data") {
                delete headers["Content-Type"]; // browser will set it automatically

                const formBody = new FormData();
                for (const [key, value] of Object.entries(body!)) {
                    if (!value) continue;

                    if (Array.isArray(value)) {
                        for (const v of value) formBody!.append(key, v);
                    } else {
                        formBody!.append(key, value);
                    }
                }

                requestBody = formBody;
            } else {
                requestBody = JSON.stringify(body, undefined, 0);
            }
        }

        const signal = this.timeout && this.timeout > 0 ? AbortSignal.timeout(this.timeout) : undefined;

        let response: Response;
        try {
            response = await fetch(this.baseUrl + path, {
                headers,
                method,
                body: requestBody,
                signal
            });
        } catch (err) {
            if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
                throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
            }
            throw err;
        }

        if (!response.body) {
            throw new Error("Response body is not available for streaming");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
            while (true) {
                let readResult: ReadableStreamReadResult<Uint8Array>;
                try {
                    readResult = await reader.read();
                } catch (err) {
                    if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
                        throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
                    }
                    throw err;
                }

                const { done, value } = readResult;

                if (done) {
                    // Process any remaining data in buffer
                    if (buffer.trim()) {
                        try {
                            const json = JSON.parse(buffer);
                            yield {
                                statusCode: json.status || response.status,
                                body: json.data || json,
                                headers: Object.fromEntries(response.headers)
                            };
                        } catch (_e) {
                            // Skip invalid JSON
                        }
                    }
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const json = JSON.parse(line);
                            yield {
                                statusCode: json.status || response.status,
                                body: json.data || json,
                                headers: Object.fromEntries(response.headers)
                            };
                        } catch (_e) {
                            // Skip invalid JSON lines
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    protected wrapMultiPartFile(file: MultiPartFile): File {
        if (file instanceof File) return file;

        throw new TypeError(
            `Invalid file input in the browser. Expected an instance of File but received ${typeof file}.`
        );
    }
}

// biome-ignore lint/complexity/noStaticOnlyClass: used as a namespace for HTTP client methods
export class BrowserClient {
    static async get(url: string, headers: Record<string, string>): Promise<ClientResponse> {
        return BrowserClient.send("GET", url, headers);
    }

    private static async send(
        method: string,
        url: string,
        headers?: Record<string, string>,
        body?: Record<string, any>
    ): Promise<ClientResponse> {
        let requestBody: string | FormData | undefined;

        if (body) {
            if (headers && headers["Content-Type"] === "multipart/form-data") {
                delete headers["Content-Type"]; // browser will set it automatically

                const formBody = new FormData();
                for (const [key, value] of Object.entries(body!)) {
                    if (!value) continue;

                    if (Array.isArray(value)) {
                        for (const v of value) formBody!.append(key, v);
                    } else {
                        formBody!.append(key, value);
                    }
                }

                requestBody = formBody;
            } else {
                requestBody = JSON.stringify(body, undefined, 0);
            }
        }

        const response = await fetch(url, {
            headers,
            method,
            body: requestBody
        });

        return {
            statusCode: response.status,
            headers: Object.fromEntries(response.headers),
            body: response.headers.get("Content-Type")?.includes("application/json")
                ? await response.json()
                : await response.text()
        };
    }
}
