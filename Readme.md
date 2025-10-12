# Browser Manager MCP Server - Development

<div align="center">
  <h1><font color="#2ECC71">Browser Manager MCP Server</font></h1>
  <p><strong>Serveur MCP pour la gestion et l'automatisation des navigateurs web.</strong></p>
  <p>Propulsé par Playwright, FastMCP et TypeScript.</p>
  <p>
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="[Image du logo Node.js]">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="[Image du logo TypeScript]">
    <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="[Image du logo Playwright]">
    <img src="https://img.shields.io/badge/FastMCP-FF6B35?style=for-the-badge&logo=fastapi&logoColor=white" alt="[Image du logo FastMCP]">
  </p>
</div>

---

## 🚀 <font color="#E74C3C">Mode Développement</font>

Ce fichier contient les instructions spécifiques pour le développement et le debugging du serveur MCP.

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
