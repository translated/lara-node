import { LaraApiError, TimeoutError } from "./errors";
import type { LaraClient } from "./net";
import type { MultiPartFile } from "./net/client";
import createS3Client from "./net/s3";
import type { BrowserS3Client } from "./net/s3/browser-client";
import type { NodeS3Client } from "./net/s3/node-client";
import type { TranslationStyle } from "./translator";
import toSnakeCase from "./utils/to-snake-case";

type UploadUrlData = {
    url: string;
    fields: S3UploadFields;
};

export type S3UploadFields = {
    acl: string;
    bucket: string;
    key: string;
};

// biome-ignore format: keep comments aligned
export enum DocumentStatus {
    INITIALIZED = "initialized",    // just been created
    ANALYZING = "analyzing",        // being analyzed for language detection and chars count
    PAUSED = "paused",              // paused after analysis, needs user confirm
    READY = "ready",                // ready to be translated
    TRANSLATING = "translating",
    TRANSLATED = "translated",
    ERROR = "error"
}

export interface DocxExtractionParams {
    extractComments?: boolean;
    acceptRevisions?: boolean;
}

export type DocumentOptions = {
    adaptTo?: string[];
    glossaries?: string[];
    noTrace?: boolean;
    style?: TranslationStyle;
};

export type DocumentDownloadOptions = {
    outputFormat?: string;
};

export type DocumentUploadOptions = DocumentOptions & {
    password?: string;
    extractionParams?: DocxExtractionParams;
};

export interface Document {
    readonly id: string;
    readonly status: DocumentStatus;
    readonly source?: string;
    readonly target: string;
    readonly filename: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly options?: DocumentOptions;
    readonly translatedChars?: number;
    readonly totalChars?: number;
    readonly errorReason?: string;
}

export type DocumentTranslateOptions = DocumentUploadOptions & DocumentDownloadOptions;

export class Documents {
    private readonly client: LaraClient;
    private readonly s3Client: BrowserS3Client | NodeS3Client;

    constructor(client: LaraClient) {
        this.client = client;
        this.s3Client = createS3Client();
    }

    public async upload(
        file: MultiPartFile,
        filename: string,
        source: string | null,
        target: string,
        options?: DocumentUploadOptions
    ): Promise<Document> {
        const { url, fields } = await this.client.get<UploadUrlData>(`/documents/upload-url`, { filename });

        await this.s3Client.upload(url, fields, file);

        const headers: Record<string, string> = options?.noTrace ? { "X-No-Trace": "true" } : {};

        return this.client.post<Document>(
            "/documents",
            {
                source,
                target,
                s3key: fields.key,
                adapt_to: options?.adaptTo,
                glossaries: options?.glossaries,
                style: options?.style,
                password: options?.password,
                extraction_params: options?.extractionParams ? toSnakeCase(options.extractionParams) : undefined
            },
            undefined,
            headers
        );
    }

    public async status(id: string): Promise<Document> {
        return await this.client.get<Document>(`/documents/${id}`);
    }

    public async download(id: string, options?: DocumentDownloadOptions): Promise<Blob | Buffer> {
        const { url } = await this.client.get<{ url: string }>(`/documents/${id}/download-url`, {
            output_format: options?.outputFormat
        });

        return await this.s3Client.download(url);
    }

    public async translate(
        file: MultiPartFile,
        filename: string,
        source: string | null,
        target: string,
        options?: DocumentTranslateOptions
    ): Promise<Blob | Buffer> {
        const uploadOptions: DocumentUploadOptions = {
            adaptTo: options?.adaptTo,
            glossaries: options?.glossaries,
            noTrace: options?.noTrace,
            style: options?.style,
            password: options?.password,
            extractionParams: options?.extractionParams
        };

        const { id } = await this.upload(file, filename, source, target, uploadOptions);

        const downloadOptions = options?.outputFormat ? { outputFormat: options.outputFormat } : undefined;

        const pollingInterval = 2000;
        const maxWaitTime = 1000 * 60 * 15; // 15 minutes
        const start = Date.now();

        while (Date.now() - start < maxWaitTime) {
            await new Promise((resolve) => setTimeout(resolve, pollingInterval));

            const { status, errorReason } = await this.status(id);

            if (status === DocumentStatus.TRANSLATED) return await this.download(id, downloadOptions);
            if (status === DocumentStatus.ERROR) {
                throw new LaraApiError(500, "DocumentError", errorReason as string);
            }
        }

        throw new TimeoutError();
    }
}
