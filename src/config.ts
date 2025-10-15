// src/config.ts (Simplifié)

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import dotenv from 'dotenv';
import { z } from 'zod';

import { DEFAULT_HEALTH_CHECK_OPTIONS } from './utils/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement depuis le fichier .env à la racine du projet, sauf en mode test
if (process.env.NODE_ENV !== 'test') {
  // Essayer d'abord le répertoire du projet, puis le répertoire de l'utilisateur
  const projectEnvPath = path.resolve(__dirname, '..', '.env');
  const userEnvPath = path.resolve(process.cwd(), '.env');

  // Charger depuis le répertoire du projet si disponible, sinon depuis le répertoire utilisateur
  if (fs.existsSync(projectEnvPath)) {
    dotenv.config({ path: projectEnvPath });
  } else if (fs.existsSync(userEnvPath)) {
    dotenv.config({ path: userEnvPath });
  } else {
    // Pas de fichier .env trouvé, utiliser les valeurs par défaut
    console.log('ℹ️ Aucun fichier .env trouvé, utilisation des valeurs par défaut.');
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8081),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  HTTP_STREAM_ENDPOINT: z.string().startsWith('/').default('/mcp'),
  AUTH_TOKEN: z.string().optional().default('browser-manager-mcp-server-default-token-2024'),
  REQUIRE_AUTH: z.coerce.boolean().default(false),
  HEALTH_CHECK_PATH: z
    .string()
    .startsWith('/')
    .default(DEFAULT_HEALTH_CHECK_OPTIONS.path)
    .describe("Chemin pour le point de terminaison de vérification de l'état."),
  // Les variables FASTMCP_SOURCE et FASTMCP_REMOTE_VERSION ont été retirées.
});

export type Config = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Variables d'environnement invalides détectées dans .env:");
  for (const error of parsedEnv.error.issues) {
    console.error(`  - Champ: ${error.path.join('.') || 'global'}, Problème: ${error.message}`);
  }
  console.error("Veuillez corriger les variables d'environnement et redémarrer l'application.");
  process.exit(1);
}

export const config = parsedEnv.data;

// Vérification de sécurité critique pour AUTH_TOKEN en production
if (
  config.NODE_ENV === 'production' &&
  (!config.AUTH_TOKEN ||
    config.AUTH_TOKEN === 'browser-manager-mcp-server-default-token-2024' ||
    config.AUTH_TOKEN.length < 16)
) {
  console.warn(
    'ATTENTION : AUTH_TOKEN utilise une valeur par défaut en environnement de PRODUCTION.'
  );
  console.warn(
    'Pour une sécurité optimale, définissez un AUTH_TOKEN personnalisé dans votre fichier .env.'
  );
}
