import { IncomingMessage } from 'http';
import { FastMCPSession as BaseFastMCPSession, Context as ToolContext, Tool as FastMCPTool } from 'fastmcp';
import { z } from 'zod';
export interface FastMCPSessionAuth extends Record<string, unknown> {
    '~standard'?: unknown;
}
/**
 * Données d'authentification personnalisées.
 */
export interface AuthData extends FastMCPSessionAuth {
    id: string;
    type: string;
    authenticatedAt: number;
    clientIp: string;
}
/**
 * Représente l'objet de session complet de FastMCP, potentiellement enrichi avec notre AuthData.
 */
export interface AppRuntimeSession extends BaseFastMCPSession<AuthData> {
    frameworkSessionId: string;
    request: IncomingMessage;
    sendEvent: (event: string, data: unknown, id?: string) => void;
    closeConnection: (reason?: string) => void;
    auth?: AuthData;
}
/**
 * Type guard pour vérifier si un objet est une instance valide de AppRuntimeSession.
 */
export declare function isAppRuntimeSession(session: unknown): session is AppRuntimeSession;
export type Tool<T extends FastMCPSessionAuth, Params extends z.ZodTypeAny> = FastMCPTool<T, Params>;
export type { ToolContext };
export declare function zodToStandardSchema<T extends z.ZodTypeAny>(zodSchema: T): {
    '~standard': {
        version: 1;
        vendor: string;
        validate: (value: unknown) => {
            value: z.infer<T>;
            issues?: undefined;
        } | {
            issues: {
                message: string;
            }[];
        };
        types: {
            input: z.infer<T>;
            output: z.infer<T>;
        };
    };
};
