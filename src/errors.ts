export class LaraError extends Error {

}

export class TimeoutError extends LaraError {

}

export class LaraApiError extends LaraError {
    public readonly statusCode: number;
    public readonly type: string;
    public readonly code: ErrorCodes;
    public readonly message: string
    public readonly details?: { [key: string]: any }

    constructor(statusCode: number, type: string, code: ErrorCodes, message: string, details?: { [key: string]: any}) {
        super(message);
        this.statusCode = statusCode;
        this.type = type;
        this.code = code;
        this.message = message;
        this.details = details;
    }
}

export enum ErrorCodes {
    LaraApiError = 'lara_api_error',
    ApiNotFound = 'api_not_found',
    ApiQuotaExceeded = 'api_quota_exceeded',
    LoginUnverifiedEmail = 'login_unverified_email',
    PermissionError = 'permission_error',
    ResourceNotFound = 'resource_not_found',
    Unauthorized = 'unauthorized',
    NoAccountConnected = 'no_account_connected',
    NoAccessAccount = 'no_access_account',
    ValidationError = 'validation_error',
    ExternalTranslationCustomer = 'external_translation_customer',
    InvalidPassword = 'invalid_password',
    InvalidCredentials = 'invalid_credentials',
    GoogleNoEmail = 'google_no_email',
    PrepaidPlanOnly = 'prepaid_plan_only',
    OnlyEurSupported = 'only_eur_supported',
    PurchaseAlreadyFulfilled = 'purchase_already_fulfilled',
    PurchaseNotPending = 'purchase_not_pending',
    PaymentIntentMismatch = 'payment_intent_mismatch',
    PaymentNotSucceeded = 'payment_not_succeeded',
    PaymentAmountMismatch = 'payment_amount_mismatch',
    PaymentCurrencyMismatch = 'payment_currency_mismatch',
    EmailAlreadyRegistered = 'email_already_registered',
    InvalidEmailToken = 'invalid_email_token',
    InvalidPasswordToken = 'invalid_password_token',
    TempEmail = 'temp_email',
    InvalidEmailChar = 'invalid_email_char',
    UnknownError = 'unknown_error',
    InternalApiError = 'internal_api_error',
    LaraEngineError = 'lara_engine_error',
    AccountNotActive = 'account_not_active',
    SubscriptionRequired = 'subscription_required',
    PolyglotError = 'polyglot_error',
    RegionLockError = 'region_lock_error',
    RequestTimeTooSkewed = 'request_time_too_skewed',
    TooManyRequests = 'too_many_requests',
    InvalidHeaderFormat = 'invalid_header_format',
    InvalidAccessKeyIdFormat = 'invalid_access_key_id_format',
    MissingDateHeader = 'missing_date_header',
    InvalidDateHeader = 'invalid_date_header',
    UnsupportedLanguage = 'unsupported_language',
}