/**
 * Utility to mask sensitive data in logs
 */
/**
 * Recursively mask sensitive fields in an object
 */
export declare function maskSensitiveData(obj: any, depth?: number, maxDepth?: number): any;
/**
 * Mask sensitive data in headers
 */
export declare function maskHeaders(headers: any): any;
/**
 * Mask sensitive data in URL query strings
 */
export declare function maskUrl(url: string): string;
//# sourceMappingURL=maskSensitiveData.d.ts.map