export interface ErrorDetails {
    message: string;
    name: string;
    type?: string;
    details?: unknown;
    stack?: string;
}
export declare class AppErrorBase extends Error {
    type: string;
    details?: unknown;
    constructor(message: string, type: string, details?: unknown);
}
export declare class EnqueueTaskError extends AppErrorBase {
    constructor(message: string, details?: unknown);
}
export declare class WebhookError extends AppErrorBase {
    statusCode?: number;
    responseBody?: string;
    constructor(message: string, type?: string, statusCode?: number, responseBody?: string, details?: unknown);
}
export declare function getErrDetails(error: unknown): ErrorDetails;
