import {S3UploadFields} from "../../translator/translator";
import {MultiPartFile} from "../client";

/** @internal */
export abstract class S3Client {
    public async upload(url: string, fields: S3UploadFields, file: MultiPartFile): Promise<void> {
        return this._upload(url, fields, this.wrapMultiPartFile(file));
    }

    protected abstract _upload(url: string, fields: S3UploadFields, file: any): Promise<void>

    protected abstract download(url: string): Promise<Blob | Buffer>

    protected abstract wrapMultiPartFile(file: MultiPartFile): any;
}