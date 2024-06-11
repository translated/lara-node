import {BrowserLaraClient} from "./browser-client";
import {NodeLaraClient} from "./node-client";
import {BaseURL, LaraClient} from "./client";

export {LaraClient} from "./client";

const DEFAULT_BASE_URL: string = "https://api.hellolara.ai";

export default function create(accessKeyId: string, accessKeySecret: string, baseUrl?: string): LaraClient {
    const url = new URL(baseUrl || DEFAULT_BASE_URL);

    if (url.protocol !== "https:" && url.protocol !== "http:")
        throw new TypeError("Invalid URL (protocol): " + url.protocol);

    const parsedURL: BaseURL = {
        secure: url.protocol === "https:",
        hostname: url.hostname,
        port: url.port ? parseInt(url.port) : url.protocol === "https:" ? 443 : 80
    };

    if (typeof window !== "undefined")
        return new BrowserLaraClient(parsedURL, accessKeyId, accessKeySecret);
    else
        return new NodeLaraClient(parsedURL, accessKeyId, accessKeySecret);
}