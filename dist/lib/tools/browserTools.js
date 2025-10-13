// src/tools/browserTools.ts
import { z } from 'zod';
import { chromium, firefox, webkit, } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
// Global state
export const browsers = new Map();
export const contexts = new Map();
export const pages = new Map();
export const consoleLogs = new Map();
export let currentContextId = null;
export let currentPageId = null;
// Tool: launch_browser_with_auto_port
export const launchBrowserWithAutoPortTool = {
    name: 'launch_browser_with_auto_port',
    description: 'Lance un navigateur avec gestion automatique des ports pour éviter les conflits',
    parameters: z.object({
        headless: z
            .boolean()
            .optional()
            .default(false)
            .describe('Exécuter le navigateur en mode headless'),
        browser: z
            .enum(['chromium', 'firefox', 'webkit', 'brave'])
            .optional()
            .default('brave')
            .describe('Type de navigateur'),
        startPort: z
            .number()
            .optional()
            .default(9222)
            .describe('Port de départ pour la recherche de port disponible'),
    }),
    execute: async (args, _context) => {
        try {
            const { headless, browser: browserType, startPort } = args;
            // Trouver un port disponible automatiquement
            const debugPort = await findAvailableDebugPort(startPort);
            // Configuration du débogage distant pour tous les navigateurs
            const launchOptions = {
                headless,
                args: [
                    `--remote-debugging-port=${debugPort}`,
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                ],
            };
            // Configuration spécifique pour Chromium/Chrome/Brave
            if (browserType === 'chromium' || browserType === 'brave') {
                launchOptions.args.push('--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--disable-gpu', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding');
            }
            const browser = await (browserType === 'chromium' || browserType === 'brave'
                ? chromium
                : browserType === 'firefox'
                    ? firefox
                    : webkit).launch(launchOptions);
            const context = await browser.newContext();
            const page = await context.newPage();
            const browserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const contextId = `context_${browserId}`;
            const pageId = `page_${contextId}_0`;
            browsers.set(browserId, browser);
            contexts.set(contextId, context);
            pages.set(pageId, page);
            currentContextId = contextId;
            currentPageId = pageId;
            // Setup console logging
            consoleLogs.set(pageId, []);
            page.on('console', (msg) => {
                const logs = consoleLogs.get(pageId) || [];
                logs.push({
                    type: msg.type(),
                    text: msg.text(),
                    timestamp: Date.now(),
                });
                consoleLogs.set(pageId, logs);
            });
            return `Navigateur lancé avec succès ! ID: ${browserId}, Port de debugging: ${debugPort}, Contexte: ${contextId}, Page: ${pageId}`;
        }
        catch (error) {
            throw new Error(`Erreur lors du lancement du navigateur: ${error.message}`);
        }
    },
};
// Tool: launch_browser (original)
export const launchBrowserTool = {
    name: 'launch_browser',
    description: 'Lance un nouveau navigateur',
    parameters: z.object({
        headless: z
            .boolean()
            .optional()
            .default(true)
            .describe('Exécuter le navigateur en mode headless'),
        browser: z
            .enum(['chromium', 'firefox', 'webkit', 'brave'])
            .optional()
            .default('brave')
            .describe('Type de navigateur'),
    }),
    execute: async (args, _context) => {
        const { headless, browser: browserType } = args;
        // Configuration du débogage distant pour tous les navigateurs
        const launchOptions = {
            headless,
            args: [
                '--remote-debugging-port=9222',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
            ],
        };
        // Configuration spécifique pour Chromium/Chrome/Brave
        if (browserType === 'chromium' || browserType === 'brave') {
            launchOptions.args.push('--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--disable-gpu', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding');
        }
        const browser = await (browserType === 'chromium' || browserType === 'brave'
            ? chromium
            : browserType === 'firefox'
                ? firefox
                : webkit).launch(launchOptions);
        const context = await browser.newContext();
        const page = await context.newPage();
        const browserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const contextId = `context_${browserId}`;
        const pageId = `page_${contextId}_0`;
        browsers.set(browserId, browser);
        contexts.set(contextId, context);
        pages.set(pageId, page);
        currentContextId = contextId;
        currentPageId = pageId;
        // Setup console logging
        consoleLogs.set(pageId, []);
        page.on('console', (msg) => {
            const logs = consoleLogs.get(pageId) || [];
            logs.push({
                type: msg.type(),
                text: msg.text(),
                timestamp: Date.now(),
            });
            consoleLogs.set(pageId, logs);
        });
        return `Navigateur lancé. ID: ${browserId}, Contexte: ${contextId}, Page: ${pageId}`;
    },
};
// Tool: list_browsers
export const listBrowsersTool = {
    name: 'list_browsers',
    description: 'Liste tous les navigateurs (gérés et externes) avec leurs onglets',
    parameters: z.object({}),
    execute: async (_args, _context) => {
        const managedBrowsers = Array.from(browsers.keys()).map((id) => ({
            id,
            type: 'managed',
            tabs: [],
        }));
        // Detect external browsers
        const externalBrowsers = [];
        try {
            const browserProcesses = [
                'chrome.exe',
                'chromium.exe',
                'brave.exe',
                'msedge.exe',
                'firefox.exe',
            ];
            for (const browser of browserProcesses) {
                try {
                    const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${browser}" /FO CSV`);
                    const lines = stdout.trim().split('\n');
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line && line !== '"No tasks are running"') {
                            const parts = line.split(',');
                            if (parts.length >= 2) {
                                const name = parts[0].replace(/"/g, '');
                                const pid = parts[1].replace(/"/g, '');
                                const type = getBrowserType(name);
                                // For browsers without debugging enabled, don't try to fetch tabs
                                // This avoids "fetch failed" errors and improves performance
                                let tabs = [];
                                // Note: tabs will be empty for browsers without remote debugging enabled
                                // Users should use the extension to connect to such browsers
                                externalBrowsers.push({
                                    id: `${type}_${pid}`,
                                    type: 'external',
                                    process: name,
                                    pid,
                                    browserType: type,
                                    tabs,
                                });
                            }
                        }
                    }
                }
                catch {
                    continue;
                }
            }
        }
        catch {
            // Ignore errors in external browser detection
        }
        const allBrowsers = [...managedBrowsers, ...externalBrowsers];
        return JSON.stringify(allBrowsers, null, 2);
    },
};
// Gestionnaire de ports automatique avec système de verrouillage
class PortManager {
    static instance;
    usedPorts = new Set();
    portLocks = new Map(); // port -> timestamp
    static getInstance() {
        if (!PortManager.instance) {
            PortManager.instance = new PortManager();
        }
        return PortManager.instance;
    }
    async findAvailableDebugPort(startPort = 9222) {
        const maxPort = startPort + 100; // Essayer jusqu'à 100 ports
        const currentTime = Date.now();
        // Nettoyer les verrous expirés (plus de 5 minutes)
        for (const [port, timestamp] of this.portLocks.entries()) {
            if (currentTime - timestamp > 5 * 60 * 1000) {
                this.portLocks.delete(port);
                this.usedPorts.delete(port);
            }
        }
        for (let port = startPort; port <= maxPort; port++) {
            if (this.usedPorts.has(port))
                continue;
            try {
                // Vérifier si le port est disponible
                const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
                if (!stdout.includes(`:${port}`)) {
                    // Port disponible, le marquer comme utilisé
                    this.usedPorts.add(port);
                    this.portLocks.set(port, currentTime);
                    return port;
                }
            }
            catch {
                // Si netstat échoue, considérer le port comme disponible
                this.usedPorts.add(port);
                this.portLocks.set(port, currentTime);
                return port;
            }
        }
        // Si aucun port n'est disponible, retourner un port au hasard dans une plage élevée
        const fallbackPort = 9200 + Math.floor(Math.random() * 100);
        this.usedPorts.add(fallbackPort);
        this.portLocks.set(fallbackPort, currentTime);
        return fallbackPort;
    }
    releasePort(port) {
        this.usedPorts.delete(port);
        this.portLocks.delete(port);
    }
    getUsedPorts() {
        return Array.from(this.usedPorts);
    }
}
// Fonction utilitaire pour trouver un port de debugging disponible
async function findAvailableDebugPort(startPort = 9222) {
    const portManager = PortManager.getInstance();
    return await portManager.findAvailableDebugPort(startPort);
}
// Tool: connect_external_browser
export const connectExternalBrowserTool = {
    name: 'connect_external_browser',
    description: 'Connecte le serveur MCP à un navigateur externe via WebSocket relay',
    parameters: z.object({
        browserId: z.string().describe('ID du navigateur externe (ex: "Brave Browser_1234")'),
        autoConnect: z
            .boolean()
            .optional()
            .default(true)
            .describe('Tenter une connexion automatique via le WebSocket relay'),
    }),
    execute: async (args, _context) => {
        const { browserId, autoConnect } = args;
        try {
            // Vérifier si Brave est en cours d'exécution avec debugging distant
            const debugResponse = await fetch('http://localhost:9222/json/list');
            if (!debugResponse.ok) {
                throw new Error('Brave n\'est pas accessible sur le port de debugging 9222');
            }
            const tabs = await debugResponse.json();
            if (autoConnect) {
                // Vérifier si le WebSocket relay est actif
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    const wsResponse = await fetch('http://localhost:8082', {
                        method: 'HEAD',
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (wsResponse.ok) {
                        return `✅ **Connexion établie via WebSocket relay**\n\n` +
                            `📍 Navigateur détecté: ${browserId}\n` +
                            `🔗 WebSocket relay: ws://localhost:8082\n` +
                            `🌐 Debugging Brave: http://localhost:9222\n` +
                            `📑 Onglets disponibles: ${tabs.length}\n\n` +
                            `**Instructions pour l'extension:**\n` +
                            `1. Dans Brave, cliquez sur l'icône "Browser Manager MCP Bridge"\n` +
                            `2. L'extension se connectera automatiquement à ws://localhost:8082\n` +
                            `3. Sélectionnez l'onglet à contrôler\n` +
                            `4. La communication CDP sera routée via le serveur MCP\n\n` +
                            `🎯 **Onglets détectés:**\n` +
                            tabs.map((tab, i) => `${i + 1}. ${tab.title || 'Sans titre'} - ${tab.url}`).join('\n');
                    }
                }
                catch {
                    // WebSocket relay pas disponible, instructions manuelles
                }
            }
            // Instructions manuelles si auto-connect échoue
            return `🔗 **Configuration de connexion manuelle**\n\n` +
                `📍 Navigateur: ${browserId}\n` +
                `🌐 Debugging Brave: http://localhost:9222 (ACTIF)\n` +
                `🔧 WebSocket relay: ws://localhost:8082 (à démarrer)\n\n` +
                `**Étapes:**\n` +
                `1. Redémarrez le serveur MCP pour activer le WebSocket relay\n` +
                `2. Dans Brave, cliquez sur l'extension "Browser Manager MCP Bridge"\n` +
                `3. Connectez-vous à ws://localhost:8082\n` +
                `4. Sélectionnez un onglet parmi les ${tabs.length} disponibles\n\n` +
                `🎯 **Onglets disponibles:**\n` +
                tabs.map((tab, i) => `${i + 1}. ${tab.title || 'Sans titre'} - ${tab.url}`).join('\n') +
                `\n\n⚠️ **Note:** L'extension doit être installée dans Brave et le serveur MCP doit être en cours d'exécution.`;
        }
        catch (error) {
            return `❌ **Erreur de connexion**\n\n` +
                `Impossible de se connecter à ${browserId}.\n` +
                `Erreur: ${error.message}\n\n` +
                `**Solutions possibles:**\n` +
                `1. Vérifiez que Brave est en cours d'exécution\n` +
                `2. Lancez Brave avec: brave.exe --remote-debugging-port=9222\n` +
                `3. Vérifiez que l'extension "Browser Manager MCP Bridge" est installée\n` +
                `4. Assurez-vous que le serveur MCP tourne sur le port 8081\n` +
                `5. Le WebSocket relay doit être actif sur le port 8082`;
        }
    },
};
// Tool: detect_open_browsers
export const detectOpenBrowsersTool = {
    name: 'detect_open_browsers',
    description: 'Détecte les navigateurs ouverts sur le système',
    parameters: z.object({}),
    execute: async (_args, _context) => {
        try {
            // Liste des navigateurs à détecter
            const browserProcesses = [
                'chrome.exe',
                'chromium.exe',
                'brave.exe',
                'msedge.exe',
                'firefox.exe',
                'iexplore.exe',
            ];
            const allBrowsers = [];
            for (const browser of browserProcesses) {
                try {
                    const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${browser}" /FO CSV`);
                    const lines = stdout.trim().split('\n');
                    // Ignorer la ligne d'en-tête et les lignes vides
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line && line !== '"No tasks are running"') {
                            const parts = line.split(',');
                            if (parts.length >= 2) {
                                const name = parts[0].replace(/"/g, '');
                                const pid = parts[1].replace(/"/g, '');
                                const memUsage = parts[4] ? parts[4].replace(/"/g, '') : 'N/A';
                                allBrowsers.push({
                                    name,
                                    pid,
                                    memoryUsage: memUsage,
                                    type: getBrowserType(name),
                                });
                            }
                        }
                    }
                }
                catch {
                    // Le navigateur n'est probablement pas en cours d'exécution
                    continue;
                }
            }
            return JSON.stringify(allBrowsers, null, 2);
        }
        catch (detectError) {
            throw new Error(`Erreur lors de la détection des navigateurs: ${detectError.message}`);
        }
    },
};
// Fonction utilitaire pour identifier le type de navigateur
function getBrowserType(processName) {
    const browserMap = {
        'chrome.exe': 'Google Chrome',
        'chromium.exe': 'Chromium',
        'brave.exe': 'Brave Browser',
        'msedge.exe': 'Microsoft Edge',
        'firefox.exe': 'Mozilla Firefox',
        'iexplore.exe': 'Internet Explorer',
    };
    return browserMap[processName] || processName;
}
// Tool: close_browser
export const closeBrowserTool = {
    name: 'close_browser',
    description: 'Ferme un navigateur',
    parameters: z.object({
        browserId: z.string().describe('ID du navigateur à fermer'),
    }),
    execute: async (args, _context) => {
        const { browserId } = args;
        const browser = browsers.get(browserId);
        if (!browser) {
            throw new Error('Navigateur non trouvé');
        }
        await browser.close();
        browsers.delete(browserId);
        // Clean up contexts and pages
        for (const cid of Array.from(contexts.keys())) {
            if (cid.startsWith(`context_${browserId}`)) {
                contexts.delete(cid);
                for (const pid of Array.from(pages.keys())) {
                    if (pid.startsWith(`page_${cid}`)) {
                        pages.delete(pid);
                        consoleLogs.delete(pid);
                    }
                }
            }
        }
        if (currentContextId?.startsWith(`context_${browserId}`)) {
            currentContextId = null;
            currentPageId = null;
        }
        return 'Navigateur fermé';
    },
};
// Tool: list_tabs
export const listTabsTool = {
    name: 'list_tabs',
    description: 'Liste les onglets ouverts dans le navigateur actuel',
    parameters: z.object({
        contextId: z.string().optional().describe('ID du contexte, par défaut le courant'),
    }),
    execute: async (args, _context) => {
        const { contextId = currentContextId } = args;
        if (!contextId || !contexts.has(contextId)) {
            throw new Error('Aucun contexte actif');
        }
        const context = contexts.get(contextId);
        const contextPages = context.pages();
        const tabList = contextPages.map((p, i) => ({
            id: `page_${contextId}_${i}`,
            url: p.url(),
            title: p.title(),
        }));
        return JSON.stringify(tabList, null, 2);
    },
};
// Tool: select_tab
export const selectTabTool = {
    name: 'select_tab',
    description: 'Sélectionne un onglet',
    parameters: z.object({
        pageId: z.string().describe('ID de la page à sélectionner'),
    }),
    execute: async (args, _context) => {
        const { pageId } = args;
        const page = pages.get(pageId);
        if (!page) {
            throw new Error('Page non trouvée');
        }
        currentPageId = pageId;
        currentContextId = pageId.split('_').slice(1, -1).join('_');
        return `Onglet sélectionné: ${pageId}`;
    },
};
// Tool: new_tab
export const newTabTool = {
    name: 'new_tab',
    description: 'Ouvre un nouvel onglet',
    parameters: z.object({
        contextId: z.string().optional().describe('ID du contexte, par défaut le courant'),
    }),
    execute: async (args, _context) => {
        const { contextId = currentContextId } = args;
        if (!contextId || !contexts.has(contextId)) {
            throw new Error('Aucun contexte actif');
        }
        const context = contexts.get(contextId);
        const page = await context.newPage();
        const pageIndex = context.pages().length - 1;
        const pageId = `page_${contextId}_${pageIndex}`;
        pages.set(pageId, page);
        // Setup console logging
        consoleLogs.set(pageId, []);
        page.on('console', (msg) => {
            const logs = consoleLogs.get(pageId) || [];
            logs.push({
                type: msg.type(),
                text: msg.text(),
                timestamp: Date.now(),
            });
            consoleLogs.set(pageId, logs);
        });
        currentPageId = pageId;
        return `Nouvel onglet créé: ${pageId}`;
    },
};
// Tool: close_tab
export const closeTabTool = {
    name: 'close_tab',
    description: 'Ferme un onglet',
    parameters: z.object({
        pageId: z.string().optional().describe('ID de la page à fermer, par défaut le courant'),
    }),
    execute: async (args, _context) => {
        const { pageId = currentPageId } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        await page.close();
        pages.delete(pageId);
        consoleLogs.delete(pageId);
        if (currentPageId === pageId) {
            currentPageId = null;
        }
        return 'Onglet fermé';
    },
};
// Tool: navigate
export const navigateTool = {
    name: 'navigate',
    description: 'Navigue vers une URL',
    parameters: z.object({
        url: z.string().describe('URL à visiter'),
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
    }),
    execute: async (args, _context) => {
        const { url, pageId = currentPageId } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        await page.goto(url);
        return `Navigué vers ${url}`;
    },
};
// Tool: screenshot
export const screenshotTool = {
    name: 'screenshot',
    description: "Prend une capture d'écran",
    parameters: z.object({
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
        fullPage: z.boolean().optional().default(false).describe('Capture de la page complète'),
        path: z
            .string()
            .optional()
            .default('screenshot.png')
            .describe("Chemin relatif où sauvegarder la capture d'écran"),
    }),
    execute: async (args, _context) => {
        const { pageId = currentPageId, fullPage, path } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        await page.screenshot({ fullPage, path });
        return `Capture d'écran prise et sauvegardée dans ${path}`;
    },
};
// Tool: click
export const clickTool = {
    name: 'click',
    description: 'Clique sur un élément',
    parameters: z.object({
        selector: z.string().describe("Sélecteur CSS ou description de l'élément"),
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
        force: z
            .boolean()
            .optional()
            .default(false)
            .describe('Forcer le clic même si l élément est caché ou bloqué'),
        timeout: z.number().optional().default(30000).describe('Timeout en millisecondes'),
        waitForSelector: z
            .boolean()
            .optional()
            .default(true)
            .describe('Attendre que le sélecteur soit disponible'),
    }),
    execute: async (args, _context) => {
        const { selector, pageId = currentPageId, force, timeout, waitForSelector } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        try {
            // Attendre que l'élément soit disponible si demandé
            if (waitForSelector) {
                await page.waitForSelector(selector, { timeout });
            }
            // Essayer de cliquer normalement d'abord
            try {
                await page.click(selector, { timeout, force });
                return 'Cliqué avec succès';
            }
            catch (clickError) {
                // Si le clic normal échoue, essayer de forcer le clic
                if (!force && clickError.message.includes('intercepts pointer events')) {
                    // Détecter et fermer les overlays bloquants
                    await removeBlockingOverlays(page);
                    // Réessayer le clic
                    await page.click(selector, { timeout: 5000, force: true });
                    return 'Cliqué avec succès (après suppression des overlays)';
                }
                throw clickError;
            }
        }
        catch (error) {
            // En dernier recours, utiliser JavaScript pour forcer le clic
            try {
                await page.evaluate((sel) => {
                    const element = document.querySelector(sel);
                    if (element) {
                        element.click();
                    }
                    else {
                        throw new Error(`Élément non trouvé: ${sel}`);
                    }
                }, selector);
                return 'Cliqué avec succès (via JavaScript)';
            }
            catch {
                throw new Error(`Échec du clic: ${error.message}. Tentative JavaScript échouée`);
            }
        }
    },
};
// Fonction utilitaire pour supprimer les overlays bloquants
async function removeBlockingOverlays(page) {
    await page.evaluate(() => {
        // Supprimer les overlays de tutoriel
        const tutorialOverlays = document.querySelectorAll('[class*="tutorial"], [class*="overlay"], [ng-if*="tutorial"]');
        tutorialOverlays.forEach((overlay) => {
            if (overlay.style) {
                overlay.style.display = 'none';
                overlay.style.visibility = 'hidden';
                overlay.style.pointerEvents = 'none';
            }
        });
        // Supprimer les modales et popups
        const modals = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="dialog"]');
        modals.forEach((modal) => {
            if (modal.style && (modal.style.display !== 'none' || modal.style.visibility !== 'hidden')) {
                modal.style.display = 'none';
                modal.style.visibility = 'hidden';
                modal.style.pointerEvents = 'none';
            }
        });
        // Supprimer les éléments avec position fixed qui pourraient bloquer
        const fixedElements = document.querySelectorAll('*');
        fixedElements.forEach((el) => {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' && style.zIndex && parseInt(style.zIndex) > 1000) {
                el.style.pointerEvents = 'none';
            }
        });
    });
}
// Tool: type_text
export const typeTextTool = {
    name: 'type_text',
    description: 'Tape du texte dans un champ',
    parameters: z.object({
        selector: z.string().describe('Sélecteur CSS'),
        text: z.string().describe('Texte à taper'),
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
        timeout: z.number().optional().default(30000).describe('Timeout en millisecondes'),
        clearFirst: z.boolean().optional().default(true).describe('Effacer le contenu avant de taper'),
        force: z
            .boolean()
            .optional()
            .default(false)
            .describe('Forcer la saisie même si l élément est caché'),
        waitForSelector: z
            .boolean()
            .optional()
            .default(true)
            .describe('Attendre que le sélecteur soit disponible'),
    }),
    execute: async (args, _context) => {
        const { selector, text, pageId = currentPageId, timeout, clearFirst, force, waitForSelector, } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        try {
            // Stratégie améliorée pour trouver les éléments de saisie
            let targetElement = null;
            let foundStrategy = '';
            // Attendre l'élément avec un timeout plus court si demandé
            if (waitForSelector) {
                try {
                    await page.waitForSelector(selector, { timeout: Math.min(timeout, 5000) });
                    targetElement = await page.$(selector);
                    foundStrategy = 'standard';
                }
                catch {
                    // Si l'attente échoue, essayer des stratégies alternatives
                    foundStrategy = 'fallback';
                }
            }
            // Si pas trouvé, essayer des stratégies de repli
            if (!targetElement) {
                // Stratégie 1: Chercher les éléments ACE Editor spécifiques
                const aceSelectors = [
                    selector,
                    '.ace_editor',
                    '.ace_text-input',
                    '.ace_content',
                    'textarea',
                    'input[type="text"]',
                    '[contenteditable="true"]',
                ];
                for (const sel of aceSelectors) {
                    try {
                        const elements = await page.$$(sel);
                        if (elements.length > 0) {
                            targetElement = elements[0]; // Prendre le premier trouvé
                            foundStrategy = `ace-editor (${sel})`;
                            break;
                        }
                    }
                    catch {
                        continue;
                    }
                }
                // Stratégie 2: Recherche par attributs communs pour les éditeurs
                if (!targetElement) {
                    const found = await page.evaluate(() => {
                        const candidates = [
                            // ACE Editor
                            document.querySelector('.ace_editor'),
                            document.querySelector('.ace_text-input'),
                            // CodeMirror
                            document.querySelector('.CodeMirror'),
                            // Monaco Editor
                            document.querySelector('.monaco-editor'),
                            // Éditeurs génériques
                            document.querySelector('[role="textbox"]'),
                            document.querySelector('[role="combobox"]'),
                            document.querySelector('[contenteditable="true"]'),
                            // Input/textarea standards
                            document.querySelector('textarea'),
                            document.querySelector('input[type="text"]'),
                        ];
                        for (const candidate of candidates) {
                            if (candidate &&
                                (candidate.offsetWidth > 0 ||
                                    candidate.offsetHeight > 0 ||
                                    window.getComputedStyle(candidate).display !== 'none')) {
                                return candidate;
                            }
                        }
                        return null;
                    });
                    if (found) {
                        targetElement = found;
                        foundStrategy = 'attribute-search';
                    }
                }
                // Stratégie 3: Recherche par XPath pour les éléments complexes
                if (!targetElement) {
                    try {
                        const xpathFound = await page.$(`//*[contains(@class, 'ace') or contains(@class, 'editor') or contains(@class, 'input') or @contenteditable][not(@disabled)]`);
                        if (xpathFound) {
                            targetElement = xpathFound;
                            foundStrategy = 'xpath-search';
                        }
                    }
                    catch {
                        // Ignorer les erreurs XPath
                    }
                }
                // Stratégie 4: Forcer la recherche sans visibilité
                if (!targetElement && force) {
                    try {
                        const forcedFound = await page.$$(selector);
                        if (forcedFound.length > 0) {
                            targetElement = forcedFound[0];
                            foundStrategy = 'forced';
                        }
                    }
                    catch {
                        // Ignorer les erreurs
                    }
                }
                if (!targetElement) {
                    throw new Error(`Élément non trouvé pour le sélecteur "${selector}" après plusieurs stratégies de recherche`);
                }
            }
            // Maintenant essayer de taper le texte avec différentes méthodes
            try {
                // Méthode 1: Utiliser fill si possible (pour les éléments qui supportent)
                if (targetElement) {
                    try {
                        const elementType = await targetElement.getAttribute('type');
                        if (elementType !== 'file') {
                            await targetElement.fill(text, { timeout: 10000 });
                            return 'Texte tapé avec succès (fill)';
                        }
                    }
                    catch {
                        // Si fill échoue, essayer type
                    }
                }
                // Méthode 2: Utiliser type
                let typeError = null;
                try {
                    await targetElement.type(text, { timeout: 10000 });
                    return 'Texte tapé avec succès (type)';
                }
                catch (error) {
                    typeError = error;
                    // Si type échoue, essayer des approches alternatives
                }
                // Méthode 3: Rendre l'élément visible et forcer la saisie
                if (!force &&
                    typeError &&
                    typeError.message &&
                    (typeError.message.includes('not visible') || typeError.message.includes('hidden'))) {
                    await page.evaluate((element) => {
                        const el = element;
                        if (el) {
                            const originalStyle = el.style.cssText;
                            el.style.cssText =
                                'visibility: visible !important; display: block !important; opacity: 1 !important; z-index: 9999 !important;';
                            el.setAttribute('data-original-style', originalStyle);
                            // Forcer le focus
                            el.focus();
                            // Rendre le contenu éditable si nécessaire
                            if (el.getAttribute('contenteditable') === 'false') {
                                el.setAttribute('contenteditable', 'true');
                                el.setAttribute('data-original-contenteditable', 'false');
                            }
                        }
                    }, targetElement);
                    // Réessayer la saisie
                    try {
                        await targetElement.fill(text, { timeout: 5000 });
                        return 'Texte tapé avec succès (après modification du style)';
                    }
                    catch {
                        await targetElement.type(text, { timeout: 5000 });
                        return 'Texte tapé avec succès (après modification du style)';
                    }
                }
                // Méthode 4: Utiliser JavaScript direct pour les cas difficiles
                await page.evaluate(([element, txt, clear]) => {
                    const el = element;
                    // Gérer différents types d'éléments
                    if (el) {
                        // Pour ACE Editor
                        if (el.classList && el.classList.contains('ace_editor')) {
                            const ace = window.ace;
                            if (ace && ace.edit(el)) {
                                const editor = ace.edit(el);
                                if (clear) {
                                    editor.setValue('');
                                }
                                editor.insert(txt);
                                editor.focus();
                                return true;
                            }
                        }
                        // Pour les éléments contenteditable
                        if (el.contentEditable === 'true' || el.getAttribute('contenteditable') === 'true') {
                            if (clear) {
                                el.innerText = '';
                            }
                            el.innerText = txt;
                            el.focus();
                            // Déclencher les événements appropriés
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                        // Pour les inputs/textarea standards
                        if (el.value !== undefined) {
                            if (clear) {
                                el.value = '';
                            }
                            el.value = txt;
                            el.focus();
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                        // Pour les autres éléments, essayer de définir innerText
                        if (el.innerText !== undefined) {
                            if (clear) {
                                el.innerText = '';
                            }
                            el.innerText = txt;
                            el.focus();
                            return true;
                        }
                        throw new Error("Type d'élément non supporté pour la saisie");
                    }
                    else {
                        throw new Error('Élément non disponible');
                    }
                }, [targetElement, text, clearFirst]);
                // Restaurer le style original si modifié
                await page.evaluate((element) => {
                    const el = element;
                    if (el) {
                        const originalStyle = el.getAttribute('data-original-style');
                        if (originalStyle) {
                            el.style.cssText = originalStyle;
                            el.removeAttribute('data-original-style');
                        }
                        const originalContentEditable = el.getAttribute('data-original-contenteditable');
                        if (originalContentEditable) {
                            el.setAttribute('contenteditable', originalContentEditable);
                            el.removeAttribute('data-original-contenteditable');
                        }
                    }
                }, targetElement);
                return `Texte tapé avec succès (${foundStrategy} + JavaScript direct)`;
            }
            catch (error) {
                throw new Error(`Échec de la saisie de texte: ${error.message} (stratégie: ${foundStrategy})`);
            }
        }
        catch (launchError) {
            throw new Error(`Erreur lors du lancement du navigateur: ${launchError.message}`);
        }
    },
};
// Tool: wait_for
export const waitForTool = {
    name: 'wait_for',
    description: 'Attend du texte, un sélecteur ou un délai',
    parameters: z.object({
        text: z.string().optional().describe('Texte à attendre'),
        selector: z.string().optional().describe('Sélecteur CSS à attendre'),
        time: z.number().optional().describe("Temps d'attente en secondes"),
        timeout: z.number().optional().default(30000).describe('Timeout en millisecondes'),
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
        hidden: z.boolean().optional().default(false).describe('Attendre même les éléments cachés'),
    }),
    execute: async (args, _context) => {
        const { text, selector, time, timeout, pageId = currentPageId, hidden } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        try {
            if (text) {
                // Attendre du texte avec plusieurs stratégies
                try {
                    await page.waitForSelector(`text=${text}`, {
                        timeout,
                        state: hidden ? 'attached' : 'visible',
                    });
                    return `Texte "${text}" trouvé avec succès`;
                }
                catch {
                    // Stratégie de repli : chercher dans tout le document
                    const found = await page.evaluate(([searchText, isHidden]) => {
                        const elements = document.querySelectorAll('*');
                        for (const el of elements) {
                            if (el.textContent && el.textContent.includes(searchText)) {
                                const style = window.getComputedStyle(el);
                                if (isHidden || (style.display !== 'none' && style.visibility !== 'hidden')) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    }, [text, hidden]);
                    if (found) {
                        return `Texte "${text}" trouvé (via recherche étendue)`;
                    }
                    throw new Error(`Texte "${text}" non trouvé après ${timeout}ms`);
                }
            }
            else if (selector) {
                // Attendre un sélecteur CSS
                try {
                    await page.waitForSelector(selector, { timeout, state: hidden ? 'attached' : 'visible' });
                    return `Sélecteur "${selector}" trouvé avec succès`;
                }
                catch {
                    // Stratégie de repli : chercher avec des critères plus larges
                    const found = await page.evaluate(([sel, isHidden]) => {
                        try {
                            const element = document.querySelector(sel);
                            if (element) {
                                const style = window.getComputedStyle(element);
                                return isHidden || (style.display !== 'none' && style.visibility !== 'hidden');
                            }
                            return false;
                        }
                        catch {
                            return false;
                        }
                    }, [selector, hidden]);
                    if (found) {
                        return `Sélecteur "${selector}" trouvé (via vérification directe)`;
                    }
                    throw new Error(`Sélecteur "${selector}" non trouvé après ${timeout}ms`);
                }
            }
            else if (time) {
                await page.waitForTimeout(time * 1000);
                return `Attente de ${time} secondes terminée`;
            }
            else {
                throw new Error('Veuillez spécifier soit "text", soit "selector", soit "time"');
            }
        }
        catch (_error) {
            throw new Error(`Erreur lors de l'attente: ${_error.message}`);
        }
    },
};
// Tool: get_html
export const getHtmlTool = {
    name: 'get_html',
    description: 'Récupère le HTML de la page',
    parameters: z.object({
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
        selector: z
            .string()
            .optional()
            .describe("Sélecteur CSS pour obtenir le HTML d'un élément spécifique"),
        maxChars: z
            .number()
            .optional()
            .default(5000)
            .describe('Nombre maximum de caractères à retourner'),
        truncate: z.boolean().optional().default(true).describe('Tronquer le HTML si trop volumineux'),
    }),
    execute: async (args, _context) => {
        const { pageId = currentPageId, selector, maxChars } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        try {
            let html;
            if (selector) {
                // Obtenir le HTML d'un élément spécifique
                const element = await page.$(selector);
                if (!element) {
                    throw new Error(`Élément non trouvé pour le sélecteur: ${selector}`);
                }
                html = await element.innerHTML();
            }
            else {
                // Obtenir le HTML complet de la page
                html = await page.content();
            }
            // Limiter la taille de la réponse si nécessaire
            if (html.length > maxChars) {
                const truncatedHtml = html.substring(0, maxChars) +
                    '...\n\n[HTML tronqué - utilisez les paramètres maxChars pour voir plus]';
                return JSON.stringify({
                    html: truncatedHtml,
                    totalLength: html.length,
                    truncated: true,
                    selector: selector || null,
                    message: `HTML tronqué à ${maxChars} caractères sur ${html.length} caractères au total`,
                }, null, 2);
            }
            // Retourner le HTML sous forme de chaîne avec métadonnées
            const result = {
                html: html,
                totalLength: html.length,
                truncated: false,
                selector: selector || null,
            };
            return JSON.stringify(result, null, 2);
        }
        catch (htmlError) {
            throw new Error(`Erreur lors de la récupération du HTML: ${htmlError.message}`);
        }
    },
};
// Tool: get_console_logs
export const getConsoleLogsTool = {
    name: 'get_console_logs',
    description: 'Récupère les logs de la console développeur',
    parameters: z.object({
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
        maxLogs: z.number().optional().default(100).describe('Nombre maximum de logs à retourner'),
        level: z
            .enum(['log', 'info', 'warn', 'error', 'debug'])
            .optional()
            .describe('Filtrer par niveau de log'),
        since: z.number().optional().describe('Filtrer les logs depuis ce timestamp (en ms)'),
        search: z.string().optional().describe('Rechercher du texte dans les logs'),
        truncate: z.boolean().optional().default(true).describe('Tronquer les logs si trop volumineux'),
    }),
    execute: async (args, _context) => {
        const { pageId = currentPageId, maxLogs, level, since, search } = args;
        if (!pageId || !consoleLogs.has(pageId)) {
            throw new Error('Aucune page active ou pas de logs');
        }
        const logs = consoleLogs.get(pageId);
        // Filtrer les logs selon les critères
        let filteredLogs = logs;
        // Filtrer par niveau
        if (level) {
            filteredLogs = filteredLogs.filter((log) => log.type === level);
        }
        // Filtrer par timestamp
        if (since) {
            filteredLogs = filteredLogs.filter((log) => log.timestamp >= since);
        }
        // Filtrer par recherche de texte
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredLogs = filteredLogs.filter((log) => log.text.toLowerCase().includes(searchTerm));
        }
        // Limiter le nombre de logs
        if (filteredLogs.length > maxLogs) {
            filteredLogs = filteredLogs.slice(-maxLogs); // Prendre les logs les plus récents
        }
        // Préparer la réponse
        const result = {
            logs: filteredLogs,
            totalCount: logs.length,
            filteredCount: filteredLogs.length,
            truncated: filteredLogs.length < logs.length,
            filters: {
                level,
                since,
                search,
                maxLogs,
            },
        };
        // Retourner sous forme de chaîne JSON
        return JSON.stringify(result, null, 2);
    },
};
// Tool: evaluate_script
export const evaluateScriptTool = {
    name: 'evaluate_script',
    description: 'Évalue du code JavaScript dans la page',
    parameters: z.object({
        script: z.string().describe('Code JavaScript à exécuter'),
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
        safeMode: z
            .boolean()
            .optional()
            .default(true)
            .describe('Mode sécurisé pour éviter les erreurs fatales'),
    }),
    execute: async (args, _context) => {
        const { script, pageId = currentPageId, safeMode } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        try {
            let result;
            if (safeMode) {
                // Mode sécurisé : wrapper le script pour gérer les erreurs
                const safeScript = `
          (function() {
            try {
              ${script}
            } catch (error) {
              return {
                error: true,
                message: error.message,
                name: error.name,
                stack: error.stack
              };
            }
          })()
        `;
                result = await page.evaluate(safeScript);
                // Vérifier si le script a retourné une erreur
                if (result && typeof result === 'object' && result.error) {
                    const errorResult = result;
                    return `Erreur d'exécution: ${errorResult.message}\nDétails: ${errorResult.name}\nStack: ${errorResult.stack || 'Non disponible'}`;
                }
            }
            else {
                // Mode direct : exécuter le script sans wrapper
                result = await page.evaluate(script);
            }
            return `Résultat: ${JSON.stringify(result, null, 2)}`;
        }
        catch (error) {
            // Gérer les erreurs d'exécution Playwright
            if (error.message.includes('ReferenceError') && error.message.includes('is not defined')) {
                const varName = error.message.match(/ReferenceError: (\w+) is not defined/);
                const suggestion = varName
                    ? `\nSuggestion: Assurez-vous que la variable '${varName[1]}' est définie dans le contexte de la page.\nTry: window.${varName[1]} ou document.querySelector('#${varName[1]}')`
                    : '\nSuggestion: Vérifiez que toutes les variables globales sont accessibles.';
                return `Erreur d'exécution du script: ${error.message}${suggestion}`;
            }
            else {
                return `Erreur d'exécution du script: ${error.message}`;
            }
        }
    },
};
// Tool: browser_snapshot
export const browserSnapshotTool = {
    name: 'browser_snapshot',
    description: `Capture un instantané complet de la page avec accessibilité et structure sémantique. C'est l'outil le plus puissant pour obtenir le contenu de la page rapidement car il capture d'accessibilité complète, structure sémantique riche, texte extrait lisible, éléments interactifs identifiés, positions et tailles exactes, états visibles.`,
    parameters: z.object({
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
        includeText: z
            .boolean()
            .optional()
            .default(true)
            .describe('Inclure le contenu textuel extrait'),
        includeForms: z
            .boolean()
            .optional()
            .default(true)
            .describe('Inclure les informations sur les formulaires'),
        includeLinks: z
            .boolean()
            .optional()
            .default(true)
            .describe('Inclure les informations sur les liens'),
        maxElements: z
            .number()
            .optional()
            .default(1000)
            .describe("Nombre maximum d'éléments à retourner"),
    }),
    execute: async (args, _context) => {
        const { pageId = currentPageId, includeText, includeForms, includeLinks, maxElements } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        try {
            // Capturer l'instantané d'accessibilité
            const accessibilitySnapshot = await page.accessibility.snapshot();
            // Obtenir le titre de la page
            const title = await page.title();
            // Obtenir l'URL actuelle
            const url = page.url();
            // Transformer les nœuds d'accessibilité en éléments structurés
            const elements = [];
            let elementCount = 0;
            function processAccessibilityNode(node, parentPath = '') {
                if (elementCount >= maxElements)
                    return null;
                const element = {
                    uid: `element_${elementCount++}`,
                    type: node.role || 'unknown',
                    name: node.name || '',
                    description: node.description || '',
                    level: node.level || 0,
                    value: node.value || '',
                    checked: node.checked,
                    disabled: node.disabled,
                    expanded: node.expanded,
                    selected: node.selected,
                    focused: node.focused,
                    required: node.required,
                    readonly: node.readonly,
                    multiline: node.multiline,
                    invalid: node.invalid,
                    autocomplete: node.autocomplete,
                    haspopup: node.haspopup,
                    orientation: node.orientation,
                    sort: node.sort,
                    busy: node.busy,
                    atomic: node.atomic,
                    live: node.live,
                    relevant: node.relevant,
                    grabbed: node.grabbed,
                    dropeffect: node.dropeffect,
                    path: parentPath,
                };
                // Ajouter les propriétés de position si disponibles
                if (node.boundingBox) {
                    element.position = {
                        x: Math.round(node.boundingBox.x),
                        y: Math.round(node.boundingBox.y),
                    };
                    element.size = {
                        width: Math.round(node.boundingBox.width),
                        height: Math.round(node.boundingBox.height),
                    };
                }
                // Traiter les enfants
                if (node.children && node.children.length > 0) {
                    element.children = [];
                    for (const child of node.children) {
                        const processedChild = processAccessibilityNode(child, `${parentPath}/child`);
                        if (processedChild) {
                            element.children.push(processedChild);
                        }
                    }
                }
                return element;
            }
            // Traiter tous les nœuds racine
            if (accessibilitySnapshot) {
                for (const rootNode of accessibilitySnapshot.children || []) {
                    const processedElement = processAccessibilityNode(rootNode, 'root');
                    if (processedElement) {
                        elements.push(processedElement);
                    }
                }
            }
            // Collecter le contenu textuel si demandé
            let textContent = '';
            if (includeText) {
                try {
                    textContent = await page.evaluate(() => {
                        const elements = document.querySelectorAll('*');
                        const textSet = new Set();
                        for (const el of elements) {
                            const text = el.textContent?.trim();
                            if (text && text.length > 0 && text.length < 1000) {
                                textSet.add(text);
                            }
                        }
                        return Array.from(textSet).join('\n');
                    });
                }
                catch {
                    textContent = "Erreur lors de l'extraction du texte";
                }
            }
            // Collecter les informations sur les formulaires si demandé
            let forms = [];
            if (includeForms) {
                try {
                    forms = await page.evaluate(() => {
                        const formElements = document.querySelectorAll('form, [role="form"]');
                        const formsData = [];
                        for (const form of formElements) {
                            const inputs = form.querySelectorAll('input, textarea, select');
                            const formData = {
                                action: form.action || '',
                                method: form.method || 'get',
                                inputs: Array.from(inputs).map((input) => ({
                                    type: input.type || 'text',
                                    name: input.name || '',
                                    placeholder: input.placeholder || '',
                                    required: input.required || false,
                                    value: input.value || '',
                                })),
                            };
                            formsData.push(formData);
                        }
                        return formsData;
                    });
                }
                catch (formsError) {
                    forms = [];
                    console.warn('Erreur extraction formulaires:', formsError);
                }
            }
            // Collecter les informations sur les liens si demandé
            let links = [];
            if (includeLinks) {
                try {
                    links = await page.evaluate(() => {
                        const linkElements = document.querySelectorAll('a[href]');
                        const linksData = [];
                        for (const link of linkElements) {
                            const href = link.getAttribute('href');
                            const text = link.textContent?.trim() || '';
                            if (href && text) {
                                linksData.push({
                                    text: text,
                                    href: href,
                                    title: link.getAttribute('title') || '',
                                });
                            }
                        }
                        return linksData;
                    });
                }
                catch (linksError) {
                    links = [];
                    console.warn('Erreur extraction liens:', linksError);
                }
            }
            // Construire la réponse finale
            const snapshot = {
                title,
                url,
                timestamp: new Date().toISOString(),
                elements: elements.slice(0, maxElements),
                totalElements: elements.length,
                textContent: includeText ? textContent : null,
                forms: includeForms ? forms : null,
                links: includeLinks ? links : null,
                metadata: {
                    includeText,
                    includeForms,
                    includeLinks,
                    maxElements,
                    truncated: elements.length > maxElements,
                },
            };
            return JSON.stringify(snapshot, null, 2);
        }
        catch (error) {
            throw new Error(`Erreur lors de la capture du snapshot: ${error.message}`);
        }
    },
};
// Tool: list_external_browser_tabs
export const listExternalBrowserTabsTool = {
    name: 'list_external_browser_tabs',
    description: 'Liste les onglets des navigateurs externes (non gérés par le serveur)',
    parameters: z.object({
        browserName: z
            .string()
            .optional()
            .describe('Nom du navigateur (chrome, brave, edge, firefox). Si non spécifié, liste tous les navigateurs.'),
    }),
    execute: async (args, _context) => {
        // Timeout global de 30 secondes pour éviter les blocages
        const GLOBAL_TIMEOUT = 30000;
        const CDP_TIMEOUT = 5000;
        try {
            const { browserName } = args;
            // Créer un AbortController pour le timeout global
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, GLOBAL_TIMEOUT);
            try {
                // Détecter d'abord les navigateurs ouverts avec timeout
                const browserDetectionPromises = [
                    execAsyncWithTimeout('tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV', controller.signal),
                    execAsyncWithTimeout('tasklist /FI "IMAGENAME eq brave.exe" /FO CSV', controller.signal),
                    execAsyncWithTimeout('tasklist /FI "IMAGENAME eq msedge.exe" /FO CSV', controller.signal),
                    execAsyncWithTimeout('tasklist /FI "IMAGENAME eq firefox.exe" /FO CSV', controller.signal),
                ];
                const detectionResults = await Promise.allSettled(browserDetectionPromises);
                const allLines = [];
                detectionResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        const stdout = result.value.stdout;
                        const lines = stdout.trim().split('\n');
                        allLines.push(...lines);
                    }
                    else {
                        // Log l'erreur mais continue avec les autres navigateurs
                        console.warn(`Erreur lors de la détection du navigateur ${index}:`, result.reason);
                    }
                });
                const openBrowsers = [];
                for (let i = 1; i < allLines.length; i++) {
                    const line = allLines[i]?.trim();
                    if (line && line !== '"No tasks are running"') {
                        const parts = line.split(',');
                        if (parts.length >= 2) {
                            const name = parts[0].replace(/"/g, '').toLowerCase();
                            const pid = parts[1].replace(/"/g, '');
                            if (!browserName || name.includes(browserName.toLowerCase())) {
                                openBrowsers.push({ name, pid, type: getBrowserType(parts[0].replace(/"/g, '')) });
                            }
                        }
                    }
                }
                if (openBrowsers.length === 0) {
                    clearTimeout(timeoutId);
                    return JSON.stringify({ message: 'Aucun navigateur correspondant trouvé' }, null, 2);
                }
                // Grouper les processus par navigateur et essayer de trouver le processus principal
                const browserGroups = {};
                for (const browser of openBrowsers) {
                    const key = browser.type;
                    if (!browserGroups[key]) {
                        browserGroups[key] = [];
                    }
                    browserGroups[key].push(browser);
                }
                const browserResults = [];
                // Traiter chaque groupe de navigateurs avec un timeout par navigateur
                for (const [browserType, processes] of Object.entries(browserGroups)) {
                    try {
                        // Prendre le processus avec le plus grand PID comme processus principal
                        const mainProcess = processes.reduce((prev, current) => parseInt(current.pid) > parseInt(prev.pid) ? current : prev);
                        // Essayer de se connecter via CDP avec timeout
                        const tabsPromise = getBrowserTabsViaCDPWithTimeout(mainProcess, CDP_TIMEOUT, controller.signal);
                        const tabs = await tabsPromise;
                        if (tabs.length > 0) {
                            browserResults.push({
                                browser: browserType,
                                mainPid: mainProcess.pid,
                                totalProcesses: processes.length,
                                tabs: tabs,
                                status: 'connected',
                                note: 'Debugging distant activé - onglets accessibles',
                            });
                        }
                        else {
                            // Alternative: essayer de lancer une instance Playwright avec timeout
                            const alternativeTabsPromise = getTabsViaPlaywrightWithTimeout(mainProcess, CDP_TIMEOUT, controller.signal);
                            const alternativeTabs = await alternativeTabsPromise;
                            browserResults.push({
                                browser: browserType,
                                mainPid: mainProcess.pid,
                                totalProcesses: processes.length,
                                tabs: alternativeTabs,
                                status: alternativeTabs.length > 0 ? 'connected_alternative' : 'no_debugging',
                                note: alternativeTabs.length > 0
                                    ? 'Connecté via méthode alternative'
                                    : 'Debugging distant désactivé - onglets non accessibles. Activez le debugging distant pour voir les onglets.',
                            });
                        }
                    }
                    catch (error) {
                        browserResults.push({
                            browser: browserType,
                            mainPid: processes[0]?.pid || 'unknown',
                            totalProcesses: processes.length,
                            tabs: [],
                            status: 'error',
                            error: `Erreur: ${error.message}`,
                        });
                    }
                }
                clearTimeout(timeoutId);
                return JSON.stringify(browserResults, null, 2);
            }
            catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error("Timeout: L'opération a pris trop de temps à s'exécuter");
                }
                throw error;
            }
        }
        catch (error) {
            throw new Error(`Erreur lors de la liste des onglets externes: ${error.message}`);
        }
    },
};
// Fonction utilitaire pour obtenir les onglets via CDP
async function getBrowserTabsViaCDP(browser) {
    try {
        // Pour Chrome/Brave/Edge, vérifier les ports de debugging courants
        const debugPorts = [9222, 9223, 9224, 9225, 9226, 9227, 9228, 9229, 9230];
        for (const port of debugPorts) {
            try {
                const response = await fetch(`http://localhost:${port}/json/list`);
                if (response.ok) {
                    const tabs = await response.json();
                    return tabs.map((tab) => ({
                        id: tab.id,
                        url: tab.url,
                        title: tab.title,
                    }));
                }
            }
            catch {
                // Port non disponible, essayer le suivant
                continue;
            }
        }
        // Si aucun port de debugging n'est trouvé, essayer de trouver le port via le PID
        const port = await findDebugPortByPID(parseInt(browser.pid));
        if (port) {
            const response = await fetch(`http://localhost:${port}/json/list`);
            if (response.ok) {
                const tabs = await response.json();
                return tabs.map((tab) => ({
                    id: tab.id,
                    url: tab.url,
                    title: tab.title,
                }));
            }
        }
        return [];
    }
    catch {
        return [];
    }
}
// Fonction utilitaire pour trouver le port de debugging par PID
async function findDebugPortByPID(pid) {
    try {
        // Utiliser netstat pour trouver les ports d'écoute pour ce processus
        const { stdout } = await execAsync(`netstat -ano | findstr ${pid}`);
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                const localAddress = parts[1];
                if (localAddress.includes('127.0.0.1:') || localAddress.includes('localhost:')) {
                    const port = parseInt(localAddress.split(':')[1]);
                    // Vérifier si c'est un port de debugging Chrome typique
                    if (port >= 9222 && port <= 9230) {
                        return port;
                    }
                }
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
// Fonction utilitaire alternative pour obtenir les onglets via Playwright
async function getTabsViaPlaywright(browser) {
    try {
        // Diagnostic du debugging distant
        const diagnostic = await diagnoseDebuggingStatus(browser);
        // Pour Firefox, essayer de se connecter directement
        if (browser.name.includes('firefox')) {
            try {
                const firefoxBrowser = await firefox.connect('ws://localhost:9222');
                const contexts = firefoxBrowser.contexts();
                const tabs = [];
                for (const context of contexts) {
                    const pages = context.pages();
                    for (const page of pages) {
                        tabs.push({
                            id: `firefox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            url: page.url(),
                            title: await page.title(),
                            diagnostic: diagnostic,
                        });
                    }
                }
                await firefoxBrowser.close();
                return tabs;
            }
            catch {
                // Firefox n'est pas accessible
                return [];
            }
        }
        // Pour les navigateurs Chrome-based, essayer de se connecter via CDP WebSocket
        try {
            const port = await findDebugPortByPID(parseInt(browser.pid));
            if (port) {
                const cdpBrowser = await chromium.connect(`ws://localhost:${port}`);
                const contexts = cdpBrowser.contexts();
                const tabs = [];
                for (const context of contexts) {
                    const pages = context.pages();
                    for (const page of pages) {
                        tabs.push({
                            id: `cdp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            url: page.url(),
                            title: await page.title(),
                            diagnostic: diagnostic,
                        });
                    }
                }
                await cdpBrowser.close();
                return tabs;
            }
        }
        catch {
            // Impossible de se connecter via CDP
        }
        // Si tout échoue, essayer d'estimer le nombre d'onglets via l'analyse des processus
        const estimatedTabs = await estimateTabCount(browser);
        return [
            {
                id: `process_${browser.pid}`,
                url: 'unknown',
                title: `${browser.type} - PID ${browser.pid} (${estimatedTabs} onglets estimés)`,
                estimatedCount: estimatedTabs,
                diagnostic: diagnostic,
            },
        ];
    }
    catch {
        return [];
    }
}
// Fonction de diagnostic du debugging distant
async function diagnoseDebuggingStatus(browser) {
    try {
        // Vérifier si le processus principal écoute sur un port
        const { stdout } = await execAsync(`netstat -ano | findstr ${browser.pid}`);
        const hasListeningPort = stdout.includes('LISTENING') || stdout.includes(':92');
        // Vérifier les ports de debugging standards
        const debugPorts = [9222, 9223, 9224, 9225, 9226, 9227, 9228, 9229, 9230];
        let availablePorts = [];
        for (const port of debugPorts) {
            try {
                const response = await fetch(`http://localhost:${port}/json/list`, {
                    signal: AbortSignal.timeout(1000),
                });
                if (response.ok) {
                    availablePorts.push(port);
                }
            }
            catch {
                // Port non disponible
            }
        }
        if (availablePorts.length > 0) {
            return `Debugging ACTIVÉ sur port(s): ${availablePorts.join(', ')}`;
        }
        else if (hasListeningPort) {
            return `Processus actif mais debugging distant NON CONFIGURÉ - Lancez avec: --remote-debugging-port=9222`;
        }
        else {
            return `Debugging distant INACTIVÉ - Navigateur lancé sans option --remote-debugging-port`;
        }
    }
    catch (error) {
        return `Erreur de diagnostic: ${error.message}`;
    }
}
// Fonction pour estimer le nombre d'onglets basé sur les processus
async function estimateTabCount(browser) {
    try {
        // Pour les navigateurs Chrome-based, analyser plus précisément les processus
        const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${browser.name}" /FO CSV`);
        const lines = stdout.trim().split('\n');
        let rendererProcesses = 0;
        let totalProcesses = 0;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && line !== '"No tasks are running"') {
                totalProcesses++;
                const parts = line.split(',');
                if (parts.length >= 5) {
                    const memUsage = parts[4]
                        ? parts[4].replace(/"/g, '').replace(' Ko', '').replace(',', '')
                        : '0';
                    const memNum = parseInt(memUsage);
                    // Classification plus précise des processus
                    if (memNum >= 10000) {
                        // > 10MB : processus renderer (onglet)
                        rendererProcesses++;
                    }
                }
            }
        }
        // Logique améliorée pour estimer les onglets
        // Pour les navigateurs modernes avec peu d'onglets (1-3), le partage de processus est courant
        if (totalProcesses <= 5) {
            // Très peu de processus : probablement 1-2 onglets
            return Math.max(1, Math.floor(totalProcesses / 2));
        }
        else if (totalProcesses <= 10) {
            // Peu de processus : estimer 1-3 onglets
            return Math.max(1, Math.min(3, rendererProcesses));
        }
        else if (totalProcesses <= 15) {
            // Moyen de processus : estimer 3-7 onglets
            return Math.max(1, Math.min(7, rendererProcesses));
        }
        else {
            // Beaucoup de processus : estimation plus agressive
            return Math.max(1, Math.min(15, Math.max(rendererProcesses, Math.floor(totalProcesses / 3))));
        }
    }
    catch {
        // En cas d'erreur, retourner une estimation conservatrice
        return 1;
    }
}
// Fonction utilitaire pour exécuter execAsync avec timeout
async function execAsyncWithTimeout(command, signal) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Timeout: ${command}`));
        }, 10000); // 10 secondes timeout
        exec(command, { signal }, (error, stdout, stderr) => {
            clearTimeout(timeoutId);
            if (error) {
                if (error.name === 'AbortError') {
                    reject(new Error('Opération annulée'));
                }
                else {
                    reject(error);
                }
            }
            else {
                resolve({ stdout, stderr });
            }
        });
    });
}
// Fonction utilitaire pour getBrowserTabsViaCDP avec timeout
async function getBrowserTabsViaCDPWithTimeout(browser, timeout, signal) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Timeout CDP: ${browser.type}`));
        }, timeout);
        signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Opération annulée'));
        });
        getBrowserTabsViaCDP(browser)
            .then((result) => {
            clearTimeout(timeoutId);
            resolve(result);
        })
            .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });
}
// Fonction utilitaire pour getTabsViaPlaywright avec timeout
async function getTabsViaPlaywrightWithTimeout(browser, timeout, signal) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Timeout Playwright: ${browser.type}`));
        }, timeout);
        signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Opération annulée'));
        });
        getTabsViaPlaywright(browser)
            .then((result) => {
            clearTimeout(timeoutId);
            resolve(result);
        })
            .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });
}
