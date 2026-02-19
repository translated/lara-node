import type { MultiPartFile } from "../lara/client";
import { S3Client, type S3UploadFields } from "./client";
import type { LaraStream } from "./laraStream.browser";

/** @internal */
export class BrowserS3Client extends S3Client {
    public async _upload(url: string, fields: S3UploadFields, file: File) {
        const formdata = new FormData();

        for (const [key, value] of Object.entries(fields)) {
            formdata.append(key, value);
        }
        formdata.append("file", file);

        await fetch(url, {
            method: "POST",
            body: formdata
        });
    }

    public async download(url: string) {
        const response = await fetch(url);
        return response.blob();
    }

    public async downloadStream(url: string): Promise<LaraStream> {
        const response = await fetch(url);
        if (!response.body) {
            throw new Error("Response body is null");
        }
        return response.body;
    }

    public wrapMultiPartFile(file: MultiPartFile): File {
        if (file instanceof File) return file;

        throw new TypeError(
            `Invalid file input in the browser. Expected an instance of File but received ${typeof file}.`
        );
    }
}
