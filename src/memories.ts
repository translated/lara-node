import { LaraApiError, TimeoutError } from "./errors";
import type { LaraClient } from "./net/lara";
import type { MultiPartFile } from "./net/lara/client";

export interface Memory {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly sharedAt: Date;
    readonly name: string;
    readonly externalId?: string;
    readonly secret?: string;
    readonly ownerId: string;
    readonly collaboratorsCount: number;
    readonly isPersonal: boolean;
}

export interface MemoryImport {
    readonly id: string;
    readonly begin: number;
    readonly end: number;
    readonly channel: number;
    readonly size: number;
    readonly progress: number;
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
        return await this.client.get<Memory[]>("/v2/memories");
    }

    async create(name: string, externalId?: string): Promise<Memory> {
        return await this.client.post<Memory>("/v2/memories", {
            name,
            external_id: externalId
        });
    }

    async get(id: string): Promise<Memory | null> {
        try {
            return await this.client.get<Memory>(`/v2/memories/${id}`);
        } catch (e) {
            if (e instanceof LaraApiError && e.statusCode === 404) {
                return null;
            }

            throw e;
        }
    }

    async delete(id: string): Promise<Memory> {
        return await this.client.delete<Memory>(`/v2/memories/${id}`);
    }

    async update(id: string, name: string): Promise<Memory> {
        return await this.client.put<Memory>(`/v2/memories/${id}`, { name });
    }

    async connect<T extends string | string[]>(ids: T): Promise<T extends string ? Memory : Memory[]> {
        const memories = await this.client.post<Memory[]>("/v2/memories/connect", {
            ids: Array.isArray(ids) ? ids : [ids]
        });

        return (Array.isArray(ids) ? memories : memories[0]) as T extends string ? Memory : Memory[];
    }

    async importTmx(id: string, tmx: MultiPartFile): Promise<MemoryImport>;
    async importTmx(id: string, tmx: MultiPartFile, gzip: boolean): Promise<MemoryImport>;
    async importTmx(id: string, tmx: MultiPartFile, callbackUrl: string): Promise<MemoryImport>;
    async importTmx(id: string, tmx: MultiPartFile, gzip: boolean, callbackUrl: string): Promise<MemoryImport>;
    async importTmx(
        id: string,
        tmx: MultiPartFile,
        gzipOrCallbackUrl?: boolean | string,
        maybeCallbackUrl?: string
    ): Promise<MemoryImport> {
        let gzip: boolean = false;
        let callbackUrl: string | undefined;

        if (typeof gzipOrCallbackUrl === "boolean") {
            gzip = gzipOrCallbackUrl;
            callbackUrl = maybeCallbackUrl;
        } else if (typeof gzipOrCallbackUrl === "string") {
            callbackUrl = gzipOrCallbackUrl;
        }

        return await this.client.post<MemoryImport>(
            `/v2/memories/${id}/import`,
            {
                compression: gzip ? "gzip" : undefined,
                callback_url: callbackUrl
            },
            {
                tmx
            }
        );
    }

    async exportAsync(id: string, callbackUrl: string, format?: "tmx" | "jtm"): Promise<{ jobId: string }> {
        return await this.client.get<{ jobId: string }>(`/v2/memories/${id}/export/async`, {
            callback_url: callbackUrl,
            format
        });
    }

    async addTranslation(
        id: string | string[],
        source: string,
        target: string,
        sentence: string,
        translation: string,
        tuid?: string,
        sentenceBefore?: string,
        sentenceAfter?: string,
        headers?: Record<string, string>
    ): Promise<MemoryImport> {
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
            return await this.client.put<MemoryImport>("/v2/memories/content", body, undefined, headers);
        } else {
            return await this.client.put<MemoryImport>(`/v2/memories/${id}/content`, body, undefined, headers);
        }
    }

    async deleteTranslation(
        id: string | string[],
        source: string,
        target: string,
        sentence?: string,
        translation?: string,
        tuid?: string,
        sentenceBefore?: string,
        sentenceAfter?: string
    ): Promise<MemoryImport> {
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
            return await this.client.delete<MemoryImport>("/v2/memories/content", undefined, body);
        } else {
            return await this.client.delete<MemoryImport>(`/v2/memories/${id}/content`, undefined, body);
        }
    }

    async getImportStatus(id: string): Promise<MemoryImport> {
        return await this.client.get<MemoryImport>(`/v2/memories/imports/${id}`);
    }

    async waitForImport(
        mImport: MemoryImport,
        updateCallback?: MemoryImportCallback,
        maxWaitTime?: number
    ): Promise<MemoryImport> {
        const start = Date.now();
        while (mImport.progress < 1.0) {
            if (maxWaitTime && Date.now() - start > maxWaitTime) throw new TimeoutError();

            await new Promise((resolve) => setTimeout(resolve, this.pollingInterval));

            mImport = await this.getImportStatus(mImport.id);
            if (updateCallback) updateCallback(mImport);
        }

        return mImport;
    }
}
