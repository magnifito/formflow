import winston from 'winston';
declare const logger: winston.Logger;
export default logger;
export { maskSensitiveData, maskHeaders, maskUrl } from './maskSensitiveData';
export { serializeError } from './errorSerializer';
export { LogOperation, LogOutcome, LogMessages, createLogContext, successContext, failureContext, extractRequestContext, } from './logContext';
export type { LogContext } from './logContext';
export type Logger = typeof logger;
//# sourceMappingURL=index.d.ts.map