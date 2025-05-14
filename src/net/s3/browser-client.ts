import {S3Client} from "./client";
import {S3UploadFields} from "../../translator/translator";
import {MultiPartFile} from "../client";

/** @internal */
export class BrowserS3Client extends S3Client {
    constructor() {
        super();
    }

    public async _upload(url: string, fields: S3UploadFields, file: File) {
        const formdata = new FormData();

        for (const [key, value] of Object.entries(fields)) {
            formdata.append(key, value);
        }
        formdata.append("file", file);

        await fetch(url, {
            method: 'POST',
            body: formdata,
        })
    }

    public async download(url: string) {
        const response = await fetch(url);
        return response.blob();
    }

    public wrapMultiPartFile(file: MultiPartFile): File {
        if (file instanceof File)
            return file;

        throw new TypeError(
            `Invalid file input in the browser. Expected an instance of File but received ${typeof file}.`
        );
    }
}