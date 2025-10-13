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
  connectExternalBrowserTool,
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
  browserSnapshotTool,
} from './tools/browserTools.js';
import { pdfTools } from './tools/pdfTools.js';
import { visionTools } from './tools/visionTools.js';
import {
  CapabilityManager,
  createCapabilityManagerFromArgs,
  Capability,
} from './capabilities/index.js';
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

  // Initialiser le gestionnaire de capacités
  const capabilityManager = new CapabilityManager();

  // Parser les arguments de ligne de commande pour les capacités
  const processArgs = process.argv.slice(2);
  const requestedCapabilities = createCapabilityManagerFromArgs(processArgs);

  // Utiliser le gestionnaire de capacités avec les arguments
  const activeCapabilityManager =
    requestedCapabilities.getEnabledCapabilities().length > 0
      ? requestedCapabilities
      : capabilityManager;

  const server = new FastMCP<AuthData>({
    name: 'MCP-Server-Production',
    version: '2.1.0',
    authenticate: authHandler,
    instructions:
      "Serveur MCP amélioré avec catégories d'outils et capacités modulaires. Support PDF, Vision, Performance, Réseau. Transport HTTP Stream.",

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

  // Enregistrement des outils de base
  const baseTools = [
    launchBrowserTool,
    listBrowsersTool,
    detectOpenBrowsersTool,
    connectExternalBrowserTool,
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
    browserSnapshotTool,
  ];

  // Ajouter les outils de base
  baseTools.forEach((tool) => server.addTool(tool));

  // Ajouter les outils des capacités activées
  const enabledTools = [...baseTools];

  // Capacité PDF
  if (activeCapabilityManager.isCapabilityEnabled(Capability.PDF)) {
    pdfTools.forEach((tool) => {
      // Type assertion pour éviter les erreurs de compatibilité de types
      server.addTool(tool as any);
    });
    enabledTools.push(...pdfTools);
    logger.info('Capacité PDF activée - Outils PDF enregistrés');
  }

  // Capacité Vision
  if (activeCapabilityManager.isCapabilityEnabled(Capability.VISION)) {
    visionTools.forEach((tool) => server.addTool(tool));
    enabledTools.push(...visionTools);
    logger.info('Capacité Vision activée - Outils de vision enregistrés');
  }

  const allTools = enabledTools;

  logger.info(
    {
      tools: allTools.map((t) => t.name),
      totalTools: allTools.length,
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
    // FORCER HTTP Stream comme mode par défaut absolu
    // Mode HTTP Stream (défaut) - supporte SSE et stdio
    await server.start({
      transportType: 'httpStream',
      httpStream: {
        port: config.PORT,
        endpoint: '/mcp',
      },
    });
    logger.info(
      `🚀 Serveur FastMCP démarré en mode HTTP Stream par défaut sur http://localhost:${config.PORT}/mcp (SSE: /sse)`
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
