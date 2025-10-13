# Browser Manager MCP Extension

Cette extension Chrome permet de connecter le serveur Browser Manager MCP aux navigateurs existants, permettant ainsi à l'IA d'interagir avec des onglets déjà ouverts et authentifiés.

## Fonctionnalités

- **Connexion aux onglets existants** : Accès aux sessions utilisateur authentifiées
- **Interface utilisateur intuitive** : Sélection d'onglets et gestion des connexions
- **Authentification sécurisée** : Tokens d'authentification pour éviter les connexions non autorisées
- **Badge visuel** : Indicateur de connexion active sur les onglets
- **Timeout automatique** : Gestion des connexions inactives

## Installation

### Prérequis
- Chrome, Edge ou Brave
- Node.js 18+

### Étapes d'installation

1. **Construire l'extension** :
   ```bash
   cd Browser-Manager-MCP-Server-dist/extension
   npm install
   npm run build
   ```

2. **Charger l'extension** :
   - Ouvrir `chrome://extensions/`
   - Activer le "Mode développeur"
   - Cliquer sur "Charger l'extension non empaquetée"
   - Sélectionner le dossier `Browser-Manager-MCP-Server-dist/extension/dist`

3. **Configurer le serveur MCP** :
   Dans votre configuration MCP, ajouter :
   ```json
   {
     "mcpServers": {
       "browser-manager": {
         "command": "node",
         "args": ["path/to/Browser-Manager-MCP-Server-dist/dist/index.js"],
         "env": {
           "EXTENSION_MODE": "true"
         }
       }
     }
   }
   ```

## Utilisation

1. **Démarrer le serveur MCP** avec l'option extension
2. **Cliquer sur l'icône de l'extension** pour voir le statut
3. **Sélectionner un onglet** quand l'IA demande l'accès
4. **Approuver ou rejeter** la connexion selon vos préférences

## Architecture

### Composants principaux

- **Background Script** (`background.ts`) : Gestion des connexions WebSocket et communication CDP
- **Relay Connection** (`relayConnection.ts`) : Transmission des commandes CDP
- **Interface UI** (`src/ui/`) : Interface utilisateur React pour la sélection d'onglets
- **Authentification** : Système de tokens pour sécuriser les connexions

### Flux de fonctionnement

1. Serveur MCP → Extension (WebSocket)
2. Extension → Navigateur (Chrome DevTools Protocol)
3. Actions utilisateur → Interface React
4. Résultats → Serveur MCP

## Sécurité

- **Permissions minimales** : Seulement les permissions nécessaires (debugger, tabs, storage)
- **Authentification** : Tokens générés automatiquement pour chaque session
- **Isolation** : Chaque connexion est isolée par onglet
- **Timeout** : Protection contre les connexions abandonnées

## Développement

### Structure du projet
```
extension/
├── src/
│   ├── background.ts          # Script d'arrière-plan
│   ├── relayConnection.ts     # Connexion relais CDP
│   └── ui/                    # Interface utilisateur
│       ├── connect.tsx        # Page de connexion
│       ├── status.tsx         # Page de statut
│       ├── tabItem.tsx        # Composant onglet
│       ├── authToken.tsx      # Gestion des tokens
│       └── copyToClipboard.tsx # Copie vers presse-papiers
├── dist/                      # Fichiers compilés
├── manifest.json              # Manifest de l'extension
├── package.json               # Configuration npm
├── tsconfig.json              # Configuration TypeScript
└── vite.config.mts            # Configuration Vite
```

### Scripts disponibles
- `npm run build` : Construction complète
- `npm run build:ui` : Construction de l'interface utilisateur
- `npm run build:sw` : Construction du service worker
- `npm run watch` : Surveillance des changements
- `npm run test` : Tests Playwright

## Dépannage

### Problèmes courants

1. **Extension ne se charge pas** :
   - Vérifier que le mode développeur est activé
   - Vérifier les erreurs dans la console des extensions

2. **Connexion CDP échoue** :
   - Vérifier que le navigateur a le debugging activé
   - Vérifier les ports disponibles (9222-9230)

3. **Interface UI ne s'affiche pas** :
   - Vérifier que les fichiers sont correctement compilés
   - Vérifier les erreurs dans la console du navigateur

### Logs de débogage

L'extension produit des logs détaillés dans :
- Console des extensions Chrome (`chrome://extensions/`)
- Console du service worker
- Console des pages d'interface

## Contribution

Cette extension est basée sur l'architecture de Playwright MCP mais adaptée pour Browser Manager MCP avec des améliorations spécifiques :

- Interface utilisateur améliorée
- Gestion d'authentification plus robuste
- Support multi-navigateurs étendu
- Architecture modulaire pour faciliter la maintenance

## Licence

Apache License 2.0