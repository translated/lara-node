/**
 * Represents an access key for authenticating with the Lara API.
 */
export class AccessKey {
    /** The access key ID. */
    public readonly id: string;
    /** The access key secret. */
    public readonly secret: string;

    /**
     * Creates a new AccessKey instance.
     * @param id - The access key ID.
     * @param secret - The access key secret.
     */
    constructor(id: string, secret: string) {
        this.id = id;
        this.secret = secret;
    }
}

/**
 * @deprecated Use AccessKey instead.
 */
export class Credentials extends AccessKey {
    get accessKeyId() {
        return this.id;
    }

    get accessKeySecret() {
        return this.secret;
    }
}

/**
 * Represents an authentication token for authenticating with the Lara API.
 */
export class AuthToken {
    /** The authentication token. */
    public readonly token: string;
    /** The refresh token used to obtain a new authentication token. */
    public readonly refreshToken: string;

    /**
     * Creates a new AuthToken instance.
     * @param token - The authentication token.
     * @param refreshToken - The refresh token.
     */
    constructor(token: string, refreshToken: string) {
        this.token = token;
        this.refreshToken = refreshToken;
    }
}
