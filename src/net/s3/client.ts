import type { MultiPartFile } from "../lara/client";

export type S3UploadFields = {
    acl: string;
    bucket: string;
    key: string;
};

/** @internal */
export abstract class S3Client {
    public async upload(url: string, fields: S3UploadFields, file: MultiPartFile, length?: number): Promise<void> {
        return this._upload(url, fields, this.wrapMultiPartFile(file), length);
    }

    protected abstract _upload(url: string, fields: S3UploadFields, file: any, length?: number): Promise<void>;

    protected abstract download(url: string): Promise<Blob | Buffer>;

    protected abstract downloadStream(url: string): Promise<unknown>;

    protected abstract wrapMultiPartFile(file: MultiPartFile): any;
}
