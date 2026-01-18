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
  [key: string]: any;
}

/**
 * Serialize an error object for logging
 */
export function serializeError(error: any, depth = 0, maxDepth = 5, seen = new WeakSet()): SerializedError | string {
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
    if ((error as any).code !== undefined) {
      serialized.code = (error as any).code;
    }

    // Handle error.cause (Error cause chains)
    if ((error as any).cause) {
      serialized.cause = serializeError((error as any).cause, depth + 1, maxDepth, seen) as SerializedError;
    }

    // Handle TypeORM errors
    if (error.name === 'QueryFailedError' || error.name === 'EntityNotFoundError') {
      if ((error as any).query) {
        serialized.query = (error as any).query;
      }
      if ((error as any).parameters) {
        serialized.parameters = '[Query Parameters]'; // Don't log actual parameters (may contain sensitive data)
      }
    }

    // Include any additional properties
    const additionalProps = Object.getOwnPropertyNames(error).filter(
      prop => !['name', 'message', 'stack', 'code', 'cause', 'query', 'parameters'].includes(prop)
    );

    for (const prop of additionalProps) {
      try {
        const value = (error as any)[prop];
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
  const serialized: any = {};
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
function serializeValue(value: any, depth: number, maxDepth: number, seen: WeakSet<any>): any {
  if (depth > maxDepth) {
    return '[Max Depth]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'function') {
    return '[Function]';
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  if (value instanceof Error) {
    return serializeError(value, depth, maxDepth, seen);
  }

  if (Array.isArray(value)) {
    return value.map(item => serializeValue(item, depth + 1, maxDepth, seen));
  }

  // Plain object
  const result: any = {};
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
