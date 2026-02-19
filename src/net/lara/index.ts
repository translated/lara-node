import type { AccessKey, AuthToken } from "../../credentials";
import { DEFAULT_BASE_URL } from "../../utils/defaultBaseUrl";
import type { BaseURL, LaraClient } from "./client";
import { NodeLaraClient } from "./node-client";

export { LaraClient } from "./client";

export default function create(
    auth: AccessKey | AuthToken,
    baseUrl?: string,
    keepAlive?: boolean,
    timeout?: number
): LaraClient {
    const url = new URL(baseUrl || DEFAULT_BASE_URL);

    if (url.protocol !== "https:" && url.protocol !== "http:")
        throw new TypeError(`Invalid URL (protocol): ${url.protocol}`);

    const parsedURL: BaseURL = {
        secure: url.protocol === "https:",
        hostname: url.hostname,
        port: url.port ? parseInt(url.port, 10) : url.protocol === "https:" ? 443 : 80
    };

    return new NodeLaraClient(parsedURL, auth, keepAlive ?? true, timeout);
}

export { NodeClient as HttpClient } from "./node-client";
