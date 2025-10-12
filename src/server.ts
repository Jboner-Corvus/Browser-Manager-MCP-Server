/**
 * @file src/server.ts
 * @description Point d'entrée principal du serveur FastMCP.
 * Ce fichier initialise le serveur, configure l'authentification, enregistre les outils,
 * et démarre le transport HTTP Stream en suivant les meilleures pratiques.
 */

import { randomUUID } from 'crypto';
import type { IncomingMessage } from 'http';

import { FastMCP } from 'fastmcp';
import type { FastMCPSession, LoggingLevel } from 'fastmcp';

// Imports locaux
import { config } from './config.js';
import logger from './logger.js';
import {
  launchBrowserTool,
  listBrowsersTool,
  detectOpenBrowsersTool,
  closeBrowserTool,
  listTabsTool,
  selectTabTool,
  newTabTool,
  closeTabTool,
  navigateTool,
  screenshotTool,
  clickTool,
  typeTextTool,
  waitForTool,
  getHtmlTool,
  getConsoleLogsTool,
  evaluateScriptTool,
  listExternalBrowserTabsTool,
} from './tools/browserTools.js';
import type { AuthData } from './types.js';
import { getErrDetails } from './utils/errorUtils.js';

// =============================================================================
// GESTIONNAIRE D'AUTHENTIFICATION
// =============================================================================

export const authHandler = async (req: IncomingMessage): Promise<AuthData> => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const authLog = logger.child({
    clientIp,
    op: 'auth',
  });

  const sessionAuthData: AuthData = {
    id: randomUUID(),
    type: 'None',
    authenticatedAt: Date.now(),
    clientIp,
    '~standard': { parameters: {}, context: {} },
  };
  authLog.info({ authId: sessionAuthData.id }, 'Authentification désactivée.');
  return sessionAuthData;
};

// =============================================================================
// POINT D'ENTRÉE PRINCIPAL DE L'APPLICATION
// =============================================================================
export async function applicationEntryPoint() {
  logger.info(`Démarrage du serveur en mode ${config.NODE_ENV}...`);
  const server = new FastMCP<AuthData>({
    name: 'MCP-Server-Production',
    version: '2.0.0',
    authenticate: authHandler,
    instructions:
      "Serveur MCP pour opérations synchrones et asynchrones. Le transport est HTTP Stream. L'authentification Bearer est requise.",

    health: {
      enabled: true,
      path: config.HEALTH_CHECK_PATH,
      message: 'Server is healthy and ready.',
    },

    ping: {
      enabled: true,
      intervalMs: 15000,
      logLevel: (config.LOG_LEVEL as LoggingLevel) || 'info',
    },

    roots: {
      enabled: false,
    },
  });
  // Enregistrement des outils
  server.addTool(launchBrowserTool);
  server.addTool(listBrowsersTool);
  server.addTool(detectOpenBrowsersTool);
  server.addTool(closeBrowserTool);
  server.addTool(listTabsTool);
  server.addTool(selectTabTool);
  server.addTool(newTabTool);
  server.addTool(closeTabTool);
  server.addTool(navigateTool);
  server.addTool(screenshotTool);
  server.addTool(clickTool);
  server.addTool(typeTextTool);
  server.addTool(waitForTool);
  server.addTool(getHtmlTool);
  server.addTool(getConsoleLogsTool);
  server.addTool(evaluateScriptTool);
  server.addTool(listExternalBrowserTabsTool);

  logger.info(
    {
      tools: [
        launchBrowserTool,
        listBrowsersTool,
        detectOpenBrowsersTool,
        closeBrowserTool,
        listTabsTool,
        selectTabTool,
        newTabTool,
        closeTabTool,
        navigateTool,
        screenshotTool,
        clickTool,
        typeTextTool,
        waitForTool,
        getHtmlTool,
        getConsoleLogsTool,
        evaluateScriptTool,
        listExternalBrowserTabsTool,
      ].map((t) => t.name),
    },
    'Outils enregistrés avec succès.'
  );
  server.on('connect', (_event: { session: FastMCPSession<AuthData> }) => {
    logger.info('Nouvelle session client établie.');
  });
  server.on('disconnect', (event: { session: FastMCPSession<AuthData>; reason?: string }) => {
    logger.warn({ reason: event.reason || 'Non spécifiée' }, 'Session client déconnectée.');
  });
  try {
    await server.start({
      transportType: 'httpStream',
      httpStream: {
        port: config.PORT,
        endpoint: '/sse',
      },
    });
    logger.info(
      `🚀 Serveur FastMCP démarré et à l'écoute sur http://localhost:${config.PORT}${config.HTTP_STREAM_ENDPOINT}`
    );
  } catch (error) {
    logger.fatal({ err: getErrDetails(error) }, 'Échec critique lors du démarrage du serveur.');
    process.exit(1);
  }

  // Gestion de l'arrêt propre (Graceful Shutdown)
  const shutdown = async (signal: string) => {
    logger.warn(`Signal ${signal} reçu. Arrêt propre du serveur...`);
    try {
      await server.stop();
      logger.info('Serveur FastMCP arrêté avec succès.');
    } catch (e) {
      logger.error({ err: getErrDetails(e) }, "Erreur lors de l'arrêt du serveur.");
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// =============================================================================
// GESTION DES ERREURS GLOBALES ET LANCEMENT
// =============================================================================
process.on('uncaughtException', (err, origin) => {
  logger.fatal({ err: getErrDetails(err), origin }, `EXCEPTION NON CAPTURÉE. Arrêt forcé.`);
  if (config.NODE_ENV !== 'test') {
    process.exit(1);
  }
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: getErrDetails(reason) }, 'REJET DE PROMESSE NON GÉRÉ.');
});

// Lancement de l'application
applicationEntryPoint();
