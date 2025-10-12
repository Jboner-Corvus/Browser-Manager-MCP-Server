import { ErrorDetails } from './errorUtils.js';
import type { AuthData } from '../types.js';
export interface EnqueueParams<TParams> {
    params: TParams;
    auth: AuthData | undefined;
    taskId: string;
    toolName: string;
    cbUrl?: string;
}
export interface TaskOutcome<TParams, TResult> {
    taskId: string;
    status: 'completed' | 'error' | 'processing';
    msg: string;
    result?: TResult;
    error?: ErrorDetails;
    inParams: TParams;
    ts: string;
    progress?: {
        current: number;
        total: number;
        unit?: string;
    };
}
/**
 * Ajoute une tâche à la file d'attente BullMQ.
 */
export declare function enqueueTask<TParams>(args: EnqueueParams<TParams>): Promise<string | undefined>;
