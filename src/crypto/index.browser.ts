import { BrowserCrypto } from "./browser-crypto";
import type { PortableCrypto } from "./portable-crypto";

export { PortableCrypto } from "./portable-crypto";

let _instance: PortableCrypto | undefined;

export default function instance(): PortableCrypto {
    if (_instance === undefined) {
        _instance = new BrowserCrypto();
    }

    return _instance!;
}
