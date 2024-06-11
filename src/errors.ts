export class LaraError extends Error {

}

export class TimeoutError extends LaraError {

}

export class LaraApiError extends LaraError {
    public readonly statusCode: number;
    public readonly name: string;
    public readonly errorMessage: string

    constructor(statusCode: number, name: string, message: string) {
        super(`[HTTP ${statusCode}] ${name}: ${message}`);
        this.statusCode = statusCode;
        this.name = name;
        this.errorMessage = message;
    }
}