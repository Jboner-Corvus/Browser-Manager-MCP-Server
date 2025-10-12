// --- src/types.ts (Corrigé et Isolé) ---
import { IncomingMessage } from 'http';
import { Socket } from 'net';
/**
 * Type guard pour vérifier si un objet est une instance valide de AppRuntimeSession.
 */
export function isAppRuntimeSession(session) {
    if (!session || typeof session !== 'object')
        return false;
    const s = session;
    const hasCoreProperties = typeof s.frameworkSessionId === 'string' &&
        s.request instanceof IncomingMessage &&
        typeof s.sendEvent === 'function' &&
        typeof s.closeConnection === 'function' &&
        (s.request.socket === null ||
            s.request.socket === undefined ||
            (typeof Socket !== 'undefined' && s.request.socket instanceof Socket));
    if (!hasCoreProperties)
        return false;
    if (s.auth !== undefined) {
        if (s.auth === null || typeof s.auth !== 'object')
            return false;
        const auth = s.auth;
        return (typeof auth.id === 'string' &&
            typeof auth.type === 'string' &&
            typeof auth.authenticatedAt === 'number' &&
            typeof auth.clientIp === 'string');
    }
    return true;
}
export function zodToStandardSchema(zodSchema) {
    return {
        '~standard': {
            version: 1,
            vendor: 'zod',
            validate: (value) => {
                const result = zodSchema.safeParse(value);
                if (result.success) {
                    return { value: result.data };
                }
                else {
                    return { issues: result.error.issues.map((issue) => ({ message: issue.message })) };
                }
            },
            types: {
                input: {},
                output: {},
            },
        },
    };
}
//# sourceMappingURL=types.js.map