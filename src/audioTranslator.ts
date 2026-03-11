import { LaraApiError, TimeoutError } from "./errors";
import type { LaraClient } from "./net/lara";
import type { MultiPartFile } from "./net/lara/client";
import createS3Client from "./net/s3";
import type { BrowserS3Client } from "./net/s3/browser-client";
import type { S3UploadFields } from "./net/s3/client";
import type { LaraStream } from "./net/s3/laraStream";
import type { NodeS3Client } from "./net/s3/node-client";
import type { TranslationStyle } from "./translator";

type UploadUrlData = {
    url: string;
    fields: S3UploadFields;
};

// biome-ignore format: keep comments aligned
export enum AudioStatus {
    INITIALIZED = "initialized",    // just been created
    ANALYZING = "analyzing",        // being analyzed for language detection and chars count
    PAUSED = "paused",              // paused after analysis, needs user confirm
    READY = "ready",                // ready to be translated
    TRANSLATING = "translating",
    TRANSLATED = "translated",
    ERROR = "error"
}

export enum VoiceGender {
    MALE = "male",
    FEMALE = "female",
}

export type AudioOptions = {
    adaptTo?: string[];
    glossaries?: string[];
    noTrace?: boolean;
    style?: TranslationStyle;
    voiceGender?: VoiceGender;
};

export type AudioUploadOptions = AudioOptions & {
    // Optional length of the file in bytes, needed for some upload scenarios
    contentLength?: number;
};

export interface Audio {
    readonly id: string;
    readonly status: AudioStatus;
    readonly translatedSeconds?: number;
    readonly totalSeconds?: number;
    readonly source?: string;
    readonly target: string;
    readonly filename: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly options?: AudioOptions;
    readonly errorReason?: string;
}

export class AudioTranslator {
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
        options?: AudioUploadOptions
    ): Promise<Audio> {
        const { url, fields } = await this.client.get<UploadUrlData>(`/v2/audio/upload-url`, { filename });

        await this.s3Client.upload(url, fields, file, options?.contentLength);

        const headers: Record<string, string> = options?.noTrace ? { "X-No-Trace": "true" } : {};

        return this.client.post<Audio>(
            `/v2/audio/translate`,
            {
                source,
                target,
                s3key: fields.key,
                adapt_to: options?.adaptTo,
                glossaries: options?.glossaries,
                style: options?.style,
                voice_gender: options?.voiceGender
            },
            undefined,
            headers
        );
    }

    public async status(id: string): Promise<Audio> {
        return await this.client.get<Audio>(`/v2/audio/${id}`);
    }

    public async download(id: string): Promise<LaraStream> {
        const { url } = await this.client.get<{ url: string }>(`/v2/audio/${id}/download-url`);

        return (await this.s3Client.downloadStream(url)) as LaraStream;
    }

    public async translate(
        file: MultiPartFile,
        filename: string,
        source: string | null,
        target: string,
        options?: AudioUploadOptions
    ): Promise<LaraStream> {
        const { id } = await this.upload(file, filename, source, target, options);

        const pollingInterval = 2000;
        const maxWaitTime = 1000 * 60 * 15; // 15 minutes
        const start = Date.now();

        while (Date.now() - start < maxWaitTime) {
            await new Promise((resolve) => setTimeout(resolve, pollingInterval));

            const { status, errorReason } = await this.status(id);

            if (status === AudioStatus.TRANSLATED) return await this.download(id);
            if (status === AudioStatus.ERROR) {
                throw new LaraApiError(500, "AudioError", errorReason as string);
            }
        }

        throw new TimeoutError();
    }
}
