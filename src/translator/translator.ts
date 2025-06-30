import {Credentials} from "../credentials";
import createClient, {LaraClient} from "../net";
import createS3Client from "../net/s3";
import {
    Document,
    DocumentDownloadOptions,
    DocumentStatus,
    DocumentUploadOptions, Glossary, GlossaryCounts, GlossaryImport,
    Memory,
    MemoryImport,
    TextBlock,
    TextResult
} from "./models";
import {LaraApiError, TimeoutError} from "../errors";
import {MultiPartFile} from "../net/client";
import {BrowserS3Client} from "../net/s3/browser-client";
import {NodeS3Client} from "../net/s3/node-client";

export type TranslatorOptions = {
    serverUrl?: string,
}

export type MemoryImportCallback = (memoryImport: MemoryImport) => void;

export class Memories {

    private readonly client: LaraClient;
    private readonly pollingInterval: number;

    constructor(client: LaraClient) {
        this.client = client;
        this.pollingInterval = 2000;
    }

    async list(): Promise<Memory[]> {
        return await this.client.get<Memory[]>("/memories");
    }

    async create(name: string, externalId?: string): Promise<Memory> {
        return await this.client.post<Memory>("/memories", {
            name, external_id: externalId
        });
    }

    async get(id: string): Promise<Memory | null> {
        try {
            return await this.client.get<Memory>(`/memories/${id}`);
        } catch (e) {
            if (e instanceof LaraApiError && e.statusCode === 404) {
                return null;
            }

            throw e;
        }
    }

    async delete(id: string): Promise<Memory> {
        return await this.client.delete<Memory>(`/memories/${id}`);
    }

    async update(id: string, name: string): Promise<Memory> {
        return await this.client.put<Memory>(`/memories/${id}`, {name});
    }

    async connect<T extends string | string[]>(ids: T): Promise<T extends string ? Memory : Memory[]> {
        const memories = await this.client.post<Memory[]>("/memories/connect", {
            ids: Array.isArray(ids) ? ids : [ids]
        });

        return (Array.isArray(ids) ? memories : memories[0]) as T extends string ? Memory : Memory[];
    }

    async importTmx(id: string, tmx: MultiPartFile, gzip: boolean = false): Promise<MemoryImport> {
        return await this.client.post<MemoryImport>(`/memories/${id}/import`, {
            compression: gzip ? 'gzip' : undefined
        }, {
            tmx
        });
    }

    async addTranslation(id: string | string[], source: string, target: string, sentence: string, translation: string,
                         tuid?: string, sentenceBefore?: string, sentenceAfter?: string): Promise<MemoryImport> {
        const body: Record<string, any> = {
            source,
            target,
            sentence,
            translation,
            tuid,
            sentence_before: sentenceBefore,
            sentence_after: sentenceAfter
        };

        if (Array.isArray(id)) {
            body.ids = id;
            return await this.client.put<MemoryImport>("/memories/content", body);
        } else {
            return await this.client.put<MemoryImport>(`/memories/${id}/content`, body);
        }
    }

    async deleteTranslation(id: string | string[], source: string, target: string, sentence: string, translation: string,
                            tuid?: string, sentenceBefore?: string, sentenceAfter?: string): Promise<MemoryImport> {
        const body: Record<string, any> = {
            source,
            target,
            sentence,
            translation,
            tuid,
            sentence_before: sentenceBefore,
            sentence_after: sentenceAfter
        };

        if (Array.isArray(id)) {
            body.ids = id;
            return await this.client.delete<MemoryImport>("/memories/content", body);
        } else {
            return await this.client.delete<MemoryImport>(`/memories/${id}/content`, body);
        }
    }

    async getImportStatus(id: string): Promise<MemoryImport> {
        return await this.client.get<MemoryImport>(`/memories/imports/${id}`);
    }

    async waitForImport(mImport: MemoryImport, updateCallback?: MemoryImportCallback, maxWaitTime?: number): Promise<MemoryImport> {
        const start = Date.now();
        while (mImport.progress < 1.) {
            if (maxWaitTime && Date.now() - start > maxWaitTime)
                throw new TimeoutError();

            await new Promise(resolve => setTimeout(resolve, this.pollingInterval));

            mImport = await this.getImportStatus(mImport.id);
            if (updateCallback)
                updateCallback(mImport);
        }

        return mImport;
    }
}

export type TranslateOptions = {
    sourceHint?: string,
    adaptTo?: string[],
    instructions?: string[],
    glossaries?: string[],
    contentType?: string,
    multiline?: boolean,
    timeoutInMillis?: number,
    priority?: "normal" | "background",
    useCache?: boolean | "overwrite",
    cacheTTLSeconds?: number,
    noTrace?: boolean,
    verbose?: boolean,
}

export type DocumentTranslateOptions = DocumentUploadOptions & DocumentDownloadOptions;

export type S3UploadFields = {
    acl: string;
    bucket: string;
    key: string;
}

