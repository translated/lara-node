import * as crypto from "crypto";
import type { PortableCrypto } from "./portable-crypto";

/** @internal */
export class NodeCrypto implements PortableCrypto {
    digest(data: string): Promise<string> {
        return new Promise((resolve) => {
            const hash = crypto.createHash("md5");
            hash.update(data);
            resolve(hash.digest("hex"));
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
