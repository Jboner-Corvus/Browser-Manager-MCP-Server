/**
 * Enterprise Error Handler
 * Centralized error handling with categorization, recovery strategies, and user-friendly messages
 */

import { logger, LogLevel } from './logger';

export enum ErrorCategory {
  NETWORK = 'network',
  WEBSOCKET = 'websocket',
  DEBUGGER = 'debugger',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  technicalMessage: string;
  userMessage: string;
  timestamp: Date;
  context?: any;
  recoverable: boolean;
  recoveryAction?: () => Promise<void>;
}

export interface ErrorRecoveryStrategy {
  canHandle(error: AppError): boolean;
  recover(error: AppError): Promise<boolean>;
  maxRetries?: number;
  retryDelay?: number;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHistory: AppError[] = [];
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private maxErrorHistory = 100;
  private errorCounts: Map<string, number> = new Map();

  private constructor() {
    this.setupDefaultRecoveryStrategies();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupDefaultRecoveryStrategies(): void {
    // WebSocket reconnection strategy
    this.addRecoveryStrategy({
      canHandle: (error: AppError) =>
        error.category === ErrorCategory.WEBSOCKET &&
        error.severity !== ErrorSeverity.CRITICAL,

      recover: async (error: AppError): Promise<boolean> => {
        logger.info('error-handler', 'Attempting WebSocket reconnection recovery', { errorId: error.id });
        // This would be implemented by the connection manager
        return false; // Let connection manager handle reconnection
      },

      maxRetries: 3,
      retryDelay: 2000
    });

    // Permission request strategy
    this.addRecoveryStrategy({
      canHandle: (error: AppError) => error.category === ErrorCategory.PERMISSION,

      recover: async (error: AppError): Promise<boolean> => {
        try {
          logger.info('error-handler', 'Requesting missing permissions');
          await chrome.permissions.request({
            permissions: ['debugger', 'tabs']
          });
          return true;
        } catch (err) {
          logger.error('error-handler', 'Failed to request permissions', err as Error);
          return false;
        }
      }
    });

    // Debugger reconnection strategy
    this.addRecoveryStrategy({
      canHandle: (error: AppError) => error.category === ErrorCategory.DEBUGGER,

      recover: async (error: AppError): Promise<boolean> => {
        logger.info('error-handler', 'Attempting debugger reconnection');
        try {
          // Implementation would depend on specific debugger context
          return false;
        } catch (err) {
          return false;
        }
      }
    });
  }

  createError(
    category: ErrorCategory,
    code: string,
    technicalMessage: string,
    context?: any,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): AppError {
    const errorId = this.generateErrorId();
    const userMessage = this.generateUserMessage(category, code, technicalMessage);
    const recoverable = this.isRecoverable(category, code);

    const error: AppError = {
      id: errorId,
      category,
      severity,
      code,
      message: technicalMessage,
      technicalMessage,
      userMessage,
      timestamp: new Date(),
      context,
      recoverable
    };

    this.recordError(error);
    return error;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserMessage(category: ErrorCategory, code: string, technicalMessage: string): string {
    const messageMap: Record<string, string> = {
      [`${ErrorCategory.NETWORK}_connection_failed`]:
        'Impossible de se connecter au serveur. Vérifiez votre connexion Internet et réessayez.',

      [`${ErrorCategory.WEBSOCKET}_connection_closed`]:
        'La connexion avec le serveur a été interrompue. Tentative de reconnexion automatique...',

      [`${ErrorCategory.DEBUGGER}_attach_failed`]:
        'Impossible d\'attacher le débogueur à l\'onglet. Assurez-vous que l\'onglet est accessible.',

      [`${ErrorCategory.PERMISSION}_missing`]:
        'L\'extension nécessite des permissions supplémentaires. Veuillez les accéder dans les paramètres.',

      [`${ErrorCategory.TIMEOUT}_operation`]:
        'L\'opération a pris trop de temps. Veuillez réessayer.',

      [`${ErrorCategory.VALIDATION}_invalid_url`]:
        'L\'URL fournie n\'est pas valide. Veuillez vérifier et corriger.',

      default: 'Une erreur est survenue. Veuillez réessayer ou contacter le support si le problème persiste.'
    };

    const key = `${category}_${code}`;
    return messageMap[key] || messageMap.default;
  }

  private isRecoverable(category: ErrorCategory, code: string): boolean {
    const nonRecoverableErrors = [
      `${ErrorCategory.PERMISSION}_denied`,
      `${ErrorCategory.DEBUGGER}_not_supported`,
      `${ErrorCategory.VALIDATION}_malformed_request`
    ];

    return !nonRecoverableErrors.includes(`${category}_${code}`);
  }

  private recordError(error: AppError): void {
    this.errorHistory.push(error);

    // Keep only recent errors
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift();
    }

    // Track error frequency
    const errorKey = `${error.category}_${error.code}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Log the error
    logger.error('app-error', error.technicalMessage, undefined, {
      errorId: error.id,
      category: error.category,
      code: error.code,
      severity: error.severity,
      context: error.context,
      frequency: currentCount + 1
    });

    // Check for error patterns that might indicate systemic issues
    this.checkForErrorPatterns(error);
  }

  private checkForErrorPatterns(error: AppError): void {
    const errorKey = `${error.category}_${error.code}`;
    const frequency = this.errorCounts.get(errorKey) || 0;

    if (frequency >= 5 && frequency % 5 === 0) {
      logger.warn('error-pattern', `Recurring error detected: ${errorKey}`, {
        frequency,
        severity: error.severity,
        lastOccurrence: error.timestamp
      });
    }

    if (error.severity === ErrorSeverity.CRITICAL) {
      logger.critical('critical-error', 'Critical error occurred', undefined, {
        errorId: error.id,
        category: error.category,
        code: error.code,
        timestamp: error.timestamp
      });
    }
  }

  async handleError(error: Error | AppError, context?: any): Promise<AppError> {
    let appError: AppError;

    if (this.isAppError(error)) {
      appError = { ...error, context: { ...error.context, ...context } };
    } else {
      appError = this.createError(
        ErrorCategory.UNKNOWN,
        'unexpected_error',
        error.message,
        { originalError: error, ...context },
        ErrorSeverity.MEDIUM
      );
    }

    // Attempt recovery if the error is recoverable
    if (appError.recoverable) {
      await this.attemptRecovery(appError);
    }

    return appError;
  }

  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'id' in error && 'category' in error;
  }

  private async attemptRecovery(error: AppError): Promise<void> {
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canHandle(error)) {
        const maxRetries = strategy.maxRetries || 1;
        const retryDelay = strategy.retryDelay || 1000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            logger.info('error-recovery', `Attempting recovery (attempt ${attempt}/${maxRetries})`, {
              errorId: error.id,
              strategy: strategy.constructor.name
            });

            const recovered = await strategy.recover(error);
            if (recovered) {
              logger.info('error-recovery', 'Recovery successful', { errorId: error.id });
              return;
            }
          } catch (recoveryError) {
            logger.error('error-recovery', 'Recovery attempt failed', recoveryError as Error, {
              errorId: error.id,
              attempt
            });
          }

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
    }
  }

  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    logger.debug('error-handler', 'Recovery strategy added', { strategy: strategy.constructor.name });
  }

  getErrorHistory(category?: ErrorCategory, severity?: ErrorSeverity): AppError[] {
    return this.errorHistory.filter(error =>
      (!category || error.category === category) &&
      (!severity || error.severity === severity)
    );
  }

  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: AppError[];
  } {
    const errorsByCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = this.errorHistory.filter(error => error.category === category).length;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsBySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = this.errorHistory.filter(error => error.severity === severity).length;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const recentErrors = this.errorHistory.slice(-10);

    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors
    };
  }

  clearErrorHistory(): void {
    this.errorHistory = [];
    this.errorCounts.clear();
    logger.info('error-handler', 'Error history cleared');
  }

  exportErrorReport(): string {
    const stats = this.getErrorStats();
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      errors: this.errorHistory,
      patterns: Array.from(this.errorCounts.entries()).map(([key, count]) => ({
        error: key,
        frequency: count
      }))
    };

    return JSON.stringify(report, null, 2);
  }
}

export const errorHandler = ErrorHandler.getInstance();