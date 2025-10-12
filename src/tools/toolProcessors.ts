import type { AuthData, ToolContext } from '../types.js';

export type ToolProcessor = (
  args: unknown,
  context: ToolContext<AuthData>
) => Promise<string | void | object>;

export const toolProcessors: Record<string, ToolProcessor> = {
  // Les outils seront ajoutés depuis browserTools.ts dans le serveur principal
};
