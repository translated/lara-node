import {Credentials} from "../credentials";
import createClient, {LaraClient} from "../net";
import {Document, DocumentResult, Memory, MemoryImport, TextResult} from "./models";
import {LaraApiError, TimeoutError} from "../errors";

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

    async importTmx(id: string, tmx: any, gzip: boolean = false): Promise<MemoryImport> {
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
    contentType?: string,
    multiline?: boolean,
    timeoutInMillis?: number
}

export class Translator {

    private readonly client: LaraClient;
    public readonly memories: Memories;

    constructor(credentials: Credentials, options?: TranslatorOptions) {
        this.client = createClient(credentials.accessKeyId, credentials.accessKeySecret, options?.serverUrl);
        this.memories = new Memories(this.client);
    }

    async translate<T extends string | string[]>(text: T, source: string | null, target: string,
                                                 options?: TranslateOptions): Promise<T extends string ? TextResult : TextResult[]> {
        const q: { text: string }[] = (Array.isArray(text) ? text : [text]).map((item) => {
            return {text: item};
        });

        const results = await this.client.post<TextResult[]>("/translate", {
            q, source, target, "source_hint": options?.sourceHint, "content_type": options?.contentType,
            "multiline": options?.multiline !== false, "adapt_to": options?.adaptTo,
            "instructions": options?.instructions, "timeout": options?.timeoutInMillis
        });

        return (Array.isArray(text) ? results : results[0]) as T extends string ? TextResult : TextResult[];
    }

    async translateDocument(document: Document, source: string | null, target: string,
                            options?: TranslateOptions): Promise<DocumentResult> {
        const q: { text: string, translatable: boolean }[] = document.sections;

        return await this.client.post<DocumentResult>("/translate/document", {
            q, source, target, "source_hint": options?.sourceHint, "content_type": options?.contentType,
            "multiline": options?.multiline !== false, "adapt_to": options?.adaptTo,
            "instructions": options?.instructions, "timeout": options?.timeoutInMillis
        });
    }

}