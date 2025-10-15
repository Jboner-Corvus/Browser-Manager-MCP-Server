/**
 * @file src/tools/visionTools.ts
 * @description Outils de vision pour Browser-Manager-MCP-Server-dist
 * Capacité Vision pour le contrôle avancé de la souris et reconnaissance visuelle
 */
import { z } from 'zod';
import { ToolCategories } from './categories.js';
import { Capability } from '../capabilities/index.js';
// Import des états globaux depuis browserTools
import { pages, currentPageId } from './browserTools.js';
// Tool: mouse_move_xy
export const mouseMoveXyTool = {
    name: 'mouse_move_xy',
    description: 'Déplace le curseur de la souris à des coordonnées absolues sur la page',
    annotations: {
        category: ToolCategories.INTERACTION,
        readOnlyHint: false,
        requiresAuth: false,
        dangerous: false,
        experimental: false,
    },
    parameters: z.object({
        x: z.number().describe('Coordonnée X absolue sur la page'),
        y: z.number().describe('Coordonnée Y absolue sur la page'),
        pageId: z.string().optional().describe('ID de la page, par défaut la page courante'),
        steps: z
            .number()
            .optional()
            .default(1)
            .describe("Nombre d'étapes pour le mouvement (pour mouvement fluide)"),
        duration: z.number().optional().default(100).describe('Durée du mouvement en millisecondes'),
    }),
    execute: async (args, _context) => {
        const { x, y, pageId = currentPageId, steps, duration } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active disponible pour le mouvement de souris');
        }
        const page = pages.get(pageId);
        try {
            // Validation des coordonnées
            const viewport = page.viewportSize();
            if (viewport) {
                if (x < 0 || x > viewport.width || y < 0 || y > viewport.height) {
                    throw new Error(`Coordonnées hors limites. Page: ${viewport.width}x${viewport.height}, Reçu: ${x},${y}`);
                }
            }
            // Mouvement simple
            await page.mouse.move(x, y);
            return `Souris déplacée vers les coordonnées (${x}, ${y}) avec ${steps} étape(s) sur ${duration}ms`;
        }
        catch (error) {
            throw new Error(`Erreur lors du mouvement de souris: ${error.message}`);
        }
    },
};
// Tool: mouse_click_xy
export const mouseClickXyTool = {
    name: 'mouse_click_xy',
    description: 'Clique à des coordonnées absolues sur la page',
    annotations: {
        category: ToolCategories.INTERACTION,
        readOnlyHint: false,
        requiresAuth: false,
        dangerous: false,
        experimental: false,
    },
    parameters: z.object({
        x: z.number().describe('Coordonnée X absolue sur la page'),
        y: z.number().describe('Coordonnée Y absolue sur la page'),
        pageId: z.string().optional().describe('ID de la page, par défaut la page courante'),
        button: z
            .enum(['left', 'middle', 'right'])
            .optional()
            .default('left')
            .describe('Bouton de la souris à utiliser'),
        clickCount: z
            .number()
            .optional()
            .default(1)
            .describe('Nombre de clics (1 pour simple, 2 pour double-clic)'),
        delay: z.number().optional().default(50).describe('Délai entre les clics en millisecondes'),
        moveBeforeClick: z
            .boolean()
            .optional()
            .default(true)
            .describe('Déplacer la souris avant de cliquer'),
    }),
    execute: async (args, _context) => {
        const { x, y, pageId = currentPageId, button, clickCount, delay, moveBeforeClick } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active disponible pour le clic de souris');
        }
        const page = pages.get(pageId);
        try {
            // Validation des coordonnées
            const viewport = page.viewportSize();
            if (viewport) {
                if (x < 0 || x > viewport.width || y < 0 || y > viewport.height) {
                    throw new Error(`Coordonnées hors limites. Page: ${viewport.width}x${viewport.height}, Reçu: ${x},${y}`);
                }
            }
            // Déplacer la souris avant de cliquer si demandé
            if (moveBeforeClick) {
                await page.mouse.move(x, y);
                await page.waitForTimeout(50);
            }
            // Effectuer les clics
            const clickOptions = {
                button: button,
                clickCount,
                delay,
            };
            await page.mouse.click(x, y, clickOptions);
            const clickType = clickCount === 1 ? 'clic' : 'double-clic';
            const buttonText = button === 'left' ? 'gauche' : button === 'right' ? 'droit' : 'milieu';
            return `${clickType} ${buttonText} effectué aux coordonnées (${x}, ${y})`;
        }
        catch (error) {
            throw new Error(`Erreur lors du clic de souris: ${error.message}`);
        }
    },
};
// Tool: mouse_drag_xy
export const mouseDragXyTool = {
    name: 'mouse_drag_xy',
    description: 'Effectue un glisser-déposer (drag and drop) entre deux coordonnées',
    annotations: {
        category: ToolCategories.INTERACTION,
        readOnlyHint: false,
        requiresAuth: false,
        dangerous: false,
        experimental: false,
    },
    parameters: z.object({
        fromX: z.number().describe('Coordonnée X de départ'),
        fromY: z.number().describe('Coordonnée Y de départ'),
        toX: z.number().describe("Coordonnée X d'arrivée"),
        toY: z.number().describe("Coordonnée Y d'arrivée"),
        pageId: z.string().optional().describe('ID de la page, par défaut la page courante'),
        button: z
            .enum(['left', 'middle', 'right'])
            .optional()
            .default('left')
            .describe('Bouton de la souris à utiliser'),
        steps: z
            .number()
            .optional()
            .default(10)
            .describe("Nombre d'étapes pour le mouvement de glissement"),
        duration: z.number().optional().default(500).describe('Durée du glissement en millisecondes'),
        delayBeforeDrop: z
            .number()
            .optional()
            .default(100)
            .describe('Délai avant de relâcher le bouton en millisecondes'),
    }),
    execute: async (args, _context) => {
        const { fromX, fromY, toX, toY, pageId = currentPageId, button, steps, duration, delayBeforeDrop, } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active disponible pour le glisser-déposer');
        }
        const page = pages.get(pageId);
        try {
            // Validation des coordonnées
            const viewport = page.viewportSize();
            if (viewport) {
                const allCoords = [fromX, fromY, toX, toY];
                for (const coord of allCoords) {
                    if (coord < 0 || coord > Math.max(viewport.width, viewport.height)) {
                        throw new Error(`Coordonnées hors limites. Page: ${viewport.width}x${viewport.height}`);
                    }
                }
            }
            // Mouvement vers le point de départ
            await page.mouse.move(fromX, fromY);
            await page.waitForTimeout(50);
            // Presser le bouton de la souris
            await page.mouse.down({ button: button });
            // Glissement progressif
            const stepDuration = duration / steps;
            const deltaX = (toX - fromX) / steps;
            const deltaY = (toY - fromY) / steps;
            for (let i = 1; i <= steps; i++) {
                const currentX = fromX + deltaX * i;
                const currentY = fromY + deltaY * i;
                await page.mouse.move(currentX, currentY);
                await page.waitForTimeout(stepDuration);
            }
            // Délai avant de relâcher
            if (delayBeforeDrop > 0) {
                await page.waitForTimeout(delayBeforeDrop);
            }
            // Relâcher le bouton
            await page.mouse.up({ button: button });
            const buttonText = button === 'left' ? 'gauche' : button === 'right' ? 'droit' : 'milieu';
            return `Glisser-déposer effectué avec bouton ${buttonText} de (${fromX}, ${fromY}) vers (${toX}, ${toY}) en ${steps} étapes`;
        }
        catch (error) {
            throw new Error(`Erreur lors du glisser-déposer: ${error.message}`);
        }
    },
};
// Tool: visual_locate
export const visualLocateTool = {
    name: 'visual_locate',
    description: 'Localise visuellement des éléments sur la page et retourne leurs coordonnées',
    annotations: {
        category: ToolCategories.INTERACTION,
        readOnlyHint: true,
        requiresAuth: false,
        dangerous: false,
        experimental: true,
    },
    parameters: z.object({
        selector: z.string().optional().describe("Sélecteur CSS de l'élément à localiser"),
        text: z.string().optional().describe('Texte à rechercher sur la page'),
        pageId: z.string().optional().describe('ID de la page, par défaut la page courante'),
        tolerance: z
            .number()
            .optional()
            .default(5)
            .describe('Tolérance pour la recherche visuelle en pixels'),
        multiple: z
            .boolean()
            .optional()
            .default(false)
            .describe('Retourner toutes les occurrences ou seulement la première'),
    }),
    execute: async (args, _context) => {
        const { selector, text, pageId = currentPageId, multiple } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active disponible pour la localisation visuelle');
        }
        if (!selector && !text) {
            throw new Error('Veuillez spécifier soit un sélecteur CSS soit un texte à rechercher');
        }
        const page = pages.get(pageId);
        try {
            let elements = [];
            if (selector) {
                // Recherche par sélecteur CSS
                const foundElements = await page.$$(selector);
                for (let i = 0; i < foundElements.length; i++) {
                    const element = foundElements[i];
                    const boundingBox = await element.boundingBox();
                    if (boundingBox) {
                        elements.push({
                            index: i,
                            selector,
                            type: 'css_selector',
                            boundingBox: {
                                x: Math.round(boundingBox.x),
                                y: Math.round(boundingBox.y),
                                width: Math.round(boundingBox.width),
                                height: Math.round(boundingBox.height),
                            },
                            center: {
                                x: Math.round(boundingBox.x + boundingBox.width / 2),
                                y: Math.round(boundingBox.y + boundingBox.height / 2),
                            },
                        });
                    }
                }
            }
            else if (text) {
                // Recherche par texte simplifiée
                elements = await page.evaluate((searchText) => {
                    const results = [];
                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                    let node;
                    while ((node = walker.nextNode())) {
                        if (node.textContent && node.textContent.includes(searchText)) {
                            const range = document.createRange();
                            range.selectNodeContents(node);
                            const rects = range.getClientRects();
                            for (let i = 0; i < rects.length; i++) {
                                const rect = rects[i];
                                if (rect.width > 0 && rect.height > 0) {
                                    results.push({
                                        index: results.length,
                                        text: searchText,
                                        type: 'text_search',
                                        boundingBox: {
                                            x: Math.round(rect.left + window.scrollX),
                                            y: Math.round(rect.top + window.scrollY),
                                            width: Math.round(rect.width),
                                            height: Math.round(rect.height),
                                        },
                                        center: {
                                            x: Math.round(rect.left + rect.width / 2 + window.scrollX),
                                            y: Math.round(rect.top + rect.height / 2 + window.scrollY),
                                        },
                                    });
                                }
                            }
                        }
                    }
                    return results;
                }, text);
            }
            if (elements.length === 0) {
                return `Aucun élément trouvé pour la recherche: ${selector || text}`;
            }
            // Limiter les résultats si multiple est false
            const resultsToShow = multiple ? elements : [elements[0]];
            const response = {
                query: selector || text,
                queryType: selector ? 'css_selector' : 'text_search',
                totalFound: elements.length,
                returned: resultsToShow.length,
                elements: resultsToShow,
                viewport: await page.viewportSize(),
                timestamp: new Date().toISOString(),
            };
            return JSON.stringify(response, null, 2);
        }
        catch (error) {
            throw new Error(`Erreur lors de la localisation visuelle: ${error.message}`);
        }
    },
};
// Tool: get_viewport_size
export const getViewportSizeTool = {
    name: 'get_viewport_size',
    description: 'Retourne les dimensions actuelles de la vue (viewport) de la page',
    annotations: {
        category: ToolCategories.INTERACTION,
        readOnlyHint: true,
        requiresAuth: false,
        dangerous: false,
        experimental: false,
    },
    parameters: z.object({
        pageId: z.string().optional().describe('ID de la page, par défaut la page courante'),
    }),
    execute: async (args, _context) => {
        const { pageId = currentPageId } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active disponible');
        }
        const page = pages.get(pageId);
        try {
            const viewport = page.viewportSize();
            const scrollPosition = await page.evaluate(() => ({
                x: window.scrollX,
                y: window.scrollY,
            }));
            const pageDimensions = await page.evaluate(() => ({
                width: document.documentElement.scrollWidth,
                height: document.documentElement.scrollHeight,
            }));
            const response = {
                viewport: {
                    width: viewport?.width || 0,
                    height: viewport?.height || 0,
                },
                scrollPosition,
                pageDimensions,
                mousePosition: { x: 0, y: 0 },
                timestamp: new Date().toISOString(),
            };
            return JSON.stringify(response, null, 2);
        }
        catch (error) {
            throw new Error(`Erreur lors de l'obtention des dimensions: ${error.message}`);
        }
    },
};
// Tool: vision_info
export const visionInfoTool = {
    name: 'vision_info',
    description: 'Affiche les informations sur les capacités de vision et les outils disponibles',
    annotations: {
        category: ToolCategories.INTERACTION,
        readOnlyHint: true,
        requiresAuth: false,
        dangerous: false,
        experimental: false,
    },
    parameters: z.object({
        pageId: z.string().optional().describe('ID de la page pour vérifier la compatibilité'),
    }),
    execute: async (args, _context) => {
        const { pageId = currentPageId } = args;
        const info = {
            capability: Capability.VISION,
            enabled: true,
            availableTools: [
                'mouse_move_xy',
                'mouse_click_xy',
                'mouse_drag_xy',
                'visual_locate',
                'get_viewport_size',
                'vision_info',
            ],
            features: {
                mouseControl: 'Contrôle précis de la souris avec coordonnées absolues',
                visualLocation: "Localisation d'éléments par sélecteur CSS ou texte",
                dragDrop: 'Glisser-déposer avec contrôle du mouvement',
                viewportInfo: 'Informations sur les dimensions de la page',
                smoothMovement: 'Mouvements fluides avec étapes configurables',
            },
            coordinateSystem: {
                origin: 'coin supérieur gauche (0,0)',
                units: 'pixels',
                viewportRelative: 'true',
            },
            currentPage: pageId || 'Aucune',
            pageCount: pages.size,
        };
        if (pageId && pages.has(pageId)) {
            const page = pages.get(pageId);
            try {
                const viewport = page.viewportSize();
                info.currentPage = `${pageId} - Viewport: ${viewport?.width}x${viewport?.height}`;
            }
            catch {
                info.currentPage = `${pageId} (erreur lors de la récupération des infos)`;
            }
        }
        return JSON.stringify(info, null, 2);
    },
};
export const visionTools = [
    mouseMoveXyTool,
    mouseClickXyTool,
    mouseDragXyTool,
    visualLocateTool,
    getViewportSizeTool,
    visionInfoTool,
];
