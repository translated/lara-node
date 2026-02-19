import type { PortableCrypto } from "./portable-crypto";

/** @internal */
export class BrowserCrypto implements PortableCrypto {
    private readonly subtle: SubtleCrypto;

    constructor() {
        this.subtle = window.crypto.subtle;
    }

    async digestBase64(data: string): Promise<string> {
        const encoder = new TextEncoder();
        const buffer = (await this.subtle.digest("sha-256", encoder.encode(data))).slice(0, 16);

        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    async hmac(key: string, data: string): Promise<string> {
        const encoder = new TextEncoder();
        encoder.encode(data);

        const cKey: CryptoKey = await this.subtle.importKey(
            "raw",
            encoder.encode(key),
            {
                name: "hmac",
                hash: { name: "sha-256" }
            },
            false,
            ["sign"]
        );

        const buffer = await this.subtle.sign("hmac", cKey, encoder.encode(data));

        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }
}
