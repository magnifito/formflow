"use strict";
/**
 * Structured logging context utilities
 * Provides consistent log message structure across all apps
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogMessages = exports.LogOutcome = exports.LogOperation = void 0;
exports.createLogContext = createLogContext;
exports.successContext = successContext;
exports.failureContext = failureContext;
exports.extractRequestContext = extractRequestContext;
/**
 * Log operation categories for consistent categorization
 */
var LogOperation;
(function (LogOperation) {
    // HTTP Operations
    LogOperation["HTTP_REQUEST"] = "http.request";
    LogOperation["HTTP_RESPONSE"] = "http.response";
    // Authentication
    LogOperation["AUTH_LOGIN"] = "auth.login";
    LogOperation["AUTH_LOGOUT"] = "auth.logout";
    LogOperation["AUTH_TOKEN_VERIFY"] = "auth.token.verify";
    LogOperation["AUTH_TOKEN_REFRESH"] = "auth.token.refresh";
    LogOperation["AUTH_FAILED"] = "auth.failed";
    // User Operations
    LogOperation["USER_CREATE"] = "user.create";
    LogOperation["USER_UPDATE"] = "user.update";
    LogOperation["USER_DELETE"] = "user.delete";
    // Organization Operations
    LogOperation["ORG_CREATE"] = "org.create";
    LogOperation["ORG_UPDATE"] = "org.update";
    LogOperation["ORG_DELETE"] = "org.delete";
    // Form Operations
    LogOperation["FORM_CREATE"] = "form.create";
    LogOperation["FORM_UPDATE"] = "form.update";
    LogOperation["FORM_DELETE"] = "form.delete";
    LogOperation["FORM_SUBMIT"] = "form.submit";
    // Integration Operations
    LogOperation["INTEGRATION_TELEGRAM_SEND"] = "integration.telegram.send";
    LogOperation["INTEGRATION_TELEGRAM_TOGGLE"] = "integration.telegram.toggle";
    LogOperation["INTEGRATION_TELEGRAM_LINK"] = "integration.telegram.link";
    LogOperation["INTEGRATION_TELEGRAM_UNLINK"] = "integration.telegram.unlink";
    LogOperation["INTEGRATION_CREATE"] = "integration.create";
    LogOperation["INTEGRATION_UPDATE"] = "integration.update";
    LogOperation["INTEGRATION_DELETE"] = "integration.delete";
    LogOperation["INTEGRATION_DISCORD_SEND"] = "integration.discord.send";
    LogOperation["INTEGRATION_DISCORD_TOGGLE"] = "integration.discord.toggle";
    LogOperation["INTEGRATION_DISCORD_WEBHOOK"] = "integration.discord.webhook";
    LogOperation["INTEGRATION_MAKE_SEND"] = "integration.make.send";
    LogOperation["INTEGRATION_MAKE_TOGGLE"] = "integration.make.toggle";
    LogOperation["INTEGRATION_MAKE_WEBHOOK"] = "integration.make.webhook";
    LogOperation["INTEGRATION_N8N_SEND"] = "integration.n8n.send";
    LogOperation["INTEGRATION_N8N_TOGGLE"] = "integration.n8n.toggle";
    LogOperation["INTEGRATION_N8N_WEBHOOK"] = "integration.n8n.webhook";
    LogOperation["INTEGRATION_WEBHOOK_SEND"] = "integration.webhook.send";
    LogOperation["INTEGRATION_WEBHOOK_TOGGLE"] = "integration.webhook.toggle";
    LogOperation["INTEGRATION_WEBHOOK_UPDATE"] = "integration.webhook.update";
    LogOperation["INTEGRATION_SLACK_SEND"] = "integration.slack.send";
    LogOperation["INTEGRATION_SLACK_TOGGLE"] = "integration.slack.toggle";
    LogOperation["INTEGRATION_SLACK_LINK"] = "integration.slack.link";
    LogOperation["INTEGRATION_SLACK_UNLINK"] = "integration.slack.unlink";
    LogOperation["INTEGRATION_EMAIL_SEND"] = "integration.email.send";
    // Domain Operations
    LogOperation["DOMAIN_ADD"] = "domain.add";
    LogOperation["DOMAIN_REMOVE"] = "domain.remove";
    LogOperation["DOMAIN_CHECK"] = "domain.check";
    // Security Operations
    LogOperation["CSRF_TOKEN_ISSUE"] = "security.csrf.issue";
    LogOperation["CSRF_TOKEN_VERIFY"] = "security.csrf.verify";
    LogOperation["RATE_LIMIT_CHECK"] = "security.ratelimit.check";
    LogOperation["RATE_LIMIT_EXCEEDED"] = "security.ratelimit.exceeded";
    // Database Operations
    LogOperation["DB_QUERY"] = "db.query";
    LogOperation["DB_QUERY_SLOW"] = "db.query.slow";
    LogOperation["DB_ERROR"] = "db.error";
    LogOperation["DB_MIGRATION"] = "db.migration";
    // System Operations
    LogOperation["SYSTEM_STARTUP"] = "system.startup";
    LogOperation["SYSTEM_SHUTDOWN"] = "system.shutdown";
    LogOperation["SYSTEM_ERROR"] = "system.error";
    // Dashboard Queue Operations
    LogOperation["DASHBOARD_QUEUE_STATS"] = "dashboard.queue.stats";
    LogOperation["DASHBOARD_QUEUE_JOBS"] = "dashboard.queue.jobs";
    LogOperation["DASHBOARD_QUEUE_RETRY"] = "dashboard.queue.retry";
})(LogOperation || (exports.LogOperation = LogOperation = {}));
/**
 * Log outcome for operation result tracking
 */
