// src/tools/browserTools.ts
import { z } from 'zod';
import { chromium, firefox, webkit, } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
// Global state
const browsers = new Map();
const contexts = new Map();
const pages = new Map();
const consoleLogs = new Map();
let currentContextId = null;
let currentPageId = null;
// Tool: launch_browser
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
            .enum(['chromium', 'firefox', 'webkit'])
            .optional()
            .default('chromium')
            .describe('Type de navigateur'),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: async (args, _context) => {
        try {
            const { headless, browser: browserType } = args;
            const browser = await (browserType === 'chromium' ? chromium : browserType === 'firefox' ? firefox : webkit).launch({ headless });
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
        }
        catch (error) {
            throw new Error(`Erreur lors du lancement du navigateur: ${error.message}`);
        }
    },
};
// Tool: list_browsers
export const listBrowsersTool = {
    name: 'list_browsers',
    description: 'Liste les navigateurs gérés',
    parameters: z.object({}),
    execute: async (_args, _context) => {
        const browserList = Array.from(browsers.keys()).map((id) => ({ id, type: 'managed' }));
        return JSON.stringify(browserList, null, 2);
    },
};
// Tool: detect_open_browsers
export const detectOpenBrowsersTool = {
    name: 'detect_open_browsers',
    description: 'Détecte les navigateurs ouverts sur le système',
    parameters: z.object({}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        catch (error) {
            throw new Error(`Erreur lors de la détection des navigateurs: ${error.message}`);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: async (args, _context) => {
        const { pageId = currentPageId, fullPage } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        await page.screenshot({ fullPage, path: 'screenshot.png' });
        return "Capture d'écran prise et sauvegardée dans screenshot.png";
    },
};
// Tool: click
export const clickTool = {
    name: 'click',
    description: 'Clique sur un élément',
    parameters: z.object({
        selector: z.string().describe("Sélecteur CSS ou description de l'élément"),
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: async (args, _context) => {
        const { selector, pageId = currentPageId } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        await page.click(selector);
        return 'Cliqué';
    },
};
// Tool: type_text
export const typeTextTool = {
    name: 'type_text',
    description: 'Tape du texte dans un champ',
    parameters: z.object({
        selector: z.string().describe('Sélecteur CSS'),
        text: z.string().describe('Texte à taper'),
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: async (args, _context) => {
        const { selector, text, pageId = currentPageId } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        await page.fill(selector, text);
        return 'Texte tapé';
    },
};
// Tool: wait_for
export const waitForTool = {
    name: 'wait_for',
    description: 'Attend du texte ou un délai',
    parameters: z.object({
        text: z.string().optional().describe('Texte à attendre'),
        time: z.number().optional().describe("Temps d'attente en secondes"),
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: async (args, _context) => {
        const { text, time, pageId = currentPageId } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        if (text) {
            await page.waitForSelector(`text=${text}`);
        }
        else if (time) {
            await page.waitForTimeout(time * 1000);
        }
        return 'Attente terminée';
    },
};
// Tool: get_html
export const getHtmlTool = {
    name: 'get_html',
    description: 'Récupère le HTML de la page',
    parameters: z.object({
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: async (args, _context) => {
        const { pageId = currentPageId } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        const html = await page.content();
        return html;
    },
};
// Tool: get_console_logs
export const getConsoleLogsTool = {
    name: 'get_console_logs',
    description: 'Récupère les logs de la console développeur',
    parameters: z.object({
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
    }),
    execute: async (args, _context) => {
        const { pageId = currentPageId } = args;
        if (!pageId || !consoleLogs.has(pageId)) {
            throw new Error('Aucune page active ou pas de logs');
        }
        const logs = consoleLogs.get(pageId);
        return JSON.stringify(logs, null, 2);
    },
};
// Tool: evaluate_script
export const evaluateScriptTool = {
    name: 'evaluate_script',
    description: 'Évalue du code JavaScript dans la page',
    parameters: z.object({
        script: z.string().describe('Code JavaScript à exécuter'),
        pageId: z.string().optional().describe('ID de la page, par défaut le courant'),
    }),
    execute: async (args, _context) => {
        const { script, pageId = currentPageId } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active');
        }
        const page = pages.get(pageId);
        try {
            const result = await page.evaluate(script);
            return `Résultat: ${JSON.stringify(result, null, 2)}`;
        }
        catch (error) {
            throw new Error(`Erreur d'exécution du script: ${error.message}`);
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
        try {
            const { browserName } = args;
            // Détecter d'abord les navigateurs ouverts
            const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV');
            const chromeLines = stdout.trim().split('\n');
            const { stdout: braveStdout } = await execAsync('tasklist /FI "IMAGENAME eq brave.exe" /FO CSV');
            const braveLines = braveStdout.trim().split('\n');
            const { stdout: edgeStdout } = await execAsync('tasklist /FI "IMAGENAME eq msedge.exe" /FO CSV');
            const edgeLines = edgeStdout.trim().split('\n');
            const { stdout: firefoxStdout } = await execAsync('tasklist /FI "IMAGENAME eq firefox.exe" /FO CSV');
            const firefoxLines = firefoxStdout.trim().split('\n');
            const allLines = [...chromeLines, ...braveLines, ...edgeLines, ...firefoxLines];
            const openBrowsers = [];
            for (let i = 1; i < allLines.length; i++) {
                const line = allLines[i].trim();
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
            const results = [];
            for (const [browserType, processes] of Object.entries(browserGroups)) {
                try {
                    // Prendre le processus avec le plus grand PID comme processus principal
                    const mainProcess = processes.reduce((prev, current) => parseInt(current.pid) > parseInt(prev.pid) ? current : prev);
                    // Essayer de se connecter via CDP
                    const tabs = await getBrowserTabsViaCDP(mainProcess);
                    if (tabs.length > 0) {
                        results.push({
                            browser: browserType,
                            mainPid: mainProcess.pid,
                            totalProcesses: processes.length,
                            tabs: tabs,
                            status: 'connected',
                            note: 'Debugging distant activé - onglets accessibles',
                        });
                    }
                    else {
                        // Alternative: essayer de lancer une instance Playwright connectée au navigateur existant
                        const alternativeTabs = await getTabsViaPlaywright(mainProcess);
                        results.push({
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
                    results.push({
                        browser: browserType,
                        mainPid: processes[0].pid,
                        totalProcesses: processes.length,
                        tabs: [],
                        status: 'error',
                        error: `Erreur: ${error.message}`,
                    });
                }
            }
            return JSON.stringify(results, null, 2);
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
//# sourceMappingURL=browserTools.js.map