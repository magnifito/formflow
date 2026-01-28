"use strict";
/**
 * Utility to mask sensitive data in logs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskSensitiveData = maskSensitiveData;
exports.maskHeaders = maskHeaders;
exports.maskUrl = maskUrl;
const SENSITIVE_FIELDS = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'apiToken',
    'csrfToken',
    '_csrf',
    'authorization',
    'x-csrf-token',
    'jwt',
    'secret',
    'secretKey',
];
const MASK = '***REDACTED***';
/**
 * Recursively mask sensitive fields in an object
 */
function maskSensitiveData(obj, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) {
        return '[Max Depth Reached]';
    }
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => maskSensitiveData(item, depth + 1, maxDepth));
    }
    const masked = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        // Check if this field should be masked
        const shouldMask = SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()));
        if (shouldMask) {
            masked[key] = MASK;
        }
        else if (typeof value === 'object' && value !== null) {
            masked[key] = maskSensitiveData(value, depth + 1, maxDepth);
        }
        else {
            masked[key] = value;
        }
    }
    return masked;
}
/**
 * Mask sensitive data in headers
 */
function maskHeaders(headers) {
    if (!headers || typeof headers !== 'object') {
        return headers;
    }
    const masked = {};
    const sensitiveHeaders = ['authorization', 'x-csrf-token', 'cookie'];
    for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveHeaders.some(h => lowerKey.includes(h.toLowerCase()))) {
            masked[key] = MASK;
        }
        else {
            masked[key] = value;
        }
    }
    return masked;
}
/**
 * Mask sensitive data in URL query strings
 */
function maskUrl(url) {
    if (!url || typeof url !== 'string') {
        return url;
    }
    try {
        const urlObj = new URL(url);
        const sensitiveParams = ['apiToken', 'token', 'key', 'secret'];
        for (const param of sensitiveParams) {
            if (urlObj.searchParams.has(param)) {
                urlObj.searchParams.set(param, MASK);
            }
        }
        return urlObj.toString();
    }
    catch {
        // If URL parsing fails, return as-is
        return url;
    }
}
//# sourceMappingURL=maskSensitiveData.js.map