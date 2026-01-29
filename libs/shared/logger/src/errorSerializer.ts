/**
 * Utility to serialize error objects for logging
 * Handles nested errors, circular references, and various error types
 */

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  cause?: SerializedError;
  [key: string]: unknown;
}

interface ErrorWithCode extends Error {
  code?: string | number;
  cause?: unknown;
}

type SerializedValue = string | number | boolean | null | undefined | SerializedError | SerializedValue[] | { [key: string]: SerializedValue };

/**
 * Serialize an error object for logging
 */
export function serializeError(error: unknown, depth = 0, maxDepth = 5, seen = new WeakSet<object>()): SerializedValue {
  // Prevent infinite recursion
  if (depth > maxDepth) {
    return '[Max Depth Reached]';
  }

  // Handle null/undefined
  if (error === null || error === undefined) {
    return String(error);
  }

  // Handle primitive types
  if (typeof error !== 'object') {
    return String(error);
  }

  // Handle circular references
  if (seen.has(error)) {
    return '[Circular Reference]';
  }
  seen.add(error);

  // Handle Error objects
  if (error instanceof Error) {
    const serialized: SerializedError = {
      name: error.name,
      message: error.message,
    };

    if (error.stack) {
      serialized.stack = error.stack;
    }

    // Handle error code
    const errorWithCode = error as ErrorWithCode;
    if (errorWithCode.code !== undefined) {
      serialized.code = errorWithCode.code;
    }

    // Handle error.cause (Error cause chains)
    if (errorWithCode.cause) {
      serialized.cause = serializeError(errorWithCode.cause, depth + 1, maxDepth, seen) as SerializedError;
    }

    // Include any additional properties
    const additionalProps = Object.getOwnPropertyNames(error).filter(
      prop => !['name', 'message', 'stack', 'code', 'cause', 'query', 'parameters'].includes(prop)
    );

    for (const prop of additionalProps) {
      try {
        const value = (error as Record<string, unknown>)[prop];
        if (value !== undefined && typeof value !== 'function') {
          serialized[prop] = serializeValue(value, depth + 1, maxDepth, seen);
        }
      } catch {
        // Skip properties that can't be accessed
      }
    }

    return serialized;
  }

  // Handle arrays
  if (Array.isArray(error)) {
    return error.map(item => serializeError(item, depth + 1, maxDepth, seen));
  }

  // Handle plain objects
  const serialized: Record<string, SerializedValue> = {};
  for (const [key, value] of Object.entries(error)) {
    try {
      serialized[key] = serializeValue(value, depth + 1, maxDepth, seen);
    } catch {
      serialized[key] = '[Unable to serialize]';
    }
  }

  return serialized;
}

/**
 * Serialize a value (handles circular references and complex types)
 */
function serializeValue(value: unknown, depth: number, maxDepth: number, seen: WeakSet<object>): SerializedValue {
  if (depth > maxDepth) {
    return '[Max Depth]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'function') {
    return '[Function]';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  if (value instanceof Error) {
    return serializeError(value, depth, maxDepth, seen) as SerializedError;
  }

  if (Array.isArray(value)) {
    return value.map(item => serializeValue(item, depth + 1, maxDepth, seen));
  }

  // Plain object
  const result: Record<string, SerializedValue> = {};
  seen.add(value);
  for (const [key, val] of Object.entries(value)) {
    try {
      result[key] = serializeValue(val, depth + 1, maxDepth, seen);
    } catch {
      result[key] = '[Unable to serialize]';
    }
  }
  return result;
}
