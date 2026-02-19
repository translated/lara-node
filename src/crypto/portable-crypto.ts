/** @internal */
export interface PortableCrypto {
    digestBase64(data: string): Promise<string>;

    hmac(key: string, data: string): Promise<string>;
}
