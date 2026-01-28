/**
 * Structured logging context utilities
 * Provides consistent log message structure across all apps
 */
/**
 * Log operation categories for consistent categorization
 */
export declare enum LogOperation {
    HTTP_REQUEST = "http.request",
    HTTP_RESPONSE = "http.response",
    AUTH_LOGIN = "auth.login",
    AUTH_LOGOUT = "auth.logout",
    AUTH_TOKEN_VERIFY = "auth.token.verify",
    AUTH_TOKEN_REFRESH = "auth.token.refresh",
    AUTH_FAILED = "auth.failed",
    USER_CREATE = "user.create",
    USER_UPDATE = "user.update",
    USER_DELETE = "user.delete",
    ORG_CREATE = "org.create",
    ORG_UPDATE = "org.update",
    ORG_DELETE = "org.delete",
    FORM_CREATE = "form.create",
    FORM_UPDATE = "form.update",
    FORM_DELETE = "form.delete",
    FORM_SUBMIT = "form.submit",
    INTEGRATION_TELEGRAM_SEND = "integration.telegram.send",
    INTEGRATION_TELEGRAM_TOGGLE = "integration.telegram.toggle",
    INTEGRATION_TELEGRAM_LINK = "integration.telegram.link",
    INTEGRATION_TELEGRAM_UNLINK = "integration.telegram.unlink",
    INTEGRATION_CREATE = "integration.create",
    INTEGRATION_UPDATE = "integration.update",
    INTEGRATION_DELETE = "integration.delete",
    INTEGRATION_DISCORD_SEND = "integration.discord.send",
    INTEGRATION_DISCORD_TOGGLE = "integration.discord.toggle",
    INTEGRATION_DISCORD_WEBHOOK = "integration.discord.webhook",
    INTEGRATION_MAKE_SEND = "integration.make.send",
    INTEGRATION_MAKE_TOGGLE = "integration.make.toggle",
    INTEGRATION_MAKE_WEBHOOK = "integration.make.webhook",
    INTEGRATION_N8N_SEND = "integration.n8n.send",
    INTEGRATION_N8N_TOGGLE = "integration.n8n.toggle",
    INTEGRATION_N8N_WEBHOOK = "integration.n8n.webhook",
    INTEGRATION_WEBHOOK_SEND = "integration.webhook.send",
    INTEGRATION_WEBHOOK_TOGGLE = "integration.webhook.toggle",
    INTEGRATION_WEBHOOK_UPDATE = "integration.webhook.update",
    INTEGRATION_SLACK_SEND = "integration.slack.send",
    INTEGRATION_SLACK_TOGGLE = "integration.slack.toggle",
    INTEGRATION_SLACK_LINK = "integration.slack.link",
    INTEGRATION_SLACK_UNLINK = "integration.slack.unlink",
    INTEGRATION_EMAIL_SEND = "integration.email.send",
    DOMAIN_ADD = "domain.add",
    DOMAIN_REMOVE = "domain.remove",
    DOMAIN_CHECK = "domain.check",
    CSRF_TOKEN_ISSUE = "security.csrf.issue",
    CSRF_TOKEN_VERIFY = "security.csrf.verify",
    RATE_LIMIT_CHECK = "security.ratelimit.check",
    RATE_LIMIT_EXCEEDED = "security.ratelimit.exceeded",
    DB_QUERY = "db.query",
    DB_QUERY_SLOW = "db.query.slow",
    DB_ERROR = "db.error",
    DB_MIGRATION = "db.migration",
    SYSTEM_STARTUP = "system.startup",
    SYSTEM_SHUTDOWN = "system.shutdown",
    SYSTEM_ERROR = "system.error",
    DASHBOARD_QUEUE_STATS = "dashboard.queue.stats",
    DASHBOARD_QUEUE_JOBS = "dashboard.queue.jobs",
    DASHBOARD_QUEUE_RETRY = "dashboard.queue.retry"
}
/**
 * Log outcome for operation result tracking
 */
export declare enum LogOutcome {
    SUCCESS = "success",
    FAILURE = "failure",
    SKIPPED = "skipped",
    PENDING = "pending"
}
/**
 * Base context interface for all log entries
 */
export interface LogContext {
    operation: LogOperation | string;
    outcome?: LogOutcome;
    correlationId?: string;
    userId?: number | string;
    organizationId?: number | string;
    duration?: number;
    [key: string]: unknown;
}
/**
 * Creates a structured log context object
 */
export declare function createLogContext(operation: LogOperation | string, data?: Omit<LogContext, 'operation'>): LogContext;
/**
 * Creates a success log context
 */
export declare function successContext(operation: LogOperation | string, data?: Omit<LogContext, 'operation' | 'outcome'>): LogContext;
/**
 * Creates a failure log context
 */
export declare function failureContext(operation: LogOperation | string, data?: Omit<LogContext, 'operation' | 'outcome'>): LogContext;
/**
 * Extracts request context from Express request object
 */
export declare function extractRequestContext(req: {
    correlationId?: string;
    user?: {
        userId?: number | string;
    };
    orgUser?: {
        id?: number | string;
    };
    organization?: {
        id?: number | string;
    };
    params?: Record<string, string>;
}): Pick<LogContext, 'correlationId' | 'userId' | 'organizationId'>;
/**
 * Standard log message templates for consistency
 */
export declare const LogMessages: {
    readonly httpRequestReceived: (method: string, path: string) => string;
    readonly httpResponseSent: (method: string, path: string, statusCode: number) => string;
    readonly httpRequestFailed: (method: string, path: string, statusCode: number) => string;
    readonly httpClientError: (method: string, path: string, statusCode: number) => string;
    readonly integrationSendSuccess: (type: string) => string;
    readonly integrationSendFailed: (type: string) => string;
    readonly integrationToggled: (type: string, enabled: boolean) => string;
    readonly integrationWebhookUpdated: (type: string) => string;
    readonly integrationLinked: (type: string) => string;
    readonly integrationUnlinked: (type: string) => string;
    readonly domainAdded: "Domain added to whitelist";
    readonly domainRemoved: "Domain removed from whitelist";
    readonly domainNotAllowed: "Request from non-whitelisted domain";
    readonly authSuccess: "Authentication successful";
    readonly authFailed: "Authentication failed";
    readonly tokenVerified: "Token verified successfully";
    readonly tokenInvalid: "Invalid or expired token";
    readonly formSubmissionReceived: "Form submission received";
    readonly formSubmissionProcessed: "Form submission processed";
    readonly formSubmissionFailed: "Form submission failed";
    readonly csrfTokenIssued: "CSRF token issued";
    readonly csrfTokenInvalid: "Invalid CSRF token";
    readonly rateLimitExceeded: "Rate limit exceeded";
    readonly systemUncaughtException: "Uncaught exception";
    readonly systemUnhandledRejection: "Unhandled promise rejection";
    readonly systemShutdownSignal: (signal: string) => string;
    readonly userNotFound: "User not found";
    readonly userUpdated: "User updated successfully";
    readonly operationSuccess: "Operation completed successfully";
    readonly operationFailed: "Operation failed";
};
//# sourceMappingURL=logContext.d.ts.map