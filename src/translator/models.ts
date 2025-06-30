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
}

export interface MemoryImport {
    readonly id: string;
    readonly begin: number;
    readonly end: number;
    readonly channel: number;
    readonly size: number;
    readonly progress: number;
}

export enum DocumentStatus {
    INITIALIZED = "initialized",    // just been created
    ANALYZING = "analyzing",        // being analyzed for language detection and chars count
    PAUSED = "paused",              // paused after analysis, needs user confirm
    READY = "ready",                // ready to be translated
    TRANSLATING = "translating",
    TRANSLATED = "translated",
    ERROR = "error",
}

export type DocumentUploadOptions = {
    adaptTo?: string[],
    glossaries?: string[],
    noTrace?: boolean,
}

export type DocumentDownloadOptions = {
    outputFormat?: string,
}

export interface DocumentOptions extends DocumentUploadOptions { }

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

export interface TextBlock {
    readonly text: string;
    readonly translatable?: boolean;
}

export interface TextResult<T extends string | string[] | TextBlock[]> {
    readonly contentType: string;
    readonly sourceLanguage: string;
    readonly translation: T;
    readonly adaptedTo?: string[];
}

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