# 🌐 Browser Manager MCP Server

<div align="center">
  <h1>Browser Manager MCP Server</h1>
  <p><strong>Serveur MCP (Model Context Protocol) spécialisé dans la gestion et l'automatisation des navigateurs web</strong></p>
  <p>Une combinaison élégante des outils de Google et Microsoft, LIBRE de naviguer dans n'importe quel navigateur et sur n'importe quel onglet facilement.</p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright">
    <img src="https://img.shields.io/badge/FastMCP-FF6B35?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastMCP">
  </p>

  <p>
    <a href="https://github.com/Jboner-Corvus/Browser-Manager-MCP-Server">📖 Documentation</a> •
    <a href="https://github.com/Jboner-Corvus/Browser-Manager-MCP-Server/issues">🐛 Signaler un bug</a> •
    <a href="https://github.com/Jboner-Corvus/Browser-Manager-MCP-Server/discussions">💬 Discussions</a>
  </p>
</div>

---

## ✨ Description

Browser Manager MCP Server est un serveur MCP (Model Context Protocol) spécialisé dans la gestion et l'automatisation des navigateurs web. Il fournit une interface complète pour contrôler les navigateurs, gérer les onglets, interagir avec les pages web et effectuer des tâches d'automatisation.

### 🚀 Fonctionnalités Clés

- **🔍 Détection automatique** des navigateurs ouverts sur le système
- **🎯 Contrôle précis** des onglets et fenêtres
- **📸 Capture d'écran** haute qualité
- **⚡ Automatisation** des interactions web
- **🔒 Authentification sécurisée** avec tokens Bearer
- **📊 Monitoring** et logging avancés
- **🔄 Architecture asynchrone** avec file d'attente Redis/BullMQ

### 🛠️ Technologies Utilisées

- **FastMCP** : Framework MCP moderne
- **Playwright** : Automatisation navigateur cross-platform
- **TypeScript** : Développement typé et robuste
- **Node.js** : Runtime JavaScript performant
- **Redis/BullMQ** : File d'attente et tâches asynchrones

---

## 🛠️ Outils Disponibles

Le serveur browser-manager-mcp-server fournit les outils suivants :

### Gestion des Navigateurs
- `launch_browser` - Lance un nouveau navigateur
- `list_browsers` - Liste les navigateurs gérés
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
- `list_external_browser_tabs` - Liste les onglets des navigateurs externes

---

## 📦 Installation

### Prérequis

- **Node.js** >= 24.0.2
- **Docker** et Docker Compose (optionnel)
- **Navigateurs** : Chrome, Firefox, Safari, Edge (pour les tests)

### Installation Rapide

```bash
# Cloner le dépôt
git clone https://github.com/Jboner-Corvus/Browser-Manager-MCP-Server.git
cd Browser-Manager-MCP-Server

# Installer les dépendances
pnpm install

# Copier la configuration
cp .env.example .env
# Éditer .env avec vos paramètres

# Build du projet
pnpm run build
```


---

## 🚀 Utilisation

### Configuration

Éditez le fichier `.env` :

```env
# Serveur
HOST_PORT=8081
PORT=8081
HTTP_STREAM_ENDPOINT=/sse

# Authentification
AUTH_TOKEN=votre_token_sécurisé_ici
REQUIRE_AUTH=false

# Redis (optionnel pour les tâches async)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=votre_mot_de_passe
```

### Lancement

```bash
# Mode développement
pnpm run dev

# Production
pnpm start

# Avec Docker
docker compose up -d
```

### Connexion MCP

Le serveur expose l'endpoint `/sse` sur le port 8081.

**Configuration client MCP :**
- Transport : HTTP Stream
- URL : `http://localhost:8081/sse`
- Authentification : Bearer Token (si activé)

---

## 🔗 Projets Similaires

- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) - Outils Chrome DevTools
- [Playwright MCP](https://github.com/microsoft/playwright-mcp) - Automatisation Playwright

---

## 📊 Métriques

- ✅ **TypeScript** : Code entièrement typé
- ✅ **Tests** : Suite de tests complète
- ✅ **Linting** : Code propre et standardisé
- ✅ **CI/CD** : Intégration continue

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir le guide de contribution pour plus de détails.

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📄 Licence

Ce projet est sous licence ISC.

---

<div align="center">
  <p><strong>Fait avec ❤️ pour la communauté MCP</strong></p>
  <p>
    <a href="https://github.com/Jboner-Corvus/Browser-Manager-MCP-Server/stargazers">⭐ Stars</a> •
    <a href="https://github.com/Jboner-Corvus/Browser-Manager-MCP-Server/network/members">🍴 Forks</a> •
    <a href="https://github.com/Jboner-Corvus/Browser-Manager-MCP-Server/issues">🐛 Issues</a>
  </p>
</div>

## 🔧 <font color="#3498DB">Installation des dépendances</font>

```bash
npm install
pnpm install
```

## 🏃 <font color="#3498DB">Lancement du serveur de développement</font>

```bash
npm run dev
# ou
pnpm run dev
```

Le serveur démarre avec rechargement automatique et support du debugging.

---

## 🔍 <font color="#E74C3C">Lancement des Navigateurs en Mode Debugging Distant</font>

Pour le développement et les tests, vous devez lancer les navigateurs avec le mode debugging distant activé.

### 📋 <font color="#F39C12">Étape 1 : Fermer les navigateurs existants</font>

```powershell
# Fermer tous les navigateurs Chrome/Brave/Edge
taskkill /F /IM chrome.exe
taskkill /F /IM brave.exe
taskkill /F /IM msedge.exe
```

### 🚀 <font color="#27AE60">Étape 2 : Lancer en mode debugging</font>

#### **Google Chrome**
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
```

#### **Brave Browser**
```powershell
& "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9223 --user-data-dir="C:\temp\brave-debug"
```

#### **Microsoft Edge**
```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9224 --user-data-dir="C:\temp\edge-debug"
```

#### **Mozilla Firefox**
```powershell
& "C:\Program Files\Mozilla Firefox\firefox.exe" --start-debugger-server 6000 --remote-debugging-port=6000
```

### 📝 <font color="#3498DB">Points importants des commandes</font>

- `--remote-debugging-port=XXXX` : Port d'écoute (différent par navigateur pour éviter les conflits)
- `--user-data-dir="C:\temp\[browser]-debug"` : Profil temporaire pour éviter les conflits
- `&` : Opérateur PowerShell nécessaire pour les chemins avec espaces
- **Ports recommandés** : Chrome 9222, Brave 9223, Edge 9224, Firefox 6000

### ✅ <font color="#27AE60">Étape 3 : Vérifier le debugging</font>

#### **Interface graphique**
Ouvrez dans le navigateur :
- Chrome : `chrome://inspect`
- Brave : `brave://inspect`
- Edge : `edge://inspect`

Vous devriez voir votre navigateur dans "Remote Target".

#### **Ligne de commande**
```powershell
curl http://localhost:9222/json/list
# Pour Chrome - retourne un JSON avec les onglets actifs
```

#### **PowerShell**
```powershell
Test-NetConnection -ComputerName localhost -Port 9222
# Doit montrer "TcpTestSucceeded : True"
```

---

## 🛠️ <font color="#3498DB">Tests et Validation</font>

### <font color="#3498DB">Test des outils MCP</font>

Lancez l'inspecteur MCP :
```bash
npx @modelcontextprotocol/inspector
```

Configuration :
- Sélectionnez `Streamable HTTP`
- URL : `http://localhost:8081/sse`
- Authentification : Aucune

### <font color="#3498DB">Exemples de tests</font>

```javascript
// Lister les navigateurs externes
await list_external_browser_tabs();

// Tester un navigateur spécifique
await list_external_browser_tabs({ browserName: "brave" });

// Lancer un navigateur géré
await launch_browser({ headless: false });

// Interagir avec la page
await navigate({ url: "https://github.com" });
await screenshot({ fullPage: true });
```

---

## 🔧 <font color="#3498DB">Développement des outils</font>

### <font color="#3498DB">Structure du projet</font>

```
src/
├── tools/
│   └── browserTools.ts    # Outils de navigation
├── server.ts               # Serveur MCP principal
├── worker.ts               # Worker pour les tâches async
├── config.ts               # Configuration
└── types.ts                # Types TypeScript
```

### <font color="#3498DB">Ajouter un nouvel outil</font>

1. Créer la fonction de l'outil dans `src/tools/browserTools.ts`
2. Exporter l'outil avec la structure requise
3. Ajouter l'outil au serveur dans `src/server.ts`
4. Tester avec l'inspecteur MCP

### <font color="#3498DB">Debugging du serveur</font>

```bash
# Mode développement avec debugging
npm run dev:debug

# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration
```

---

## 🐛 <font color="#3498DB">Build et Production</font>

```bash
# Build pour production
npm run build

# Lancement en production
node dist/server.js
```

---

## 📊 <font color="#3498DB">Monitoring et Logs</font>

Le serveur utilise Winston pour les logs avec différents niveaux :
- `INFO` : Informations générales
- `WARN` : Avertissements
- `ERROR` : Erreurs
- `DEBUG` : Informations de debugging

Les logs sont affichés dans la console et peuvent être configurés dans `src/logger.ts`.

---

## 🤝 <font color="#3498DB">Contribution</font>

### <font color="#3498DB">Flux de travail</font>

1. Forker le dépôt
2. Créer une branche : `git checkout -b feature/nouvelle-fonctionnalite`
3. Commiter les changements : `git commit -m "Ajout de la nouvelle fonctionnalité"`
4. Pusher : `git push origin feature/nouvelle-fonctionnalite`
5. Créer une Pull Request

### <font color="#3498DB">Normes de code</font>

- Utiliser TypeScript strict
- Suivre les standards ESLint
- Ajouter des tests pour les nouvelles fonctionnalités
- Documenter les changements dans les commentaires

---

## 🔍 <font color="#E74C3C">Dépannage Commun</font>

### <font color="#F39C12">Problème : Debugging distant ne fonctionne pas</font>

1. **Vérifier les ports** : `netstat -ano | findstr :922`
2. **Tester la connexion** : `curl http://localhost:9222/json/list`
3. **Vérifier les processus** : `tasklist | findstr brave`

### <font color="#F39C12">Problème : Serveur ne démarre pas</font>

1. **Vérifier Node.js** : `node --version` (doit être >= 18)
2. **Vérifier les dépendances** : `npm ls`
3. **Vérifier le port** : `netstat -ano | findstr 8081`

### <font color="#F39C12">Problème : Outils MCP non disponibles</font>

1. **Redémarrer le serveur** : `Ctrl+C` puis `npm run dev`
2. **Vérifier la connexion** : Tester avec l'inspecteur MCP
3. **Checker les logs** : Regarder les messages d'erreur dans la console

---

## 📚 <font color="#3498DB">Ressources</font>

- [Documentation FastMCP](https://modelcontextprotocol.io/)
- [Documentation Playwright](https://playwright.dev/)
- [Documentation TypeScript](https://www.typescriptlang.org/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

---

## 🎯 <font color="#27AE60">Prochaines Étapes</font>

- [ ] Ajouter le support des extensions de navigateur
- [ ] Implémenter le monitoring en temps réel
- [ ] Ajouter des templates de tests automatisés
- [ ] Créer une interface web de monitoring
