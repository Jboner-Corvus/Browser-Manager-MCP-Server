import { Queue, ConnectionOptions, Job, QueueEvents } from 'bullmq';
import type { AuthData } from './types.js';
export declare const taskQueue: Queue<AsyncTaskJobPayload<unknown>, unknown, string, AsyncTaskJobPayload<unknown>, unknown, string>;
export declare const deadLetterQueue: Queue<AsyncTaskJobPayload<unknown>, unknown, string, AsyncTaskJobPayload<unknown>, unknown, string>;
export declare const taskQueueEvents: QueueEvents;
export declare const deadLetterQueueEvents: QueueEvents;
export declare function initQueues(): {
    taskQueue: Queue<AsyncTaskJobPayload<unknown>, unknown, string, AsyncTaskJobPayload<unknown>, unknown, string>;
    deadLetterQueue: Queue<AsyncTaskJobPayload<unknown>, unknown, string, AsyncTaskJobPayload<unknown>, unknown, string>;
    redisConnection: ConnectionOptions;
    taskQueueEvents: QueueEvents;
    deadLetterQueueEvents: QueueEvents;
};
export interface AsyncTaskJobPayload<TParams = unknown> {
    params: TParams;
    auth: AuthData | undefined;
    taskId: string;
    toolName: string;
    cbUrl?: string;
    originalJobId?: string;
    failureReason?: unknown;
}
export type AppJob<P = unknown, R = unknown> = Job<AsyncTaskJobPayload<P>, R, string>;
