import {BrowserCrypto} from "./browser-crypto";
import {NodeCrypto} from "./node-crypto";
import {PortableCrypto} from "./portable-crypto";

export {PortableCrypto} from "./portable-crypto";

let _instance: PortableCrypto | undefined = undefined;

export default function instance(): PortableCrypto {
    if (_instance === undefined) {
        if (typeof window !== "undefined")
            _instance = new BrowserCrypto();
        else
            _instance = new NodeCrypto();
    }

    return _instance!;
}