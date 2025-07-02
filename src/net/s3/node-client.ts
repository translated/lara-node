import FormData from "form-data";
import fs from "fs";
import https from "https";
import { Readable } from "stream";
import type { S3UploadFields } from "../../translator/translator";
import type { MultiPartFile } from "../client";
import { S3Client } from "./client";

/** @internal */
export class NodeS3Client extends S3Client {
    protected async _upload(url: string, fields: S3UploadFields, file: Readable) {
        const formData = new FormData();
        for (const [key, value] of Object.entries(fields)) {
            formData.append(key, value);
        }
        formData.append("file", file);

        return new Promise<void>((resolve, reject) => {
            formData.submit(url, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    public async download(url: string): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            const req = https.request(url, { method: "GET" }, (res) => {
                const chunks: Buffer[] = [];
                res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
                res.on("end", () => resolve(Buffer.concat(chunks)));
            });

            req.on("error", reject);
            req.end();
        });
    }

    public wrapMultiPartFile(file: MultiPartFile): Readable {
        if (typeof file === "string") file = fs.createReadStream(file);

        if (file instanceof Readable) return file;

        throw new TypeError(
            `Invalid file input in Node.js. Expected a Readable stream or a valid file path, but received ${typeof file}.`
        );
    }
}
