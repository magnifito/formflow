/**
 * Utility to mask sensitive data in logs
 */

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
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
export function maskSensitiveData(obj: any, depth = 0, maxDepth = 10): any {
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

  const masked: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if this field should be masked
    const shouldMask = SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()));

    if (shouldMask) {
      masked[key] = MASK;
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value, depth + 1, maxDepth);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Mask sensitive data in headers
 */
export function maskHeaders(headers: any): any {
  if (!headers || typeof headers !== 'object') {
    return headers;
  }

  const masked: any = {};
  const sensitiveHeaders = ['authorization', 'x-csrf-token', 'cookie'];

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.some(h => lowerKey.includes(h.toLowerCase()))) {
      masked[key] = MASK;
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Mask sensitive data in URL query strings
 */
export function maskUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const sensitiveParams = ['apiKey', 'token', 'key', 'secret'];

    for (const param of sensitiveParams) {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, MASK);
      }
    }

    return urlObj.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}
