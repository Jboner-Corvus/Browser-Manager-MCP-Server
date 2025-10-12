// src/utils/constants.ts

/**
 * Codes de couleur ANSI pour la journalisation thématique.
 * Utilisés pour améliorer la lisibilité des logs en console.
 */
export const ANSI_COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',
  LIGHT_BLUE: '\x1b[94m', // Ajout pour une différenciation
};

/**
 * Durée maximale de la trace de la pile (stack trace) dans les logs d'erreur.
 * Permet de limiter la verbosité tout en conservant des informations utiles.
 */
export const ERROR_STACK_TRACE_MAX_LENGTH = 250;

/**
 * Configuration par défaut pour le mécanisme de ping de FastMCP.
 */
export const DEFAULT_PING_OPTIONS = {
  enabled: true,
  intervalMs: 15000, // Augmenté pour moins de verbosité par défaut
  logLevel: 'debug' as const, // 'debug' est un LogLevel valide pour pino et FastMCP
};

/**
 * Configuration par défaut pour le health check de FastMCP.
 */
export const DEFAULT_HEALTH_CHECK_OPTIONS = {
  enabled: true,
  path: '/health', // Maintenu cohérent avec la configuration existante
  message: 'ok',
  status: 200,
};
