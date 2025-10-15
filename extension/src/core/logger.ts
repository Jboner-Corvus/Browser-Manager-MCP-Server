/**
 * Professional Logger Service - Enterprise Grade Logging
 * Implements structured logging with multiple levels and destinations
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  userId?: string;
  sessionId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  categories: string[];
}

class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private sessionId: string;
  private logs: LogEntry[] = [];

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      maxStorageEntries: 1000,
      categories: ['websocket', 'debugger', 'ui', 'connection', 'error']
    };
    this.loadLogsFromStorage();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem('extension_logs');
      if (stored) {
        this.logs = JSON.parse(stored).slice(-this.config.maxStorageEntries);
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error);
    }
  }

  private saveLogsToStorage(): void {
    if (!this.config.enableStorage) return;

    try {
      const recentLogs = this.logs.slice(-this.config.maxStorageEntries);
      localStorage.setItem('extension_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  private createLogEntry(level: LogLevel, category: string, message: string, data?: any, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      sessionId: this.sessionId
    };
  }

  private log(entry: LogEntry): void {
    if (entry.level < this.config.level) return;

    this.logs.push(entry);
    this.saveLogsToStorage();

    if (this.config.enableConsole) {
      const prefix = `[${entry.timestamp}] [${entry.category.toUpperCase()}]`;
      const args = [prefix, entry.message];

      if (entry.data) args.push(entry.data);
      if (entry.error) args.push(`${entry.error.name}: ${entry.error.message}`);

      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(...args);
          break;
        case LogLevel.INFO:
          console.info(...args);
          break;
        case LogLevel.WARN:
          console.warn(...args);
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(...args);
          if (entry.error?.stack) console.error('Stack trace:', entry.error.stack);
          break;
      }
    }
  }

  debug(category: string, message: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, category, message, data);
    this.log(entry);
  }

  info(category: string, message: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.INFO, category, message, data);
    this.log(entry);
  }

  warn(category: string, message: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.WARN, category, message, data);
    this.log(entry);
  }

  error(category: string, message: string, error?: Error, data?: any): void {
    const entry = this.createLogEntry(LogLevel.ERROR, category, message, data, error);
    this.log(entry);
  }

  critical(category: string, message: string, error?: Error, data?: any): void {
    const entry = this.createLogEntry(LogLevel.CRITICAL, category, message, data, error);
    this.log(entry);
  }

  getLogs(category?: string, level?: LogLevel): LogEntry[] {
    return this.logs.filter(log =>
      (!category || log.category === category) &&
      (!level || log.level >= level)
    );
  }

  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('extension_logs');
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const logger = Logger.getInstance();