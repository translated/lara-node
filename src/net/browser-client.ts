import {BaseURL, ClientResponse, LaraClient, MultiPartFile} from "./client";

function hasDefaultPort(port: number, secure: boolean): boolean {
    return port === 80 && !secure || port === 443 && secure;
}

/** @internal */
export class BrowserLaraClient extends LaraClient {

    private readonly baseUrl: string;

    constructor(baseUrl: BaseURL, accessKeyId: string, accessKeySecret: string) {
        super(accessKeyId, accessKeySecret);

        let url = `${baseUrl.secure ? "https" : "http"}://${baseUrl.hostname}`;
        if (!hasDefaultPort(baseUrl.port, baseUrl.secure))
            url += `:${baseUrl.port}`;

        this.baseUrl = url;
    }

    protected async send(path: string, headers: Record<string, string>, body?: Record<string, any>): Promise<ClientResponse> {
        let requestBody: string | FormData | undefined = undefined;

        if (body) {
            if (headers["Content-Type"] === "multipart/form-data") {
                delete headers["Content-Type"];  // browser will set it automatically

                const formBody = new FormData();
                for (const [key, value] of Object.entries(body!)) {
                    if (!value) continue;

                    if (Array.isArray(value))
                        value.forEach(v => formBody!.append(key, v));
                    else
                        formBody!.append(key, value);
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

        return {statusCode: response.status, body: await response.json()};
    }

    protected wrapMultiPartFile(file: MultiPartFile): File {
        if (file instanceof File)
            return file;

        throw new TypeError(
            `Invalid file input in the browser. Expected an instance of File but received ${typeof file}.`
        );
    }
}