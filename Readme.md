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
   # Clonez uniquement le dossier dist (nécessite git)
   git clone --depth 1 --filter=blob:none --sparse https://github.com/Jboner-Corvus/Browser-Manager-MCP-Server.git
   cd Browser-Manager-MCP-Server
   git sparse-checkout set dist
   cd dist
   ```
   Ou téléchargez l'archive complète : `Invoke-WebRequest -Uri "https://github.com/Jboner-Corvus/Browser-Manager-MCP-Server/archive/refs/heads/main.zip" -OutFile "Browser-Manager-MCP-Server.zip"` puis extrayez et allez dans `Browser-Manager-MCP-Server-main\dist`.

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

### 🔧 Lancement des Navigateurs en Mode Debug

Pour permettre au serveur MCP de détecter et contrôler les navigateurs existants avec leurs URL exactes, vous devez les lancer en mode debugging distant.

#### Pourquoi le mode Debug est nécessaire ?

- **Sans debug** : Le MCP ne peut qu'estimer le nombre d'onglets (méthode alternative)
- **Avec debug** : Le MCP peut accéder aux URL exactes, titres et contrôler complètement les onglets

#### Commandes pour lancer les navigateurs en mode Debug (Windows) :

**Google Chrome :**
```cmd
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
```

**Brave Browser :**
```cmd
start "" "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9223 --user-data-dir="C:\temp\brave-debug"
```

**Microsoft Edge :**
```cmd
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9224 --user-data-dir="C:\temp\edge-debug"
```

**Chromium :**
```cmd
start "" "C:\Program Files\Chromium\Application\chromium.exe" --remote-debugging-port=9225 --user-data-dir="C:\temp\chromium-debug"
```


#### Vérification du mode Debug :

Après avoir lancé un navigateur avec les commandes ci-dessus, ouvrez dans votre navigateur :
```
http://localhost:9222/json
```

Si vous voyez une page JSON avec des informations sur les onglets, le mode debug est bien activé !


#### Notes importantes :

- Les navigateurs lancés **par le serveur MCP** sont automatiquement en mode debug
- Les navigateurs **existants** doivent être relancés avec les commandes ci-dessus pour être détectés complètement
- L'option `--user-data-dir` crée un profil séparé pour éviter les conflits avec votre navigateur normal

### Endpoints API

- **Serveur MCP** : `http://localhost:8081/mcp`
  - Protocole : HTTP Streaming
  - Authentification : Bearer Token (si configuré)
