"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRequestContext = exports.failureContext = exports.successContext = exports.createLogContext = exports.LogMessages = exports.LogOutcome = exports.LogOperation = exports.serializeError = exports.maskUrl = exports.maskHeaders = exports.maskSensitiveData = void 0;
const tslib_1 = require("tslib");
const winston_1 = tslib_1.__importDefault(require("winston"));
const winston_daily_rotate_file_1 = tslib_1.__importDefault(require("winston-daily-rotate-file"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const maskSensitiveData_1 = require("./maskSensitiveData");
const errorSerializer_1 = require("./errorSerializer");
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_DIR = process.env.LOG_DIR || path_1.default.join(process.cwd(), 'logs');
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
function inferServiceName() {
    // Try to infer service name from package.json or cwd
    try {
        const packageJsonPath = path_1.default.join(process.cwd(), 'package.json');
        if (fs_1.default.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf-8'));
            const name = packageJson.name || '';
            // Extract service name from package name (e.g., "formflow-dashboard-api" -> "dashboard-api")
            if (name.includes('dashboard-api'))
                return 'dashboard-api';
            if (name.includes('collector-api'))
                return 'collector-api';
            return name;
        }
    }
    catch {
        // Ignore errors
    }
    return 'unknown-service';
}
function getPackageVersion() {
    try {
        const packageJsonPath = path_1.default.join(process.cwd(), 'package.json');
        if (fs_1.default.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf-8'));
            return packageJson.version || '0.0.0';
        }
    }
    catch {
        // Ignore errors
    }
    return '0.0.0';
}
const serviceMetadata = getServiceMetadata();
// Ensure log directory exists
if (!fs_1.default.existsSync(LOG_DIR)) {
    fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
}
// Add service metadata to all log entries
const addServiceMetadata = winston_1.default.format((info) => {
    return {
        ...serviceMetadata,
        ...info,
    };
});
// Format errors before logging
const errorFormatter = winston_1.default.format((info) => {
    if (info.error && typeof info.error === 'object') {
        info.error = (0, errorSerializer_1.serializeError)(info.error);
    }
    // Also serialize error in the root level if present
    if (info instanceof Error) {
        const serialized = (0, errorSerializer_1.serializeError)(info);
        Object.assign(info, serialized);
    }
    return info;
});
// Custom format for console (pretty-printed)
const consoleFormat = winston_1.default.format.combine(addServiceMetadata(), errorFormatter(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, correlationId, userId, organizationId, duration, statusCode, service, operation, outcome, error, ...meta }) => {
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
    const identifiers = [];
    if (correlationId)
        identifiers.push(`cid:${String(correlationId).substring(0, 8)}`);
    if (userId)
        identifiers.push(`uid:${userId}`);
    if (organizationId)
        identifiers.push(`org:${organizationId}`);
    if (duration !== undefined)
        identifiers.push(`${duration}ms`);
    if (statusCode)
        identifiers.push(`status:${statusCode}`);
    if (identifiers.length > 0) {
        log += ` [${identifiers.join(' | ')}]`;
    }
    // Add error message if present
    if (error && typeof error === 'string') {
        log += ` - ${error}`;
    }
    else if (error && typeof error === 'object' && 'message' in error) {
        log += ` - ${error.message}`;
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
        const filteredMeta = {};
        for (const key of metaKeys) {
            filteredMeta[key] = meta[key];
        }
        log += ` ${JSON.stringify(filteredMeta)}`;
    }
    return log;
}));
// Custom format for file (JSON)
const fileFormat = winston_1.default.format.combine(addServiceMetadata(), errorFormatter(), winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format((info) => {
    // Mask sensitive data before logging
    if (info.body) {
        info.body = (0, maskSensitiveData_1.maskSensitiveData)(info.body);
    }
    if (info.headers) {
        info.headers = (0, maskSensitiveData_1.maskHeaders)(info.headers);
    }
    if (info.url && typeof info.url === 'string') {
        info.url = (0, maskSensitiveData_1.maskUrl)(info.url);
    }
    if (info.meta) {
        info.meta = (0, maskSensitiveData_1.maskSensitiveData)(info.meta);
    }
    return info;
})());
// Console transport (pretty-printed, colored)
const consoleTransport = new winston_1.default.transports.Console({
    format: consoleFormat,
    level: LOG_LEVEL,
});
// File transport (JSON, rotated daily)
const fileTransport = new winston_daily_rotate_file_1.default({
    filename: path_1.default.join(LOG_DIR, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: LOG_MAX_FILES,
    format: fileFormat,
    level: LOG_LEVEL,
    zippedArchive: true,
});
// Error file transport (separate file for errors)
const errorFileTransport = new winston_daily_rotate_file_1.default({
    filename: path_1.default.join(LOG_DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: LOG_MAX_FILES,
    format: fileFormat,
    level: 'error',
    zippedArchive: true,
});
// Custom transport for tests to bypass Jest's console interception
const testTransport = new winston_1.default.transports.Stream({
    stream: process.stdout,
    format: consoleFormat,
    level: LOG_LEVEL,
});
// Create logger instance
const logger = winston_1.default.createLogger({
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
    write: (message) => {
        logger.info(message.trim());
    },
};
exports.default = logger;
// Export utilities
var maskSensitiveData_2 = require("./maskSensitiveData");
Object.defineProperty(exports, "maskSensitiveData", { enumerable: true, get: function () { return maskSensitiveData_2.maskSensitiveData; } });
Object.defineProperty(exports, "maskHeaders", { enumerable: true, get: function () { return maskSensitiveData_2.maskHeaders; } });
Object.defineProperty(exports, "maskUrl", { enumerable: true, get: function () { return maskSensitiveData_2.maskUrl; } });
var errorSerializer_2 = require("./errorSerializer");
Object.defineProperty(exports, "serializeError", { enumerable: true, get: function () { return errorSerializer_2.serializeError; } });
var logContext_1 = require("./logContext");
Object.defineProperty(exports, "LogOperation", { enumerable: true, get: function () { return logContext_1.LogOperation; } });
Object.defineProperty(exports, "LogOutcome", { enumerable: true, get: function () { return logContext_1.LogOutcome; } });
Object.defineProperty(exports, "LogMessages", { enumerable: true, get: function () { return logContext_1.LogMessages; } });
Object.defineProperty(exports, "createLogContext", { enumerable: true, get: function () { return logContext_1.createLogContext; } });
Object.defineProperty(exports, "successContext", { enumerable: true, get: function () { return logContext_1.successContext; } });
Object.defineProperty(exports, "failureContext", { enumerable: true, get: function () { return logContext_1.failureContext; } });
Object.defineProperty(exports, "extractRequestContext", { enumerable: true, get: function () { return logContext_1.extractRequestContext; } });
//# sourceMappingURL=index.js.map