import { AsyncTaskJobPayload } from './queue.js';
import type { Logger as PinoLogger } from 'pino';
import type { Config } from './config.js';
export declare function initWorker(logger: PinoLogger, config: Config): Promise<import("bullmq").Worker<AsyncTaskJobPayload<unknown>, unknown, string>>;
