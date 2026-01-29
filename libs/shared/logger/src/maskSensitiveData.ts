/**
 * Utility to mask sensitive data in logs
 */

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

type MaskedValue = string | number | boolean | null | undefined | MaskedValue[] | { [key: string]: MaskedValue };

/**
 * Recursively mask sensitive fields in an object
 */
export function maskSensitiveData(obj: unknown, depth = 0, maxDepth = 10): MaskedValue {
  if (depth > maxDepth) {
    return '[Max Depth Reached]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }
    return String(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item, depth + 1, maxDepth));
  }

  const masked: Record<string, MaskedValue> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if this field should be masked
    const shouldMask = SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()));

    if (shouldMask) {
      masked[key] = MASK;
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value, depth + 1, maxDepth);
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
      masked[key] = value;
    } else {
      masked[key] = String(value);
    }
  }

  return masked;
}

/**
 * Mask sensitive data in headers
 */
export function maskHeaders(headers: unknown): MaskedValue {
  if (!headers || typeof headers !== 'object') {
    if (headers === null || headers === undefined) {
      return headers;
    }
    return String(headers);
  }

  const masked: Record<string, MaskedValue> = {};
  const sensitiveHeaders = ['authorization', 'x-csrf-token', 'cookie'];

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.some(h => lowerKey.includes(h.toLowerCase()))) {
      masked[key] = MASK;
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
      masked[key] = value;
    } else {
      masked[key] = String(value);
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
    const sensitiveParams = ['apiToken', 'token', 'key', 'secret'];

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