type UploadUrlData = {
    url: string;
    fields: S3UploadFields
}

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
        const {url, fields} = await this.client.get<UploadUrlData>(`/documents/upload-url`, {filename});

        await this.s3Client.upload(url, fields, file);

        const headers: Record<string, string> = options?.noTrace ? { 'X-No-Trace': 'true' } : {};

        return this.client.post<Document>('/documents', {
            source,
            target,
            s3key: fields.key,
            adapt_to: options?.adaptTo,
            glossaries: options?.glossaries,
        }, undefined, headers);
    }

    public async status(id: string): Promise<Document> {
        return await this.client.get<Document>(`/documents/${id}`);
    }

    public async download(id: string, options?: DocumentDownloadOptions): Promise<Blob | Buffer> {
        const { url } = await this.client.get<{url: string}>(`/documents/${id}/download-url`, {
            output_format: options?.outputFormat,
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
            noTrace: options?.noTrace
        };

        const { id } = await this.upload(file, filename, source, target, uploadOptions);

        const downloadOptions = options?.outputFormat ? { outputFormat: options.outputFormat } : undefined;

        const pollingInterval = 2000;
        const maxWaitTime = 1000 * 60 * 15; // 15 minutes
        const start = Date.now();

        while (Date.now() - start < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, pollingInterval));

            const { status, errorReason } = await this.status(id);

            if (status === DocumentStatus.TRANSLATED) return await this.download(id, downloadOptions);
            if (status === DocumentStatus.ERROR) {
                throw new LaraApiError(500, "DocumentError", errorReason as string);
            }
        }

        throw new TimeoutError();
    }
}

export type GlossaryImportCallback = (glossaryImport: GlossaryImport) => void;

export class Glossaries {
    private readonly client: LaraClient;
    private readonly pollingInterval: number;

    constructor(client: LaraClient) {
        this.client = client;
        this.pollingInterval = 2000;
    }

    async list(): Promise<Glossary[]> {
        return await this.client.get<Glossary[]>('/glossaries');
    }

    async create(name: string): Promise<Glossary> {
        return await this.client.post<Glossary>('/glossaries', { name });
    }

    async get(id: string): Promise<Glossary | null> {
        try {
            return await this.client.get<Glossary>(`/glossaries/${id}`);
        } catch (e) {
            if (e instanceof LaraApiError && e.statusCode === 404) {
                return null;
            }
            throw e;
        }
    }

    async delete(id: string): Promise<Glossary> {
        return await this.client.delete<Glossary>(`/glossaries/${id}`);
    }

    async update(id: string, name: string): Promise<Glossary> {
        return await this.client.put<Glossary>(`/glossaries/${id}`, { name });
    }

    async importCsv(id: string, csv: MultiPartFile, gzip: boolean = false): Promise<GlossaryImport> {
        return await this.client.post<GlossaryImport>(`/glossaries/${id}/import`, {
            compression: gzip ? 'gzip' : undefined
        }, {
            csv
        })
    }

    async getImportStatus(id: string): Promise<GlossaryImport> {
        return await this.client.get<GlossaryImport>(`/glossaries/imports/${id}`);
    }

    async waitForImport(gImport: GlossaryImport, updateCallback?: GlossaryImportCallback, maxWaitTime?: number): Promise<GlossaryImport> {
        const start = Date.now();
        while (gImport.progress < 1.) {
            if (maxWaitTime && Date.now() - start > maxWaitTime)
                throw new TimeoutError();

            await new Promise(resolve => setTimeout(resolve, this.pollingInterval));

            gImport = await this.getImportStatus(gImport.id);
            if (updateCallback)
                updateCallback(gImport);
        }

        return gImport;
    }

    async counts(id: string): Promise<GlossaryCounts> {
        return await this.client.get<GlossaryCounts>(`/glossaries/${id}/counts`);
    }

    async export(id: string, contentType: 'csv/table-uni', source?: string): Promise<string> {
        return await this.client.get(`/glossaries/${id}/export`, {
            content_type: contentType,
            source
        });
    }
}

export class Translator {

    protected readonly client: LaraClient;
    public readonly memories: Memories;
    public readonly documents: Documents;
    public readonly glossaries: Glossaries;

    constructor(credentials: Credentials, options?: TranslatorOptions) {
        this.client = createClient(credentials.accessKeyId, credentials.accessKeySecret, options?.serverUrl);
        this.memories = new Memories(this.client);
        this.documents = new Documents(this.client);
        this.glossaries = new Glossaries(this.client);
    }

    async getLanguages(): Promise<string[]> {
        return await this.client.get<string[]>("/languages");
    }

    async translate<T extends string | string[] | TextBlock[]>(text: T, source: string | null, target: string,
                                                               options?: TranslateOptions): Promise<TextResult<T>> {

        const headers: Record<string, string> = options?.noTrace ? { 'X-No-Trace': 'true' } : {};

        return await this.client.post<TextResult<T>>("/translate", {
            q: text, source, target, source_hint: options?.sourceHint,
            content_type: options?.contentType, multiline: options?.multiline !== false,
            adapt_to: options?.adaptTo, glossaries: options?.glossaries, instructions: options?.instructions,
            timeout: options?.timeoutInMillis, priority: options?.priority,
            use_cache: options?.useCache, cache_ttl: options?.cacheTTLSeconds,
            verbose: options?.verbose,
        }, undefined, headers);
    }
}