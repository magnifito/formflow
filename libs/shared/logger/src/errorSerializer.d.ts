/**
 * Utility to serialize error objects for logging
 * Handles nested errors, circular references, and various error types
 */
/**
 * Serialize an error object for logging
 */
export declare function serializeError(error: any, depth?: number, maxDepth?: number, seen?: WeakSet<object>): any;
//# sourceMappingURL=errorSerializer.d.ts.map