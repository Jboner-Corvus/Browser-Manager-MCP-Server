/**
 * Professional State Management
 * Centralized state management with persistence, validation, and reactive updates
 */

import { logger } from './logger';

export type StateListener<T = any> = (newValue: T, oldValue: T, path: string) => void;

export interface StateSchema {
  connection: {
    isConnected: boolean;
    connectedTabId: number | null;
    serverUrl: string;
    lastConnectedAt: Date | null;
    reconnectAttempts: number;
  };
  ui: {
    activeView: 'connect' | 'status' | 'settings';
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    autoReconnect: boolean;
  };
  performance: {
    connectionLatency: number;
    messageCount: number;
    errorCount: number;
    uptime: number;
  };
  user: {
    preferences: Record<string, any>;
    recentConnections: Array<{
      url: string;
      timestamp: Date;
      successful: boolean;
    }>;
  };
}

export type StatePath = keyof StateSchema | string;

interface StateValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

interface StateValidation<T> {
  [key: string]: StateValidationRule<T>[];
}

export class StateManager {
  private static instance: StateManager;
  private state: StateSchema;
  private listeners: Map<string, Set<StateListener>> = new Map();
  private validationRules: StateValidation<any> = {};
  private persistenceKey = 'browser_manager_state';
  private batchUpdates: Map<string, any> = new Map();
  private isBatching = false;

  private constructor() {
    this.state = this.getInitialState();
    this.loadFromStorage();
    this.setupValidationRules();
    this.setupAutoSave();
  }

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  private getInitialState(): StateSchema {
    return {
      connection: {
        isConnected: false,
        connectedTabId: null,
        serverUrl: '',
        lastConnectedAt: null,
        reconnectAttempts: 0
      },
      ui: {
        activeView: 'connect',
        theme: 'auto',
        notifications: true,
        autoReconnect: true
      },
      performance: {
        connectionLatency: 0,
        messageCount: 0,
        errorCount: 0,
        uptime: 0
      },
      user: {
        preferences: {},
        recentConnections: []
      }
    };
  }

