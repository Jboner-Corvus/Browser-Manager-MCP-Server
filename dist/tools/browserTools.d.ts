import { z } from 'zod';
import type { Context } from 'fastmcp';
import type { AuthData } from '../types.js';
export declare const launchBrowserTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        headless: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        browser: z.ZodDefault<z.ZodOptional<z.ZodEnum<["chromium", "firefox", "webkit"]>>>;
    }, "strip", z.ZodTypeAny, {
        headless: boolean;
        browser: "chromium" | "firefox" | "webkit";
    }, {
        headless?: boolean | undefined;
        browser?: "chromium" | "firefox" | "webkit" | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const listBrowsersTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    execute: (_args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const detectOpenBrowsersTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    execute: (_args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const closeBrowserTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        browserId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        browserId: string;
    }, {
        browserId: string;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const listTabsTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        contextId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        contextId?: string | undefined;
    }, {
        contextId?: string | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const selectTabTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        pageId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        pageId: string;
    }, {
        pageId: string;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const newTabTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        contextId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        contextId?: string | undefined;
    }, {
        contextId?: string | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const closeTabTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        pageId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pageId?: string | undefined;
    }, {
        pageId?: string | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const navigateTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        url: z.ZodString;
        pageId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        pageId?: string | undefined;
    }, {
        url: string;
        pageId?: string | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const screenshotTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        pageId: z.ZodOptional<z.ZodString>;
        fullPage: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        fullPage: boolean;
        pageId?: string | undefined;
    }, {
        pageId?: string | undefined;
        fullPage?: boolean | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const clickTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        selector: z.ZodString;
        pageId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        selector: string;
        pageId?: string | undefined;
    }, {
        selector: string;
        pageId?: string | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const typeTextTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        selector: z.ZodString;
        text: z.ZodString;
        pageId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        selector: string;
        text: string;
        pageId?: string | undefined;
    }, {
        selector: string;
        text: string;
        pageId?: string | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const waitForTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        time: z.ZodOptional<z.ZodNumber>;
        pageId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pageId?: string | undefined;
        text?: string | undefined;
        time?: number | undefined;
    }, {
        pageId?: string | undefined;
        text?: string | undefined;
        time?: number | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const getHtmlTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        pageId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pageId?: string | undefined;
    }, {
        pageId?: string | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const getConsoleLogsTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        pageId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pageId?: string | undefined;
    }, {
        pageId?: string | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const evaluateScriptTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        script: z.ZodString;
        pageId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        script: string;
        pageId?: string | undefined;
    }, {
        script: string;
        pageId?: string | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
export declare const listExternalBrowserTabsTool: {
    name: string;
    description: string;
    parameters: z.ZodObject<{
        browserName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        browserName?: string | undefined;
    }, {
        browserName?: string | undefined;
    }>;
    execute: (args: any, _context: Context<AuthData>) => Promise<string>;
};
