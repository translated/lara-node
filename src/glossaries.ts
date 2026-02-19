import { LaraApiError, TimeoutError } from "./errors";
import type { LaraClient } from "./net/lara";
import type { MultiPartFile } from "./net/lara/client";

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

export type GlossaryFileFormat = "csv/table-uni" | "csv/table-multi";

export type GlossaryImportCallback = (glossaryImport: GlossaryImport) => void;

export class Glossaries {
    private readonly client: LaraClient;
    private readonly pollingInterval: number;

    constructor(client: LaraClient) {
        this.client = client;
        this.pollingInterval = 2000;
    }

    async list(): Promise<Glossary[]> {
        return await this.client.get<Glossary[]>("/v2/glossaries");
    }

    async create(name: string): Promise<Glossary> {
        return await this.client.post<Glossary>("/v2/glossaries", { name });
    }

    async get(id: string): Promise<Glossary | null> {
        try {
            return await this.client.get<Glossary>(`/v2/glossaries/${id}`);
        } catch (e) {
            if (e instanceof LaraApiError && e.statusCode === 404) {
                return null;
            }
            throw e;
        }
    }

    async delete(id: string): Promise<Glossary> {
        return await this.client.delete<Glossary>(`/v2/glossaries/${id}`);
    }

    async update(id: string, name: string): Promise<Glossary> {
        return await this.client.put<Glossary>(`/v2/glossaries/${id}`, { name });
    }

    async importCsv(id: string, csv: MultiPartFile, gzip?: boolean): Promise<GlossaryImport>;
    async importCsv(
        id: string,
        csv: MultiPartFile,
        contentType: GlossaryFileFormat,
        gzip?: boolean
    ): Promise<GlossaryImport>;
    async importCsv(
        id: string,
        csv: MultiPartFile,
        gzipOrContentType?: boolean | GlossaryFileFormat,
        maybeGzip?: boolean
    ): Promise<GlossaryImport> {
        // Default values when no content type or gzip flag is provided
        let gzip: boolean = false;
        let contentType: GlossaryFileFormat = "csv/table-uni";

        if (typeof gzipOrContentType === "boolean") {
            // First overload: (id, csv, gzip)
            gzip = gzipOrContentType;
        } else if (typeof gzipOrContentType === "string") {
            // Second overload: (id, csv, contentType, gzip)
            contentType = gzipOrContentType;
            gzip = maybeGzip ?? false;
        }

        return await this.client.post<GlossaryImport>(
            `/v2/glossaries/${id}/import`,
            {
                compression: gzip ? "gzip" : undefined,
                content_type: contentType
            },
            {
                csv
            }
        );
    }

    async getImportStatus(id: string): Promise<GlossaryImport> {
        return await this.client.get<GlossaryImport>(`/v2/glossaries/imports/${id}`);
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
        return await this.client.get<GlossaryCounts>(`/v2/glossaries/${id}/counts`);
    }

    async export(id: string, contentType: GlossaryFileFormat, source?: string): Promise<string> {
        return await this.client.get(`/v2/glossaries/${id}/export`, {
            content_type: contentType,
            source
        });
    }

    async addOrReplaceEntry(
        id: string,
        terms: { language: string; value: string }[],
        guid?: string
    ): Promise<GlossaryImport> {
        return await this.client.put<GlossaryImport>(`/v2/glossaries/${id}/content`, { terms, guid });
    }

    async deleteEntry(id: string, term?: { language: string; value: string }, guid?: string): Promise<GlossaryImport> {
        return await this.client.delete<GlossaryImport>(`/v2/glossaries/${id}/content`, undefined, {
            term,
            guid
        });
    }
}