  private setupValidationRules(): void {
    // Connection validation
    this.validationRules['connection.serverUrl'] = [
      {
        validate: (url: string) => !url || this.isValidUrl(url),
        message: 'URL must be a valid WebSocket URL'
      }
    ];

    this.validationRules['connection.reconnectAttempts'] = [
      {
        validate: (attempts: number) => attempts >= 0 && attempts <= 10,
        message: 'Reconnect attempts must be between 0 and 10'
      }
    ];

    // UI validation
    this.validationRules['ui.theme'] = [
      {
        validate: (theme: string) => ['light', 'dark', 'auto'].includes(theme),
        message: 'Theme must be one of: light, dark, auto'
      }
    ];

    // Performance validation
    this.validationRules['performance.connectionLatency'] = [
      {
        validate: (latency: number) => latency >= 0,
        message: 'Connection latency must be non-negative'
      }
    ];
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  private setupAutoSave(): void {
    // Save to storage every 30 seconds if there are changes
    setInterval(() => {
      this.saveToStorage();
    }, 30000);

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.persistenceKey);
      if (stored) {
        const parsedState = JSON.parse(stored);
        this.mergeState(parsedState);
        logger.info('state-manager', 'State loaded from storage');
      }
    } catch (error) {
      logger.error('state-manager', 'Failed to load state from storage', error as Error);
    }
  }

  private saveToStorage(): void {
    try {
      const stateToSave = this.prepareForSerialization();
      localStorage.setItem(this.persistenceKey, JSON.stringify(stateToSave));
      logger.debug('state-manager', 'State saved to storage');
    } catch (error) {
      logger.error('state-manager', 'Failed to save state to storage', error as Error);
    }
  }

  private prepareForSerialization(): Partial<StateSchema> {
    // Convert Date objects to ISO strings and limit array sizes
    const serialized = JSON.parse(JSON.stringify(this.state));

    // Limit recent connections to last 20
    if (serialized.user?.recentConnections) {
      serialized.user.recentConnections = serialized.user.recentConnections.slice(-20);
    }

    // Convert dates to strings
    if (serialized.connection?.lastConnectedAt) {
      serialized.connection.lastConnectedAt = new Date(serialized.connection.lastConnectedAt).toISOString();
    }

    if (serialized.user?.recentConnections) {
      serialized.user.recentConnections.forEach((conn: any) => {
        if (conn.timestamp) {
          conn.timestamp = new Date(conn.timestamp).toISOString();
        }
      });
    }

    return serialized;
  }

  private mergeState(newState: Partial<StateSchema>): void {
    this.batchUpdate(() => {
      this.deepMerge(this.state, newState);
    });
  }

  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        this.deepMerge(target[key], source[key]);
      } else {
        this.setValueAtPath(key, source[key], false);
      }
    }
  }

  getValue<T = any>(path: string, fromState?: any): T {
    const keys = path.split('.');
    let current: any = fromState || this.state;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined as T;
      }
    }

    // Convert ISO strings back to Date objects
    if (current && typeof current === 'string' && path.includes('Date') || path.includes('timestamp')) {
      const date = new Date(current);
      if (!isNaN(date.getTime())) {
        return date as T;
      }
    }

    return current as T;
  }

  setValue<T = any>(path: string, value: T): boolean {
    return this.setValueAtPath(path, value, true);
  }

  private setValueAtPath<T = any>(path: string, value: T, notify: boolean = true): boolean {
    // Validate the value
    if (!this.validateValue(path, value)) {
      logger.warn('state-manager', `Validation failed for ${path}`, { value });
      return false;
    }

    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current: any = this.state;

    // Navigate to the parent object
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    const oldValue = current[lastKey];

    // Only update if the value actually changed
    if (!this.deepEqual(oldValue, value)) {
      current[lastKey] = value;

      logger.debug('state-manager', `State updated: ${path}`, {
        oldValue,
        newValue: value
      });

      if (notify && !this.isBatching) {
        this.notifyListeners(path, value, oldValue);
      } else if (this.isBatching) {
        this.batchUpdates.set(path, { value, oldValue });
      }

      return true;
    }

    return false;
  }

  private validateValue(path: string, value: any): boolean {
    const rules = this.validationRules[path];
    if (!rules) return true;

    return rules.every(rule => {
      const isValid = rule.validate(value);
      if (!isValid) {
        logger.warn('state-validation', rule.message, { path, value });
      }
      return isValid;
    });
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((val, index) => this.deepEqual(val, b[index]));
    }
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      return keysA.length === keysB.length &&
        keysA.every(key => this.deepEqual(a[key], b[key]));
    }
    return false;
  }

  private notifyListeners(path: string, newValue: any, oldValue: any): void {
    // Notify exact path listeners
    const exactListeners = this.listeners.get(path);
    if (exactListeners) {
      exactListeners.forEach(listener => {
        try {
          listener(newValue, oldValue, path);
        } catch (error) {
          logger.error('state-manager', 'Error in state listener', error as Error, { path });
        }
      });
    }

    // Notify parent path listeners
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      const parentListeners = this.listeners.get(parentPath);
      if (parentListeners) {
        const parentValue = this.getValue(parentPath);
        parentListeners.forEach(listener => {
          try {
            listener(parentValue, this.getValue(parentPath), parentPath);
          } catch (error) {
            logger.error('state-manager', 'Error in parent state listener', error as Error, { path: parentPath });
          }
        });
      }
    }
  }

  subscribe<T = any>(path: string, listener: StateListener<T>): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }

    this.listeners.get(path)!.add(listener);

    // Immediately call the listener with the current value
    const currentValue = this.getValue<T>(path);
    setTimeout(() => {
      listener(currentValue, currentValue, path);
    }, 0);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(path);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  batchUpdate(fn: () => void): void {
    this.isBatching = true;
    this.batchUpdates.clear();

    try {
      fn();
    } finally {
      this.isBatching = false;

      // Notify all batched updates
      for (const [path, { value, oldValue }] of this.batchUpdates.entries()) {
        this.notifyListeners(path, value, oldValue);
      }

      this.batchUpdates.clear();
    }
  }

  reset(path?: string): void {
    if (path) {
      const initialState = this.getInitialState();
      const initialValue = this.getValue(path, initialState);
      this.setValue(path, initialValue);
    } else {
      this.state = this.getInitialState();
      this.saveToStorage();
      logger.info('state-manager', 'All state reset to initial values');
    }
  }

  exportState(): string {
    return JSON.stringify(this.state, null, 2);
  }

  importState(stateJson: string): boolean {
    try {
      const importedState = JSON.parse(stateJson);
      this.mergeState(importedState);
      this.saveToStorage();
      logger.info('state-manager', 'State imported successfully');
      return true;
    } catch (error) {
      logger.error('state-manager', 'Failed to import state', error as Error);
      return false;
    }
  }

  addValidationRule<T>(path: string, rule: StateValidationRule<T>): void {
    if (!this.validationRules[path]) {
      this.validationRules[path] = [];
    }
    this.validationRules[path].push(rule);
    logger.debug('state-manager', `Validation rule added for ${path}`);
  }

  getPerformanceMetrics(): {
    totalListeners: number;
    totalPaths: number;
    memoryUsage: number;
  } {
    let totalListeners = 0;
    for (const listeners of this.listeners.values()) {
      totalListeners += listeners.size;
    }

    return {
      totalListeners,
      totalPaths: this.listeners.size,
      memoryUsage: JSON.stringify(this.state).length
    };
  }
}

export const stateManager = StateManager.getInstance();