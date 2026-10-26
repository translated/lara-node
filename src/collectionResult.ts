export interface CollectionResult<T> {
    readonly items: T[];
    /** Total number of matching resources */
    readonly total: number;
    /** Current page (1-based) */
    readonly page?: number;
    /** Page size */
    readonly size?: number;
}
