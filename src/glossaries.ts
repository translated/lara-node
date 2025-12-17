import { LaraApiError, TimeoutError } from "./errors";
import type { LaraClient } from "./net";
import type { MultiPartFile } from "./net/client";

export interface Glossary {
    readonly id: string;
    readonly name: string;
    readonly ownerId: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export interface GlossaryImport {
    readonly id: string;
    readonly begin: number;
    readonly end: number;
    readonly channel: number;
    readonly size: number;
    readonly progress: number;
}

export interface GlossaryCounts {
    unidirectional?: Record<string, number>;
    multidirectional?: number;
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
        return await this.client.get<Glossary[]>("/glossaries");
    }

    async create(name: string): Promise<Glossary> {
        return await this.client.post<Glossary>("/glossaries", { name });
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
        return await this.client.post<GlossaryImport>(
            `/glossaries/${id}/import`,
            {
                compression: gzip ? "gzip" : undefined
            },
            {
                csv
            }
        );
    }

    async getImportStatus(id: string): Promise<GlossaryImport> {
        return await this.client.get<GlossaryImport>(`/glossaries/imports/${id}`);
    }

    async waitForImport(
        gImport: GlossaryImport,
        updateCallback?: GlossaryImportCallback,
        maxWaitTime?: number
    ): Promise<GlossaryImport> {
        const start = Date.now();
        while (gImport.progress < 1.0) {
            if (maxWaitTime && Date.now() - start > maxWaitTime) throw new TimeoutError();

            await new Promise((resolve) => setTimeout(resolve, this.pollingInterval));

            gImport = await this.getImportStatus(gImport.id);
            if (updateCallback) updateCallback(gImport);
        }

        return gImport;
    }

    async counts(id: string): Promise<GlossaryCounts> {
        return await this.client.get<GlossaryCounts>(`/glossaries/${id}/counts`);
    }

    async export(id: string, contentType: "csv/table-uni", source?: string): Promise<string> {
        return await this.client.get(`/glossaries/${id}/export`, {
            content_type: contentType,
            source
        });
    }
}
