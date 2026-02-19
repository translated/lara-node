import * as crypto from "node:crypto";
import type { PortableCrypto } from "./portable-crypto";

/** @internal */
export class NodeCrypto implements PortableCrypto {
    digestBase64(data: string): Promise<string> {
        return new Promise((resolve) => {
            const hash = crypto.createHash("md5");
            hash.update(data, "utf8");
            resolve(hash.digest("base64"));
        });
    }

    hmac(key: string, data: string): Promise<string> {
        return new Promise((resolve) => {
            const hmac = crypto.createHmac("sha256", key);
            hmac.update(data);
            resolve(hmac.digest("base64"));
        });
    }
}
