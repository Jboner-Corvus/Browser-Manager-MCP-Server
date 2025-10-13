/**
 * @file src/capabilities/index.ts
 * @description Système de capacités modulaires pour Browser-Manager-MCP-Server-dist
 * Inspiré de Playwright MCP pour permettre l'extension des fonctionnalités
 */

import { z } from 'zod';

export enum Capability {
  PDF = 'pdf',
  VISION = 'vision',
  PERFORMANCE = 'performance',
  NETWORK = 'network',
  FORMS = 'forms',
  ADVANCED_INTERACTION = 'advanced_interaction',
  ACCESSIBILITY = 'accessibility',
  DEBUGGING = 'debugging',
}

export interface CapabilityConfig {
  enabled: boolean;
  tools: string[];
  dependencies?: Capability[];
  description: string;
}

export type CapabilitiesConfig = Record<Capability, CapabilityConfig>;

export const DEFAULT_CAPABILITIES: CapabilitiesConfig = {
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
  private config: CapabilitiesConfig;
  private enabledCapabilities: Set<Capability>;

  constructor(config: Partial<CapabilitiesConfig> = {}) {
    this.config = { ...DEFAULT_CAPABILITIES, ...config };
    this.enabledCapabilities = new Set();
    this.updateEnabledCapabilities();
  }

  private updateEnabledCapabilities(): void {
    this.enabledCapabilities.clear();
    for (const [capability, config] of Object.entries(this.config)) {
      if (config.enabled) {
        this.enabledCapabilities.add(capability as Capability);
      }
    }
  }

  isCapabilityEnabled(capability: Capability): boolean {
    return this.enabledCapabilities.has(capability);
  }

  getEnabledCapabilities(): Capability[] {
    return Array.from(this.enabledCapabilities);
  }

  getEnabledTools(): string[] {
    const tools: string[] = [];
    for (const capability of this.enabledCapabilities) {
      tools.push(...this.config[capability].tools);
    }
    return [...new Set(tools)]; // Remove duplicates
  }

  enableCapability(capability: Capability): void {
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

  disableCapability(capability: Capability): void {
    if (this.config[capability]) {
      this.config[capability].enabled = false;
      this.enabledCapabilities.delete(capability);
    }
  }

  getConfig(): CapabilitiesConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<CapabilitiesConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.updateEnabledCapabilities();
  }
}

// Schema for validating capability configuration
export const CapabilityConfigSchema = z.record(
  z.nativeEnum(Capability),
  z.object({
    enabled: z.boolean(),
    tools: z.array(z.string()),
    dependencies: z.array(z.nativeEnum(Capability)).optional(),
    description: z.string(),
  })
);

export function parseCapabilitiesFromArgs(args: string[]): Capability[] {
  const capabilities: Capability[] = [];

  for (const arg of args) {
    if (arg.startsWith('--caps=')) {
      const capsList = arg.substring(7);
      const caps = capsList.split(',') as Capability[];

      for (const cap of caps) {
        if (Object.values(Capability).includes(cap)) {
          capabilities.push(cap);
        }
      }
    } else if (arg === '--pdf') {
      capabilities.push(Capability.PDF);
    } else if (arg === '--vision') {
      capabilities.push(Capability.VISION);
    } else if (arg === '--performance') {
      capabilities.push(Capability.PERFORMANCE);
    } else if (arg === '--network') {
      capabilities.push(Capability.NETWORK);
    }
  }

  return capabilities;
}

export function createCapabilityManagerFromArgs(args: string[]): CapabilityManager {
  const requestedCaps = parseCapabilitiesFromArgs(args);
  const config: Partial<CapabilitiesConfig> = {};

  for (const cap of requestedCaps) {
    config[cap] = {
      ...DEFAULT_CAPABILITIES[cap],
      enabled: true,
    };
  }

  return new CapabilityManager(config);
}
