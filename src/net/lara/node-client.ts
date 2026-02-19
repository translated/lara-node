import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import { clearTimeout } from "node:timers";
import FormData from "form-data";
import type { AccessKey, AuthToken } from "../../credentials";
import { TimeoutError } from "../../errors";
import { type BaseURL, type ClientResponse, LaraClient, type MultiPartFile } from "./client";

/** @internal */
export class NodeLaraClient extends LaraClient {
    private readonly baseUrl: BaseURL;
    private readonly agent: http.Agent | https.Agent;
    private readonly timeout: number | undefined;

    constructor(baseUrl: BaseURL, auth: AccessKey | AuthToken, keepAlive: boolean, timeout?: number) {
        super(auth);
        this.baseUrl = baseUrl;
        this.agent = baseUrl.secure ? new https.Agent({ keepAlive }) : new http.Agent({ keepAlive });
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
                const formBody = new FormData();

                for (const [key, value] of Object.entries(body!)) {
                    if (!value) continue;

                    if (Array.isArray(value)) {
                        for (const v of value) formBody!.append(key, v);
                    } else {
                        formBody!.append(key, value);
                    }
                }

                headers = {
                    ...headers,
                    ...formBody.getHeaders()
                };

                requestBody = formBody;
            } else {
                requestBody = JSON.stringify(body, undefined, 0);
            }
        }

        return new Promise<ClientResponse>((resolve, reject) => {
            const options = {
                host: this.baseUrl.hostname,
                port: this.baseUrl.port,
                path: path,
                method,
                headers: headers,
                agent: this.agent
            };

            let hardTimeout: NodeJS.Timeout | null = null;

            const req = (this.baseUrl.secure ? https : http).request(options, (res) => {
                let data = "";

                if (streamResponse && res.statusCode! >= 200 && res.statusCode! < 300) {
                    hardTimeout && clearTimeout(hardTimeout);
                    return resolve({
                        statusCode: res.statusCode!,
                        body: res,
                        headers: res.headers
                    });
                }

                // biome-ignore lint/suspicious/noAssignInExpressions: store response data
                res.on("data", (chunk) => (data += chunk));

                res.on("end", () => {
                    hardTimeout && clearTimeout(hardTimeout);
                    let json: any;

                    if (res.headers["content-type"]?.includes("application/json")) {
                        try {
                            json = JSON.parse(data);
                        } catch (_e) {
                            return reject(new SyntaxError("Invalid JSON response"));
                        }

                        return resolve({
                            statusCode: res.statusCode!,
                            body: json,
                            headers: res.headers
                        });
                    } else {
                        return resolve({
                            statusCode: res.statusCode!,
                            body: data,
                            headers: res.headers
                        });
                    }
                });

                res.on("error", (err) => {
                    hardTimeout && clearTimeout(hardTimeout);
                    if (err instanceof TimeoutError) return reject(err);
                    req.destroy();
                    return reject(err);
                });
            });

            req.on("error", (err) => {
                hardTimeout && clearTimeout(hardTimeout);
                if (err instanceof TimeoutError) return reject(err);
                req.destroy();
                return reject(err);
            });

            // Set timeout if provided and positive
            if (this.timeout && this.timeout > 0) {
                hardTimeout = setTimeout(() => {
                    req.destroy(new TimeoutError(`Request timed out after ${this.timeout}ms`));
                }, this.timeout);
            }

            if (requestBody instanceof FormData) {
                requestBody.pipe(req);
            } else if (requestBody) {
                req.write(requestBody);
                req.end();
            } else {
                req.end();
            }
        });
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
                const formBody = new FormData();

                for (const [key, value] of Object.entries(body!)) {
                    if (!value) continue;

                    if (Array.isArray(value)) {
                        for (const v of value) formBody!.append(key, v);
                    } else {
                        formBody!.append(key, value);
                    }
                }

                headers = {
                    ...headers,
                    ...formBody.getHeaders()
                };

                requestBody = formBody;
            } else {
                requestBody = JSON.stringify(body, undefined, 0);
            }
        }

        const options = {
            host: this.baseUrl.hostname,
            port: this.baseUrl.port,
            path: path,
            method,
            headers: headers,
            agent: this.agent
        };

        let hardTimeout: NodeJS.Timeout | null = null;

        // Create async iterator from the stream
        const chunks: ClientResponse[] = [];
        let resolveChunk: (() => void) | null = null;
        let streamEnded = false;
        let streamError: Error | null = null;

        const req = (this.baseUrl.secure ? https : http).request(options, (res) => {
            let buffer = "";

            res.on("data", (chunk: Buffer) => {
                buffer += chunk.toString();
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const json = JSON.parse(line);
                            chunks.push({
                                statusCode: json.status || res.statusCode!,
                                body: json.data || json,
                                headers: res.headers
                            });
                            if (resolveChunk) {
                                resolveChunk();
                                resolveChunk = null;
                            }
                        } catch (_e) {
                            // Skip invalid JSON lines
                        }
                    }
                }
            });

            res.on("end", () => {
                hardTimeout && clearTimeout(hardTimeout);
                // Process any remaining data in buffer
                if (buffer.trim()) {
                    try {
                        const json = JSON.parse(buffer);
                        chunks.push({
                            statusCode: json.status || res.statusCode!,
                            body: json.data || json,
                            headers: res.headers
                        });
                    } catch (_e) {
                        // Skip invalid JSON
                    }
                }
                streamEnded = true;
                if (resolveChunk) {
                    resolveChunk();
                    resolveChunk = null;
                }
            });

            res.on("error", (err) => {
                hardTimeout && clearTimeout(hardTimeout);
                if (err instanceof TimeoutError) throw err;
                req.destroy();
                streamError = err;

                if (resolveChunk) {
                    resolveChunk();
                    resolveChunk = null;
                }
            });
        });

        req.on("error", (err) => {
            hardTimeout && clearTimeout(hardTimeout);
            if (err instanceof TimeoutError) throw err;
            streamError = err;

            if (resolveChunk) {
                resolveChunk();
                resolveChunk = null;
            }
        });

        // Set timeout if provided and positive
        if (this.timeout && this.timeout > 0) {
            hardTimeout = setTimeout(() => {
                req.destroy(new TimeoutError(`Request timed out after ${this.timeout}ms`));
            }, this.timeout);
        }

        if (requestBody instanceof FormData) {
            requestBody.pipe(req);
        } else if (requestBody) {
            req.write(requestBody);
            req.end();
        } else {
            req.end();
        }

        // Yield chunks as they arrive
        while (true) {
            if (streamError) {
                throw streamError;
            }

            if (chunks.length > 0) {
                yield chunks.shift()!;
            } else if (streamEnded) {
                break;
            } else {
                // Wait for next chunk
                await new Promise<void>((resolve) => {
                    resolveChunk = resolve;
                });
            }
        }
    }

    protected wrapMultiPartFile(file: MultiPartFile): Readable {
        if (typeof file === "string") file = fs.createReadStream(file);

        if (file instanceof Readable) return file;

        throw new TypeError(
            `Invalid file input in Node.js. Expected a Readable stream or a valid file path, but received ${typeof file}.`
        );
    }
}

