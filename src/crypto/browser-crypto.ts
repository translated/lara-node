import {PortableCrypto} from "./portable-crypto";

/** @internal */
export class BrowserCrypto implements PortableCrypto {

    private readonly subtle: SubtleCrypto;

    constructor() {
        this.subtle = window.crypto.subtle;
    }

    /**
     * MD5 in browser is not supported, so we use SHA-256 instead and return the first 16 bytes
     */
    async digest(data: string): Promise<string> {
        const encoder = new TextEncoder();
        const buffer = (await this.subtle.digest(
            "sha-256",
            encoder.encode(data)
        )).slice(0, 16);

        return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    async hmac(key: string, data: string): Promise<string> {
        const encoder = new TextEncoder();
        encoder.encode(data);

        const cKey: CryptoKey = await this.subtle.importKey(
            "raw",
            encoder.encode(key),
            {
                name: "hmac",
                hash: {name: "sha-256"},
            },
            false,
            ["sign"]
        );

        const buffer = await this.subtle.sign(
            "hmac",
            cKey,
            encoder.encode(data)
        );

        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

}