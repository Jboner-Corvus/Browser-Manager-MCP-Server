/**
 * @file src/tools/pdfTools.ts
 * @description Outils PDF pour Browser-Manager-MCP-Server-dist
 * Capacité PDF pour générer et manipuler des documents PDF
 */
import { z } from 'zod';
import { ToolCategories } from './categories.js';
import { Capability } from '../capabilities/index.js';
import { promises as fs } from 'fs';
// Import des états globaux depuis browserTools
import { pages, currentPageId } from './browserTools.js';
// Tool: pdf_save
export const pdfSaveTool = {
    name: 'pdf_save',
    description: "Génère un PDF de la page actuelle ou d'une page spécifique",
    annotations: {
        category: ToolCategories.CAPTURE,
        readOnlyHint: true,
        requiresAuth: false,
        dangerous: false,
        experimental: false,
    },
    parameters: z.object({
        pageId: z.string().optional().describe('ID de la page, par défaut la page courante'),
        path: z
            .string()
            .optional()
            .default('output.pdf')
            .describe('Chemin où sauvegarder le fichier PDF'),
        format: z
            .enum(['A4', 'A3', 'A0', 'A1', 'A2', 'A5', 'A6', 'Letter', 'Legal', 'Tabloid', 'Ledger'])
            .optional()
            .default('A4')
            .describe('Format du papier'),
        landscape: z
            .boolean()
            .optional()
            .default(false)
            .describe('Orientation paysage si true, portrait si false'),
        printBackground: z
            .boolean()
            .optional()
            .default(true)
            .describe('Inclure les images et couleurs de fond'),
        margin: z
            .object({
            top: z.string().optional().default('1cm'),
            bottom: z.string().optional().default('1cm'),
            left: z.string().optional().default('1cm'),
            right: z.string().optional().default('1cm'),
        })
            .optional()
            .describe('Marges du document'),
        scale: z.number().optional().default(1).describe('Échelle du document (0.1 à 2)'),
        displayHeaderFooter: z
            .boolean()
            .optional()
            .default(false)
            .describe('Afficher en-tête et pied de page'),
        headerTemplate: z
            .string()
            .optional()
            .default('<div style="font-size:10px; width:100%; text-align:center;"><span class="date"></span></div>')
            .describe("Template pour l'en-tête"),
        footerTemplate: z
            .string()
            .optional()
            .default('<div style="font-size:10px; width:100%; text-align:center;">Page <span class="pageNumber"></span> sur <span class="totalPages"></span></div>')
            .describe('Template pour le pied de page'),
        preferCSSPageSize: z
            .boolean()
            .optional()
            .default(false)
            .describe('Préférer la taille de page CSS'),
    }),
    execute: async (args, _context) => {
        const { pageId = currentPageId, path, format, landscape, printBackground, margin, scale, displayHeaderFooter, headerTemplate, footerTemplate, preferCSSPageSize, } = args;
        if (!pageId || !pages.has(pageId)) {
            throw new Error('Aucune page active disponible pour la génération PDF');
        }
        const page = pages.get(pageId);
        try {
            const pdfOptions = {
                path,
                format,
                landscape,
                printBackground,
                margin,
                scale,
                displayHeaderFooter,
                headerTemplate,
                footerTemplate,
                preferCSSPageSize,
            };
            await page.pdf(pdfOptions);
            return `PDF généré avec succès : ${path}
Format: ${format}
Orientation: ${landscape ? 'Paysage' : 'Portrait'}
Échelle: ${scale}x
Marges: ${JSON.stringify(margin)}`;
        }
        catch (error) {
            throw new Error(`Erreur lors de la génération du PDF: ${error.message}`);
        }
    },
};
// Tool: pdf_print_multiple_pages
export const pdfPrintMultiplePagesTool = {
    name: 'pdf_print_multiple_pages',
    description: 'Génère un PDF contenant plusieurs pages/onglets',
    annotations: {
        category: ToolCategories.CAPTURE,
        readOnlyHint: true,
        requiresAuth: false,
        dangerous: false,
        experimental: true,
    },
    parameters: z.object({
        pageIds: z.array(z.string()).describe('Liste des IDs des pages à inclure dans le PDF'),
        path: z
            .string()
            .optional()
            .default('multi_page.pdf')
            .describe('Chemin où sauvegarder le fichier PDF'),
        format: z
            .enum(['A4', 'A3', 'A0', 'A1', 'A2', 'A5', 'A6', 'Letter', 'Legal', 'Tabloid', 'Ledger'])
            .optional()
            .default('A4')
            .describe('Format du papier'),
        landscape: z
            .boolean()
            .optional()
            .default(false)
            .describe('Orientation paysage si true, portrait si false'),
        printBackground: z
            .boolean()
            .optional()
            .default(true)
            .describe('Inclure les images et couleurs de fond'),
        margin: z
            .object({
            top: z.string().optional().default('1cm'),
            bottom: z.string().optional().default('1cm'),
            left: z.string().optional().default('1cm'),
            right: z.string().optional().default('1cm'),
        })
            .optional()
            .describe('Marges du document'),
        pageBreaks: z
            .boolean()
            .optional()
            .default(true)
            .describe('Ajouter des sauts de page entre chaque page'),
    }),
    execute: async (args, _context) => {
        const { pageIds, path, format, landscape, printBackground, margin } = args;
        if (!pageIds || pageIds.length === 0) {
            throw new Error('Veuillez spécifier au moins une page pour la génération PDF');
        }
        const validPages = pageIds.filter((id) => pages.has(id));
        if (validPages.length === 0) {
            throw new Error("Aucune des pages spécifiées n'est valide");
        }
        const pdfBuffers = [];
        const pageTitles = [];
        try {
            // Générer un PDF pour chaque page
            for (const pageId of validPages) {
                const page = pages.get(pageId);
                const pdfOptions = {
                    format,
                    landscape,
                    printBackground,
                    margin,
                    preferCSSPageSize: false,
                };
                const pdfBuffer = await page.pdf(pdfOptions);
                pdfBuffers.push(pdfBuffer);
                const title = await page.title();
                pageTitles.push(title);
            }
            // Pour l'instant, on sauvegarde seulement le premier PDF
            // Note: La fusion de PDFs nécessiterait une librairie externe comme pdf-lib
            if (pdfBuffers.length > 0) {
                await fs.writeFile(path, pdfBuffers[0]);
            }
            return `PDF multi-page généré avec succès : ${path}
Pages incluses: ${pageTitles.join(', ')}
Nombre de pages: ${validPages.length}
Note: Actuellement seul le premier PDF est sauvegardé. La fusion complète nécessite une librairie externe.`;
        }
        catch (error) {
            throw new Error(`Erreur lors de la génération du PDF multi-page: ${error.message}`);
        }
    },
};
// Tool: pdf_info
export const pdfInfoTool = {
    name: 'pdf_info',
    description: 'Affiche les informations sur les capacités PDF et les options disponibles',
    annotations: {
        category: ToolCategories.CAPTURE,
        readOnlyHint: true,
        requiresAuth: false,
        dangerous: false,
        experimental: false,
    },
    parameters: z.object({
        pageId: z.string().optional().describe('ID de la page pour vérifier la compatibilité PDF'),
    }),
    execute: async (args, _context) => {
        const { pageId = currentPageId } = args;
        const info = {
            capability: Capability.PDF,
            enabled: true,
            availableTools: ['pdf_save', 'pdf_print_multiple_pages', 'pdf_info'],
            supportedFormats: [
                'A4',
                'A3',
                'A0',
                'A1',
                'A2',
                'A5',
                'A6',
                'Letter',
                'Legal',
                'Tabloid',
                'Ledger',
            ],
            options: {
                landscape: 'Orientation paysage/portrait',
                printBackground: 'Inclure les images de fond',
                margin: 'Marges personnalisables',
                scale: 'Échelle (0.1 à 2.0)',
                headerFooter: 'En-tête et pied de page personnalisés',
                preferCSSPageSize: 'Utiliser la taille de page CSS',
            },
            currentPage: pageId || 'Aucune',
            pageCount: pages.size,
        };
        if (pageId && pages.has(pageId)) {
            const page = pages.get(pageId);
            try {
                const title = await page.title();
                const url = page.url();
                info.currentPage = `${pageId} (${title}) - ${url}`;
            }
            catch {
                info.currentPage = `${pageId} (erreur lors de la récupération des infos)`;
            }
        }
        return JSON.stringify(info, null, 2);
    },
};
export const pdfTools = [pdfSaveTool, pdfPrintMultiplePagesTool, pdfInfoTool];
