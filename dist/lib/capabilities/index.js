/**
 * @file src/capabilities/index.ts
 * @description Système de capacités modulaires pour Browser-Manager-MCP-Server-dist
 * Inspiré de Playwright MCP pour permettre l'extension des fonctionnalités
 */
import { z } from 'zod';
export var Capability;
(function (Capability) {
    Capability["PDF"] = "pdf";
    Capability["VISION"] = "vision";
    Capability["PERFORMANCE"] = "performance";
    Capability["NETWORK"] = "network";
    Capability["FORMS"] = "forms";
    Capability["ADVANCED_INTERACTION"] = "advanced_interaction";
    Capability["ACCESSIBILITY"] = "accessibility";
    Capability["DEBUGGING"] = "debugging";
})(Capability || (Capability = {}));
export const DEFAULT_CAPABILITIES = {
    [Capability.PDF]: {
        enabled: false,
        tools: ['pdf_save', 'pdf_print'],
        description: 'PDF generation and manipulation capabilities',
    },
    [Capability.VISION]: {
        enabled: false,
        tools: ['mouse_move_xy', 'mouse_click_xy', 'mouse_drag_xy', 'visual_locate'],
        description: 'Advanced mouse control and visual recognition',
    },
    [Capability.PERFORMANCE]: {
        enabled: false,
        tools: ['performance_metrics', 'performance_trace', 'memory_usage'],
        description: 'Performance monitoring and profiling',
    },
    [Capability.NETWORK]: {
        enabled: false,
        tools: ['network_monitor', 'network_throttle', 'network_intercept'],
        description: 'Network request monitoring and manipulation',
    },
    [Capability.FORMS]: {
        enabled: true,
        tools: ['fill_form_smart', 'form_analyze', 'form_validate'],
        description: 'Intelligent form detection and filling',
    },
    [Capability.ADVANCED_INTERACTION]: {
        enabled: true,
        tools: ['drag_drop', 'file_upload', 'multi_select'],
        description: 'Advanced user interaction patterns',
    },
    [Capability.ACCESSIBILITY]: {
        enabled: true,
        tools: ['accessibility_scan', 'accessibility_tree', 'contrast_check'],
        description: 'Accessibility testing and analysis',
    },
    [Capability.DEBUGGING]: {
        enabled: true,
        tools: ['debug_breakpoint', 'debug_step', 'debug_inspect'],
        description: 'Advanced debugging capabilities',
    },
};
export class CapabilityManager {
    config;
    enabledCapabilities;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CAPABILITIES, ...config };
        this.enabledCapabilities = new Set();
        this.updateEnabledCapabilities();
    }
    updateEnabledCapabilities() {
        this.enabledCapabilities.clear();
        for (const [capability, config] of Object.entries(this.config)) {
            if (config.enabled) {
                this.enabledCapabilities.add(capability);
            }
        }
    }
    isCapabilityEnabled(capability) {
        return this.enabledCapabilities.has(capability);
    }
    getEnabledCapabilities() {
        return Array.from(this.enabledCapabilities);
    }
    getEnabledTools() {
        const tools = [];
        for (const capability of this.enabledCapabilities) {
            tools.push(...this.config[capability].tools);
        }
        return [...new Set(tools)]; // Remove duplicates
    }
    enableCapability(capability) {
        if (this.config[capability]) {
            // Check dependencies
            const deps = this.config[capability].dependencies || [];
            for (const dep of deps) {
                if (!this.isCapabilityEnabled(dep)) {
                    throw new Error(`Cannot enable ${capability}: dependency ${dep} is not enabled`);
                }
            }
            this.config[capability].enabled = true;
            this.enabledCapabilities.add(capability);
        }
    }
    disableCapability(capability) {
        if (this.config[capability]) {
            this.config[capability].enabled = false;
            this.enabledCapabilities.delete(capability);
        }
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.updateEnabledCapabilities();
    }
}
// Schema for validating capability configuration
export const CapabilityConfigSchema = z.record(z.nativeEnum(Capability), z.object({
    enabled: z.boolean(),
    tools: z.array(z.string()),
    dependencies: z.array(z.nativeEnum(Capability)).optional(),
    description: z.string(),
}));
export function parseCapabilitiesFromArgs(args) {
    const capabilities = [];
    for (const arg of args) {
        if (arg.startsWith('--caps=')) {
            const capsList = arg.substring(7);
            const caps = capsList.split(',');
            for (const cap of caps) {
                if (Object.values(Capability).includes(cap)) {
                    capabilities.push(cap);
                }
            }
        }
        else if (arg === '--pdf') {
            capabilities.push(Capability.PDF);
        }
        else if (arg === '--vision') {
            capabilities.push(Capability.VISION);
        }
        else if (arg === '--performance') {
            capabilities.push(Capability.PERFORMANCE);
        }
        else if (arg === '--network') {
            capabilities.push(Capability.NETWORK);
        }
    }
    return capabilities;
}
export function createCapabilityManagerFromArgs(args) {
    const requestedCaps = parseCapabilitiesFromArgs(args);
    const config = {};
    for (const cap of requestedCaps) {
        config[cap] = {
            ...DEFAULT_CAPABILITIES[cap],
            enabled: true,
        };
    }
    return new CapabilityManager(config);
}