var LogOutcome;
(function (LogOutcome) {
    LogOutcome["SUCCESS"] = "success";
    LogOutcome["FAILURE"] = "failure";
    LogOutcome["SKIPPED"] = "skipped";
    LogOutcome["PENDING"] = "pending";
})(LogOutcome || (exports.LogOutcome = LogOutcome = {}));
/**
 * Creates a structured log context object
 */
function createLogContext(operation, data = {}) {
    return {
        operation,
        ...data,
    };
}
/**
 * Creates a success log context
 */
function successContext(operation, data = {}) {
    return createLogContext(operation, { ...data, outcome: LogOutcome.SUCCESS });
}
/**
 * Creates a failure log context
 */
function failureContext(operation, data = {}) {
    return createLogContext(operation, { ...data, outcome: LogOutcome.FAILURE });
}
/**
 * Extracts request context from Express request object
 */
function extractRequestContext(req) {
    return {
        correlationId: req.correlationId,
        userId: req.user?.userId || req.orgUser?.id,
        organizationId: req.organization?.id,
    };
}
/**
 * Standard log message templates for consistency
 */
exports.LogMessages = {
    // HTTP messages
    httpRequestReceived: (method, path) => `HTTP request received: ${method} ${path}`,
    httpResponseSent: (method, path, statusCode) => `HTTP response sent: ${method} ${path} ${statusCode}`,
    httpRequestFailed: (method, path, statusCode) => `HTTP request failed: ${method} ${path} ${statusCode}`,
    httpClientError: (method, path, statusCode) => `HTTP client error: ${method} ${path} ${statusCode}`,
    // Integration messages
    integrationSendSuccess: (type) => `${type} message sent successfully`,
    integrationSendFailed: (type) => `Failed to send ${type} message`,
    integrationToggled: (type, enabled) => `${type} integration ${enabled ? 'enabled' : 'disabled'}`,
    integrationWebhookUpdated: (type) => `${type} webhook URL updated`,
    integrationLinked: (type) => `${type} account linked`,
    integrationUnlinked: (type) => `${type} account unlinked`,
    // Domain messages
    domainAdded: 'Domain added to whitelist',
    domainRemoved: 'Domain removed from whitelist',
    domainNotAllowed: 'Request from non-whitelisted domain',
    // Auth messages
    authSuccess: 'Authentication successful',
    authFailed: 'Authentication failed',
    tokenVerified: 'Token verified successfully',
    tokenInvalid: 'Invalid or expired token',
    // Form messages
    formSubmissionReceived: 'Form submission received',
    formSubmissionProcessed: 'Form submission processed',
    formSubmissionFailed: 'Form submission failed',
    // Security messages
    csrfTokenIssued: 'CSRF token issued',
    csrfTokenInvalid: 'Invalid CSRF token',
    rateLimitExceeded: 'Rate limit exceeded',
    // System messages
    systemUncaughtException: 'Uncaught exception',
    systemUnhandledRejection: 'Unhandled promise rejection',
    systemShutdownSignal: (signal) => `Shutdown signal received: ${signal}`,
    // User messages
    userNotFound: 'User not found',
    userUpdated: 'User updated successfully',
    // Generic messages
    operationSuccess: 'Operation completed successfully',
    operationFailed: 'Operation failed',
};
//# sourceMappingURL=logContext.js.map