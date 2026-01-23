import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import FormData from "form-data";
import { type BaseURL, type ClientResponse, LaraClient, type MultiPartFile } from "./client";

/** @internal */
export class NodeLaraClient extends LaraClient {
    private readonly baseUrl: BaseURL;
    private readonly agent: http.Agent | https.Agent;

    constructor(baseUrl: BaseURL, accessKeyId: string, accessKeySecret: string, keepAlive: boolean = true) {
        super(accessKeyId, accessKeySecret);
        this.baseUrl = baseUrl;
        this.agent = baseUrl.secure ? new https.Agent({ keepAlive }) : new http.Agent({ keepAlive });
    }

    protected async send(
        path: string,
        headers: Record<string, string>,
        body?: Record<string, any>
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
                method: "POST",
                headers: headers,
                agent: this.agent
            };

            const req = (this.baseUrl.secure ? https : http).request(options, (res) => {
                let data = "";

                // biome-ignore lint/suspicious/noAssignInExpressions: store response data
                res.on("data", (chunk) => (data += chunk));

                res.on("end", () => {
                    let json: any;

                    if (res.headers["content-type"]?.includes("text/csv")) {
                        return resolve({
                            statusCode: res.statusCode!,
                            body: {
                                content: data
                            }
                        });
                    }

                    try {
                        json = JSON.parse(data);
                    } catch (_e) {
                        return reject(new SyntaxError("Invalid JSON response"));
                    }

                    resolve({
                        statusCode: res.statusCode!,
                        body: json
                    });
                });

                // close connection on error
                res.on("error", (err) => {
                    req.destroy();
                    return reject(err);
                });
            });

            // close connection on error
            req.on("error", (err) => {
                req.destroy();
                return reject(err);
            });

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
            method: "POST",
            headers: headers,
            agent: this.agent
        };

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
                // {a}\n{b}\n{c}\n --> [{a}, {b}, {c}, ""]
                // {a}\n{b}\n{c} --> [{a}, {b}, {c}]
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const json = JSON.parse(line);
                            chunks.push({
                                statusCode: json.status || res.statusCode!,
                                body: json.data || json
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
                // Process any remaining data in buffer
                if (buffer.trim()) {
                    try {
                        const json = JSON.parse(buffer);
                        chunks.push({
                            statusCode: json.status || res.statusCode!,
                            body: json.data || json
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
                req.destroy();
                streamError = err;

                if (resolveChunk) {
                    resolveChunk();
                    resolveChunk = null;
                }
            });
        });

        req.on("error", (err) => {
            streamError = err;

            if (resolveChunk) {
                resolveChunk();
                resolveChunk = null;
            }
        });

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
