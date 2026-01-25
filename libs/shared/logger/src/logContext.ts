/**
 * Structured logging context utilities
 * Provides consistent log message structure across all apps
 */

/**
 * Log operation categories for consistent categorization
 */
export enum LogOperation {
  // HTTP Operations
  HTTP_REQUEST = 'http.request',
  HTTP_RESPONSE = 'http.response',

  // Authentication
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_TOKEN_VERIFY = 'auth.token.verify',
  AUTH_TOKEN_REFRESH = 'auth.token.refresh',
  AUTH_FAILED = 'auth.failed',

  // User Operations
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',

  // Organization Operations
  ORG_CREATE = 'org.create',
  ORG_UPDATE = 'org.update',
  ORG_DELETE = 'org.delete',

  // Form Operations
  FORM_CREATE = 'form.create',
  FORM_UPDATE = 'form.update',
  FORM_DELETE = 'form.delete',
  FORM_SUBMIT = 'form.submit',

  // Integration Operations
  INTEGRATION_TELEGRAM_SEND = 'integration.telegram.send',
  INTEGRATION_TELEGRAM_TOGGLE = 'integration.telegram.toggle',
  INTEGRATION_TELEGRAM_LINK = 'integration.telegram.link',
  INTEGRATION_TELEGRAM_UNLINK = 'integration.telegram.unlink',
  INTEGRATION_DISCORD_SEND = 'integration.discord.send',
  INTEGRATION_DISCORD_TOGGLE = 'integration.discord.toggle',
  INTEGRATION_DISCORD_WEBHOOK = 'integration.discord.webhook',
  INTEGRATION_MAKE_SEND = 'integration.make.send',
  INTEGRATION_MAKE_TOGGLE = 'integration.make.toggle',
  INTEGRATION_MAKE_WEBHOOK = 'integration.make.webhook',
  INTEGRATION_N8N_SEND = 'integration.n8n.send',
  INTEGRATION_N8N_TOGGLE = 'integration.n8n.toggle',
  INTEGRATION_N8N_WEBHOOK = 'integration.n8n.webhook',
  INTEGRATION_WEBHOOK_SEND = 'integration.webhook.send',
  INTEGRATION_WEBHOOK_TOGGLE = 'integration.webhook.toggle',
  INTEGRATION_WEBHOOK_UPDATE = 'integration.webhook.update',
  INTEGRATION_SLACK_SEND = 'integration.slack.send',
  INTEGRATION_SLACK_TOGGLE = 'integration.slack.toggle',
  INTEGRATION_SLACK_LINK = 'integration.slack.link',
  INTEGRATION_SLACK_UNLINK = 'integration.slack.unlink',
  INTEGRATION_EMAIL_SEND = 'integration.email.send',

  // Domain Operations
  DOMAIN_ADD = 'domain.add',
  DOMAIN_REMOVE = 'domain.remove',
  DOMAIN_CHECK = 'domain.check',

  // Security Operations
  CSRF_TOKEN_ISSUE = 'security.csrf.issue',
  CSRF_TOKEN_VERIFY = 'security.csrf.verify',
  RATE_LIMIT_CHECK = 'security.ratelimit.check',
  RATE_LIMIT_EXCEEDED = 'security.ratelimit.exceeded',

  // Database Operations
  DB_QUERY = 'db.query',
  DB_QUERY_SLOW = 'db.query.slow',
  DB_ERROR = 'db.error',
  DB_MIGRATION = 'db.migration',

  // System Operations
  SYSTEM_STARTUP = 'system.startup',
  SYSTEM_SHUTDOWN = 'system.shutdown',
  SYSTEM_ERROR = 'system.error',
}

/**
 * Log outcome for operation result tracking
 */
export enum LogOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  SKIPPED = 'skipped',
  PENDING = 'pending',
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
export function createLogContext(
  operation: LogOperation | string,
  data: Omit<LogContext, 'operation'> = {}
): LogContext {
  return {
    operation,
    ...data,
  };
}

/**
 * Creates a success log context
 */
export function successContext(
  operation: LogOperation | string,
  data: Omit<LogContext, 'operation' | 'outcome'> = {}
): LogContext {
  return createLogContext(operation, { ...data, outcome: LogOutcome.SUCCESS });
}

/**
 * Creates a failure log context
 */
export function failureContext(
  operation: LogOperation | string,
  data: Omit<LogContext, 'operation' | 'outcome'> = {}
): LogContext {
  return createLogContext(operation, { ...data, outcome: LogOutcome.FAILURE });
}

/**
 * Extracts request context from Express request object
 */
export function extractRequestContext(req: {
  correlationId?: string;
  user?: { userId?: number | string };
  orgUser?: { id?: number | string };
  organization?: { id?: number | string };
  params?: Record<string, string>;
}): Pick<LogContext, 'correlationId' | 'userId' | 'organizationId'> {
  return {
    correlationId: req.correlationId,
    userId: req.user?.userId || req.orgUser?.id,
    organizationId: req.organization?.id,
  };
}

/**
 * Standard log message templates for consistency
 */
export const LogMessages = {
  // HTTP messages
  httpRequestReceived: (method: string, path: string) => `HTTP request received: ${method} ${path}`,
  httpResponseSent: (method: string, path: string, statusCode: number) =>
    `HTTP response sent: ${method} ${path} ${statusCode}`,
  httpRequestFailed: (method: string, path: string, statusCode: number) =>
    `HTTP request failed: ${method} ${path} ${statusCode}`,
  httpClientError: (method: string, path: string, statusCode: number) =>
    `HTTP client error: ${method} ${path} ${statusCode}`,

  // Integration messages
  integrationSendSuccess: (type: string) => `${type} message sent successfully`,
  integrationSendFailed: (type: string) => `Failed to send ${type} message`,
  integrationToggled: (type: string, enabled: boolean) =>
    `${type} integration ${enabled ? 'enabled' : 'disabled'}`,
  integrationWebhookUpdated: (type: string) => `${type} webhook URL updated`,
  integrationLinked: (type: string) => `${type} account linked`,
  integrationUnlinked: (type: string) => `${type} account unlinked`,

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
  systemShutdownSignal: (signal: string) => `Shutdown signal received: ${signal}`,

  // User messages
  userNotFound: 'User not found',
  userUpdated: 'User updated successfully',

  // Generic messages
  operationSuccess: 'Operation completed successfully',
  operationFailed: 'Operation failed',
} as const;
