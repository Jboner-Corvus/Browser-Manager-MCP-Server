// src/utils/errorUtils.ts
import { ERROR_STACK_TRACE_MAX_LENGTH } from './constants.js';
export class AppErrorBase extends Error {
    type;
    details;
    constructor(message, type, details) {
        super(message);
        this.name = this.constructor.name;
        this.type = type;
        this.details = details;
    }
}
export class EnqueueTaskError extends AppErrorBase {
    constructor(message, details) {
        super(message, 'EnqueueTaskError', details);
    }
}
export class WebhookError extends AppErrorBase {
    statusCode;
    responseBody;
    constructor(message, type = 'WebhookError', statusCode, responseBody, details) {
        super(message, type, details);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }
}
export function getErrDetails(error) {
    if (error instanceof AppErrorBase) {
        return {
            message: error.message,
            name: error.name,
            stack: error.stack?.substring(0, ERROR_STACK_TRACE_MAX_LENGTH),
            type: error.type,
            details: error.details,
        };
    }
    if (error instanceof Error) {
        let type = 'GenericError';
        if ('code' in error)
            type = error.code;
        return {
            message: error.message,
            name: error.name,
            stack: error.stack?.substring(0, ERROR_STACK_TRACE_MAX_LENGTH),
            type: type,
            details: 'details' in error ? error.details : undefined,
        };
    }
    const name = 'UnknownError';
    const type = 'UnknownErrorType';
    let msgValue = 'An unknown error occurred.';
    let detailsValue = { originalError: error };
    if (typeof error === 'string') {
        msgValue = error;
    }
    else if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
            msgValue = error.message;
        }
        else {
            try {
                msgValue = JSON.stringify(error);
            }
            catch {
                // _e variable removed as it's unused
                // msgValue reste 'An unknown error occurred.' ou 'Failed to stringify...'
            }
        }
        if (detailsValue.originalError === error) {
            detailsValue = { ...error, originalError: error };
        }
        else {
            detailsValue = { ...detailsValue, ...error };
        }
    }
    return {
        message: msgValue,
        name,
        stack: undefined,
        type,
        details: detailsValue,
    };
}
//# sourceMappingURL=errorUtils.js.map