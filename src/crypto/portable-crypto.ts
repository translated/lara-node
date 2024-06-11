/** @internal */
export interface PortableCrypto {

    digest(data: string): Promise<string>;

    hmac(key: string, data: string): Promise<string>;

}