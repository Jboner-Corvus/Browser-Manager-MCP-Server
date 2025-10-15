/**
 * @file src/tools/categories.ts
 * @description Catégories d'outils pour Browser-Manager-MCP-Server-dist
 * Inspiré de Chrome DevTools MCP pour une meilleure organisation
 */

export enum ToolCategories {
  BROWSER_MANAGEMENT = 'Browser Management',
  TAB_MANAGEMENT = 'Tab Management',
  NAVIGATION = 'Navigation',
  INTERACTION = 'User Interaction',
  CAPTURE = 'Content Capture',
  SCRIPTING = 'Scripting & Debugging',
  PERFORMANCE = 'Performance Monitoring',
  NETWORK = 'Network Analysis',
  SECURITY = 'Security & Authentication',
}

export interface ToolAnnotations {
  category: ToolCategories;
  readOnlyHint?: boolean;
  requiresAuth?: boolean;
  dangerous?: boolean;
  experimental?: boolean;
}

export interface ToolMetadata {
  name: string;
  description: string;
  category: ToolCategories;
  annotations: ToolAnnotations;
  examples?: string[];
  relatedTools?: string[];
}
