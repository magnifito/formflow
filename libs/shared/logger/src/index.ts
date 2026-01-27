import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { maskSensitiveData, maskHeaders, maskUrl } from './maskSensitiveData';
import { serializeError } from './errorSerializer';

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const LOG_MAX_FILES = process.env.LOG_MAX_FILES || '14';

// Get service metadata
function getServiceMetadata() {
  const serviceName = process.env.SERVICE_NAME || inferServiceName();
  const serviceVersion = process.env.SERVICE_VERSION || getPackageVersion();
  const environment = NODE_ENV;

  return {
    service: serviceName,
    version: serviceVersion,
    environment,
  };
}

function inferServiceName(): string {
  // Try to infer service name from package.json or cwd
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const name = packageJson.name || '';
      // Extract service name from package name (e.g., "formflow-dashboard-api" -> "dashboard-api")
      if (name.includes('dashboard-api')) return 'dashboard-api';
      if (name.includes('collector-api')) return 'collector-api';
      return name;
    }
  } catch {
    // Ignore errors
  }
  return 'unknown-service';
}

function getPackageVersion(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.version || '0.0.0';
    }
  } catch {
    // Ignore errors
  }
  return '0.0.0';
}

const serviceMetadata = getServiceMetadata();

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Add service metadata to all log entries
const addServiceMetadata = winston.format((info) => {
  return {
    ...serviceMetadata,
    ...info,
  };
});

// Format errors before logging
const errorFormatter = winston.format((info) => {
  if (info.error && typeof info.error === 'object') {
    info.error = serializeError(info.error);
  }
  // Also serialize error in the root level if present
  if (info instanceof Error) {
    const serialized = serializeError(info);
    Object.assign(info, serialized);
  }
  return info;
});

// Custom format for console (pretty-printed)
const consoleFormat = winston.format.combine(
  addServiceMetadata(),
  errorFormatter(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, correlationId, userId, organizationId, duration, statusCode, service, operation, outcome, error, ...meta }) => {
    // Build the main log line
    let log = `[${timestamp}] [${service}]`;

    // Add operation context if present (e.g., [integration.telegram.send])
    if (operation) {
      log += ` [${operation}]`;
    }

    log += ` ${level}: ${message}`;

    // Add outcome if present
    if (outcome) {
      log += ` (${outcome})`;
    }

    // Add key identifiers in a readable format
    const identifiers: string[] = [];
    if (correlationId) identifiers.push(`cid:${String(correlationId).substring(0, 8)}`);
    if (userId) identifiers.push(`uid:${userId}`);
    if (organizationId) identifiers.push(`org:${organizationId}`);
    if (duration !== undefined) identifiers.push(`${duration}ms`);
    if (statusCode) identifiers.push(`status:${statusCode}`);

    if (identifiers.length > 0) {
      log += ` [${identifiers.join(' | ')}]`;
    }

    // Add error message if present
    if (error && typeof error === 'string') {
      log += ` - ${error}`;
    } else if (error && typeof error === 'object' && 'message' in error) {
      log += ` - ${(error as any).message}`;
    }

    // Add any additional metadata (filtered and cleaned for console readability)
    const excludeKeys = [
      'timestamp', 'level', 'message', 'correlationId', 'userId', 'organizationId',
      'duration', 'statusCode', 'service', 'version', 'environment', 'splat',
      'Symbol(level)', 'Symbol(message)', 'operation', 'outcome', 'error', 'stack',
      // Exclude verbose HTTP-specific fields from console output
      'headers', 'userAgent', 'query', 'body', 'responseBody', 'ip', 'method', 'path'
    ];
    const metaKeys = Object.keys(meta).filter(key => !excludeKeys.includes(key));

    if (metaKeys.length > 0) {
      const filteredMeta: Record<string, unknown> = {};
      for (const key of metaKeys) {
        filteredMeta[key] = meta[key];
      }
      log += ` ${JSON.stringify(filteredMeta)}`;
    }

    return log;
  })
);

// Custom format for file (JSON)
const fileFormat = winston.format.combine(
  addServiceMetadata(),
  errorFormatter(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format((info) => {
    // Mask sensitive data before logging
    if (info.body) {
      info.body = maskSensitiveData(info.body);
    }
    if (info.headers) {
      info.headers = maskHeaders(info.headers);
    }
    if (info.url && typeof info.url === 'string') {
      info.url = maskUrl(info.url);
    }
    if (info.meta) {
      info.meta = maskSensitiveData(info.meta);
    }
    return info;
  })()
);

// Console transport (pretty-printed, colored)
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: LOG_LEVEL,
});

// File transport (JSON, rotated daily)
const fileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: LOG_MAX_FILES,
  format: fileFormat,
  level: LOG_LEVEL,
  zippedArchive: true,
});

// Error file transport (separate file for errors)
const errorFileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: LOG_MAX_FILES,
  format: fileFormat,
  level: 'error',
  zippedArchive: true,
});

// Custom transport for tests to bypass Jest's console interception
const testTransport = new winston.transports.Stream({
  stream: process.stdout,
  format: consoleFormat,
  level: LOG_LEVEL,
});

// Create logger instance
const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    ...(NODE_ENV === 'test' ? [testTransport] : [consoleTransport]),
    fileTransport,
    errorFileTransport,
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Add stream for Morgan HTTP request logger compatibility
logger.stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
} as any;

export default logger;

// Export utilities
export { maskSensitiveData, maskHeaders, maskUrl } from './maskSensitiveData';
export { serializeError } from './errorSerializer';
export { WinstonTypeORMLogger } from './typeormLogger';
export {
  LogOperation,
  LogOutcome,
  LogMessages,
  createLogContext,
  successContext,
  failureContext,
  extractRequestContext,
} from './logContext';
export type { LogContext } from './logContext';

// Export types for TypeScript
export type Logger = typeof logger;
