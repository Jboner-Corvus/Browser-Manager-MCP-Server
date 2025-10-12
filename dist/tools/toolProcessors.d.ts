import type { AuthData, ToolContext } from '../types.js';
export type ToolProcessor = (args: unknown, context: ToolContext<AuthData>) => Promise<string | void | object>;
export declare const toolProcessors: Record<string, ToolProcessor>;
