import { type BaseURL, type ClientResponse, LaraClient, type MultiPartFile } from "./client";

function hasDefaultPort(port: number, secure: boolean): boolean {
    return (port === 80 && !secure) || (port === 443 && secure);
}

/** @internal */
export class BrowserLaraClient extends LaraClient {
    private readonly baseUrl: string;

    constructor(baseUrl: BaseURL, accessKeyId: string, accessKeySecret: string) {
        super(accessKeyId, accessKeySecret);

        let url = `${baseUrl.secure ? "https" : "http"}://${baseUrl.hostname}`;
        if (!hasDefaultPort(baseUrl.port, baseUrl.secure)) url += `:${baseUrl.port}`;

        this.baseUrl = url;
    }

    protected async send(
        path: string,
        headers: Record<string, string>,
        body?: Record<string, any>
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

        const response = await fetch(this.baseUrl + path, {
            headers: headers,
            method: "POST",
            body: requestBody
        });

        if (response.headers.get("Content-Type")?.includes("text/csv")) {
            return {
                statusCode: response.status,
                body: {
                    content: await response.text()
                }
            };
        }

        return { statusCode: response.status, body: await response.json() };
    }

    protected async *sendAndGetStream(
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

        const response = await fetch(this.baseUrl + path, {
            headers,
            method: "POST",
            body: requestBody
        });

        if (!response.body) {
            throw new Error("Response body is not available for streaming");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
            while (true) {
                const readResult: ReadableStreamReadResult<Uint8Array> = await reader.read();

                const { done, value } = readResult;

                if (done) {
                    // Process any remaining data in buffer
                    if (buffer.trim()) {
                        try {
                            const json = JSON.parse(buffer);
                            yield {
                                statusCode: json.status || response.status,
                                body: json.data || json
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
                                body: json.data || json
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
