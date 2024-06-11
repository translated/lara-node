import http from "http";
import https from "https";
import FormData from "form-data";
import {BaseURL, ClientResponse, LaraClient} from "./client";

/** @internal */
export class NodeLaraClient extends LaraClient {

    private readonly baseUrl: BaseURL;
    private readonly agent: http.Agent | https.Agent;

    constructor(baseUrl: BaseURL, accessKeyId: string, accessKeySecret: string) {
        super(accessKeyId, accessKeySecret);
        this.baseUrl = baseUrl;
        this.agent = baseUrl.secure ? new https.Agent({keepAlive: true}) : new http.Agent({keepAlive: true});
    }

    protected async send(path: string, headers: Record<string, string>, body?: Record<string, any>): Promise<ClientResponse> {
        let requestBody: string | FormData | undefined = undefined;

        if (body) {
            if (headers["Content-Type"] === "multipart/form-data") {
                const formBody = new FormData();

                for (const [key, value] of Object.entries(body!)) {
                    if (!value) continue;

                    if (Array.isArray(value))
                        value.forEach(v => formBody!.append(key, v));
                    else
                        formBody!.append(key, value);
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
                res.on("data", (chunk) => data += chunk);

                res.on("end", () => {
                    let json;

                    try {
                        json = JSON.parse(data);
                    } catch (e) {
                        reject(new Error("Invalid JSON response"));
                    }

                    resolve({
                        statusCode: res.statusCode!,
                        body: json
                    });
                });
            });

            req.on("error", reject);

            if (requestBody instanceof FormData) {
                requestBody.pipe(req);
            } else if (requestBody) {
                req.write(requestBody);
            }

            req.end();
        });
    }

}