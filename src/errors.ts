export class LaraError extends Error {}

export class TimeoutError extends LaraError {}

export class LaraApiError extends LaraError {
    public readonly statusCode: number;
    public readonly type: string;
    public readonly message: string;
    public readonly idTransaction?: string;

    constructor(statusCode: number, type: string, message: string, idTransaction?: string) {
        super(message);
        this.statusCode = statusCode;
        this.type = type;
        this.message = message;
        this.idTransaction = idTransaction;
    }
}
