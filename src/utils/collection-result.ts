import type { CollectionResult } from "../collectionResult";
import type { ClientResponse } from "../net/lara/client";

export function toCollectionResult<T>(response: ClientResponse<T[]>): CollectionResult<T> {
    const readIntegerHeader = (header: string, minimum: number): number | undefined => {
        const value = Object.entries(response.headers).find(([name]) => name.toLowerCase() === header)?.[1];
        const number = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
        return Number.isSafeInteger(number) && number >= minimum ? number : undefined;
    };
    const total = readIntegerHeader("x-total-count", 0);
    if (total === undefined) {
        throw new Error("Missing or invalid X-Total-Count response header");
    }
    const page = readIntegerHeader("x-page", 1);
    const size = readIntegerHeader("x-page-size", 1);
    return {
        items: response.body,
        total,
        ...(page !== undefined ? { page } : {}),
        ...(size !== undefined ? { size } : {})
    };
}
