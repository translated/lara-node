import {Credentials} from "../credentials";
import createClient, {LaraClient} from "../net";
import {Memory, MemoryImport} from "./models";
import {LaraError} from "../net/client";

export type TranslatorOptions = {
    serverUrl?: string,
}

export class Memories {

    private readonly client: LaraClient;

    constructor(client: LaraClient) {
        this.client = client;
    }

    async list(): Promise<Memory[]> {
        return (await this.client.get<Memory>("/memories")) as Memory[];
    }

    async create(name: string, externalId?: string): Promise<Memory> {
        return (await this.client.post<Memory>("/memories", {
            name, external_id: externalId
        })) as Memory;
    }

    async get(id: string): Promise<Memory | null> {
        try {
            return (await this.client.get<Memory>(`/memories/${id}`)) as Memory;
        } catch (e) {
            if (e instanceof LaraError && e.statusCode === 404) {
                return null;
            }

            throw e;
        }
    }

    async delete(id: string): Promise<Memory> {
        return (await this.client.delete<Memory>(`/memories/${id}`)) as Memory;
    }

    async update(id: string, name: string): Promise<Memory> {
        return (await this.client.put<Memory>(`/memories/${id}`, {name})) as Memory;
    }

    async connect(ids: string[]): Promise<Memory[]> {
        return await this.client.post<Memory>('/memories/connect', {
            ids: Array.isArray(ids) ? ids : [ids]
        }) as Memory[];
    }

    async connectOne(id: string): Promise<Memory | null> {
        const results = await this.connect([id]);
        return results.length > 0 ? results[0] : null;
    }

    async importTmx(id: string, tmx: any, gzip: boolean = false): Promise<MemoryImport> {
        return (await this.client.post<MemoryImport>(`/memories/${id}/import`, {
            compression: gzip ? 'gzip' : undefined
        }, {tmx})) as MemoryImport;
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
            return (await this.client.put<MemoryImport>('/memories/content', body)) as MemoryImport;
        } else {
            return (await this.client.put<MemoryImport>(`/memories/${id}/content`, body)) as MemoryImport;
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
            return (await this.client.delete<MemoryImport>('/memories/content', body)) as MemoryImport;
        } else {
            return (await this.client.delete<MemoryImport>(`/memories/${id}/content`, body)) as MemoryImport;
        }
    }

    async getImportStatus(id: string): Promise<MemoryImport> {
        return (await this.client.get<MemoryImport>(`/memories/imports/${id}`)) as MemoryImport;
    }

}

export class Translator {

    private readonly client: LaraClient;
    public readonly memories: Memories;

    constructor(credentials: Credentials, options?: TranslatorOptions) {
        this.client = createClient(credentials.accessKeyId, credentials.accessKeySecret, options?.serverUrl);
        this.memories = new Memories(this.client);
    }

}