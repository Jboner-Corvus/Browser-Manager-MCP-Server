<div align="center">
  <h1>Browser Manager MCP Server</h1>

  <p><strong>Browser Manager MCP Server est un serveur MCP (Model Context Protocol) dédié à la gestion et à l'automatisation des navigateurs web.</strong></p>
  
  <p>Il offre une interface complète pour contrôler les navigateurs, gérer les onglets, interagir avec les pages web et exécuter des tâches d'automatisation. Il s'agit d'une combinaison élégante des outils de Google et de Microsoft, libre et flexible pour naviguer facilement dans n'importe quel navigateur et sur n'importe quel onglet.</p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright">
    <img src="https://img.shields.io/badge/FastMCP-FF6B35?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastMCP">
  </p>
</div>

---

## Fonctionnalités

- Gestion complète des navigateurs (lancement, fermeture, détection)
- Manipulation des onglets (liste, création, fermeture, navigation)
- Automatisation des interactions web (clics, saisie de texte, captures d'écran)
- Streaming HTTP pour les communications en temps réel
- Authentification optionnelle via token Bearer

## 🛠️ Outils Disponibles

Le serveur browser-manager-mcp-server fournit les outils suivants :

### Gestion des Navigateurs
- `launch_browser` - Lance un nouveau navigateur
- `list_browsers` - Liste tous les navigateurs (gérés et externes) avec leurs onglets
- `close_browser` - Ferme un navigateur
- `detect_open_browsers` - Détecte les navigateurs ouverts sur le système

### Gestion des Onglets
- `list_tabs` - Liste les onglets ouverts
- `select_tab` - Sélectionne un onglet
- `new_tab` - Ouvre un nouvel onglet
- `close_tab` - Ferme un onglet

### Navigation et Interaction
- `navigate` - Navigue vers une URL
- `click` - Clique sur un élément
- `type_text` - Tape du texte dans un champ
- `wait_for` - Attend du texte ou un délai

### Analyse et Capture
- `get_html` - Récupère le HTML de la page
- `get_console_logs` - Récupère les logs console
- `screenshot` - Prend une capture d'écran
- `evaluate_script` - Exécute du JavaScript

### Outils Avancés

---

## Prérequis

- **Node.js** : Version 24.0.2 ou supérieure
- **npm** : Version 11.3.0 ou supérieure (recommandé)

## Installation

0. **Téléchargement du projet** :

   ```powershell
   # clonez le dépôt complet
   git clone https://github.com/Jboner-Corvus/Browser-Manager-MCP-Server.git
   # Entrez dans le dossier dist
   cd "Browser-Manager-MCP-Server\dist"
   ```

1. **Installation des dépendances** :
   ```bash
   npm install --production
   ```

2. **Configuration de l'environnement** :
   - Le fichier `.env` est déjà présent avec les valeurs par défaut
   - Modifiez les variables d'environnement dans `.env` selon vos besoins si nécessaire


## Démarrage

### Méthode recommandée (Windows)

Utilisez le script PowerShell fourni :

```powershell
.\start-prod.ps1
```

### Démarrage manuel

```bash
node server.js
```

## Utilisation

### 🔌 Installation de l'Extension Browser Manager MCP Bridge

Pour contrôler les navigateurs externes (déjà ouverts), vous devez installer l'extension Chrome incluse.

#### Installation de l'extension :

L'extension est déjà compilée et empaquetée. Pour l'installer :

1. **Téléchargez l'extension** :
   - Utilisez le fichier `dist/browser-manager-extension.zip`

2. **Installez dans Chrome/Brave** :
   - Ouvrez Chrome/Brave et allez à `chrome://extensions/`
   - Activez le "Mode développeur" (en haut à droite)
   - Glissez-déposez le fichier `.zip` dans la page des extensions
   - L'extension devrait s'installer automatiquement

3. **Vérifiez l'installation** :
   - L'icône de l'extension devrait apparaître dans la barre d'outils
   - Cliquez dessus pour ouvrir l'interface de connexion

#### Utilisation de l'extension :

- L'extension permet de connecter le serveur MCP aux navigateurs externes
- Elle utilise un WebSocket relay sur le port 8082
- Supporte Brave, Chrome, Edge et autres navigateurs Chromium

#### Test de l'extension :

Pour vérifier que l'extension fonctionne correctement :

1. **Démarrez le serveur MCP** avec `.\start-prod.ps1`
2. **Ouvrez un navigateur** (Brave, Chrome, etc.) avec quelques onglets
3. **Cliquez sur l'icône de l'extension** dans la barre d'outils
4. **Sélectionnez un onglet** à contrôler depuis l'interface
5. **Testez avec un client MCP** (Claude Desktop, etc.) en utilisant les outils comme `list_external_browser_tabs`

**Indicateurs de bon fonctionnement :**
- ✅ L'icône de l'extension affiche un badge vert "✓" sur l'onglet connecté
- ✅ Les outils MCP peuvent lister et contrôler les onglets externes
- ✅ Aucune erreur dans la console développeur de l'extension
- ✅ Le WebSocket relay (port 8082) est accessible

### Endpoints API

Le serveur MCP fonctionne avec FastMCP 3.19.1 et propose deux endpoints principaux :

- **Endpoint MCP principal** : `http://localhost:8081/mcp`
  - Protocole : HTTP Stream (JSON-RPC)
  - Usage : Communication directe avec le protocole MCP
  - Authentification : Bearer Token (si configuré)

- **Endpoint SSE** : `http://localhost:8081/sse`
  - Protocole : Server-Sent Events (Streaming)
  - Usage : Connexions en temps réel et streaming
  - Authentification : Bearer Token (si configuré)

### Modes de Transport

Le serveur supporte trois modes de transport :

1. **HTTP Stream (par défaut)** : `node lib/server.js`
   - Endpoint principal : `/mcp`
   - Endpoint SSE : `/sse`
   - Idéal pour les applications web et APIs

2. **Mode stdio** : `MCP_TRANSPORT=stdio node lib/server.js`
   - Usage : Intégration avec les clients MCP (Qoder, Claude Desktop, etc.)
   - Communication via entrée/sortie standard

3. **Mode SSE** : `MCP_TRANSPORT=sse node lib/server.js`
   - Endpoint : `/mcp` (redirige vers le streaming SSE)
   - Usage : Applications nécessitant du streaming pur
