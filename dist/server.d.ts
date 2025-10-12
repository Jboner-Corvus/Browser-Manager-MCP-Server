/**
 * @file src/server.ts
 * @description Point d'entrée principal du serveur FastMCP.
 * Ce fichier initialise le serveur, configure l'authentification, enregistre les outils,
 * et démarre le transport HTTP Stream en suivant les meilleures pratiques.
 */
import type { IncomingMessage } from 'http';
import type { AuthData } from './types.js';
export declare const authHandler: (req: IncomingMessage) => Promise<AuthData>;
export declare function applicationEntryPoint(): Promise<void>;
