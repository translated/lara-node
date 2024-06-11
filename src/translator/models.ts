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

export interface TextResult {
    readonly contentType: string;
    readonly sourceLanguage: string;
    readonly translation: string;
    readonly adaptedTo?: string[];
}