export class NodeClient {
    static get(url: string, headers?: Record<string, string>): Promise<ClientResponse> {
        return NodeClient.send("GET", url, headers);
    }

    private static async send(
        method: string,
        url: string,
        headers?: Record<string, string>,
        body?: Record<string, any>
    ): Promise<ClientResponse> {
        const _url = new URL(url);

        if (_url.protocol !== "https:" && _url.protocol !== "http:")
            throw new TypeError(`Invalid URL (protocol): ${_url.protocol}`);

        const parsedURL: BaseURL = {
            secure: _url.protocol === "https:",
            hostname: _url.hostname,
            port: _url.port ? parseInt(_url.port, 10) : _url.protocol === "https:" ? 443 : 80
        };
        const path = _url.pathname + _url.search + _url.hash;

        const agent = parsedURL.secure ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true });

        let requestBody: string | FormData | undefined;

        if (body) {
            if (headers && headers["Content-Type"] === "multipart/form-data") {
                const formBody = new FormData();

                for (const [key, value] of Object.entries(body!)) {
                    if (!value) continue;

                    if (Array.isArray(value)) {
                        for (const v of value) formBody!.append(key, v);
                    } else {
                        formBody!.append(key, value);
                    }
                }

                headers = {
                    ...headers,
                    ...formBody.getHeaders()
                };

                requestBody = formBody;
            } else {
                requestBody = JSON.stringify(body, undefined, 0);
            }
        }

        return new Promise<ClientResponse>((resolve, reject) => {
            const options = {
                host: parsedURL.hostname,
                port: parsedURL.port,
                path,
                method,
                headers,
                agent
            };

            const req = (parsedURL.secure ? https : http).request(options, (res) => {
                let data = "";

                // biome-ignore lint/suspicious/noAssignInExpressions: store response data
                res.on("data", (chunk) => (data += chunk));

                res.on("end", () => {
                    let json: any;

                    if (res.headers["content-type"]?.includes("application/json")) {
                        try {
                            json = JSON.parse(data);
                        } catch (_e) {
                            return reject(new SyntaxError("Invalid JSON response"));
                        }

                        return resolve({
                            statusCode: res.statusCode!,
                            body: json,
                            headers: res.headers
                        });
                    } else {
                        return resolve({
                            statusCode: res.statusCode!,
                            body: data,
                            headers: res.headers
                        });
                    }
                });
            });

            req.on("error", reject);

            if (requestBody instanceof FormData) {
                requestBody.pipe(req);
            } else if (requestBody) {
                req.write(requestBody);
                req.end();
            } else {
                req.end();
            }
        });
    }
}
