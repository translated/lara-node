export class Credentials {
    public readonly accessKeyId: string;
    public readonly accessKeySecret: string;

    constructor(accessKeyId: string, accessKeySecret: string) {
        this.accessKeyId = accessKeyId;
        this.accessKeySecret = accessKeySecret;
    }
}
