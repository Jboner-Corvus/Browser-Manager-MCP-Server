/**
 * Enterprise Connection Manager
 * Handles WebSocket connections with intelligent retry, circuit breaker pattern, and health monitoring
 */

import { logger, LogLevel } from './logger';

export interface ConnectionConfig {
  url: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export interface ConnectionStats {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  lastConnectedAt?: Date;
  lastDisconnectedAt?: Date;
  averageResponseTime: number;
  uptime: number;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  CIRCUIT_BREAKER_OPEN = 'circuit_breaker_open'
}

export interface ConnectionEvent {
  type: 'state_change' | 'message' | 'error' | 'stats_update';
  timestamp: Date;
  data: any;
}

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private config: ConnectionConfig;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private retryCount = 0;
  private circuitBreakerFailureCount = 0;
  private circuitBreakerOpenUntil = 0;
  private healthCheckTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private connectionStartTime = 0;
  private stats: ConnectionStats = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageResponseTime: 0,
    uptime: 0
  };
  private eventListeners: Map<string, Function[]> = new Map();
  private messageQueue: any[] = [];
  private responseTimeBuffer: number[] = [];

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = {
      url: config.url || '',
      timeout: 10000,
      maxRetries: 5,
      retryDelay: 1000,
      healthCheckInterval: 30000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      ...config
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.addEventListener('state_change', (event: ConnectionEvent) => {
      logger.info('connection', `State changed to: ${event.data.state}`, {
        from: event.data.from,
        to: event.data.state
      });
    });
  }

  private updateState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;

    this.emitEvent({
      type: 'state_change',
      timestamp: new Date(),
      data: { from: oldState, to: newState }
    });

    if (newState === ConnectionState.CONNECTED) {
      this.connectionStartTime = Date.now();
      this.startHealthCheck();
    } else if (oldState === ConnectionState.CONNECTED) {
      this.updateUptime();
      this.stopHealthCheck();
    }
  }

  private updateUptime(): void {
    if (this.connectionStartTime > 0) {
      const sessionUptime = Date.now() - this.connectionStartTime;
      this.stats.uptime += sessionUptime;
      this.connectionStartTime = 0;
    }
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.healthCheckTimer = window.setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private async performHealthCheck(): Promise<void> {
    if (this.state !== ConnectionState.CONNECTED || !this.ws) return;

    try {
      const startTime = Date.now();
      this.send({ type: 'ping', timestamp: startTime });

      // Wait for pong response (handled in message handler)
      setTimeout(() => {
        if (Date.now() - startTime > this.config.healthCheckInterval / 2) {
          logger.warn('connection', 'Health check timeout - connection may be stale');
          this.handleConnectionFailure('Health check timeout');
        }
      }, 5000);
    } catch (error) {
      logger.error('connection', 'Health check failed', error as Error);
      this.handleConnectionFailure('Health check failed');
    }
  }

  private handleConnectionFailure(reason: string): void {
    this.circuitBreakerFailureCount++;
    this.stats.failedConnections++;

    if (this.circuitBreakerFailureCount >= this.config.circuitBreakerThreshold) {
      this.openCircuitBreaker();
    } else {
      this.scheduleReconnect();
    }
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerOpenUntil = Date.now() + this.config.circuitBreakerTimeout;
    this.updateState(ConnectionState.CIRCUIT_BREAKER_OPEN);

    logger.error('connection', 'Circuit breaker opened', undefined, {
      failureCount: this.circuitBreakerFailureCount,
      timeout: this.config.circuitBreakerTimeout
    });

    setTimeout(() => {
      this.closeCircuitBreaker();
    }, this.config.circuitBreakerTimeout);
  }

  private closeCircuitBreaker(): void {
    this.circuitBreakerFailureCount = 0;
    if (this.state === ConnectionState.CIRCUIT_BREAKER_OPEN) {
      this.updateState(ConnectionState.DISCONNECTED);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      this.config.retryDelay * Math.pow(2, this.retryCount),
      30000 // Max 30 seconds
    );

    logger.info('connection', `Scheduling reconnect in ${delay}ms`, {
      attempt: this.retryCount + 1,
      maxRetries: this.config.maxRetries
    });

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  private async reconnect(): Promise<void> {
    if (this.retryCount >= this.config.maxRetries) {
      logger.error('connection', 'Max retries exceeded', undefined, {
        attempts: this.retryCount,
        maxRetries: this.config.maxRetries
      });
      this.updateState(ConnectionState.ERROR);
      return;
    }

    this.retryCount++;
    this.updateState(ConnectionState.RECONNECTING);

    try {
      await this.connect();
    } catch (error) {
      logger.error('connection', `Reconnect attempt ${this.retryCount} failed`, error as Error);
      this.handleConnectionFailure('Reconnect failed');
    }
  }

  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED ||
        this.state === ConnectionState.CONNECTING ||
        this.state === ConnectionState.CIRCUIT_BREAKER_OPEN) {
      return;
    }

    if (!this.config.url) {
      throw new Error('Connection URL is required');
    }

    this.updateState(ConnectionState.CONNECTING);
    this.stats.totalConnections++;

    try {
      logger.info('connection', `Connecting to: ${this.config.url}`);

      this.ws = new WebSocket(this.config.url);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.config.timeout);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          this.retryCount = 0;
          this.circuitBreakerFailureCount = 0;
          this.stats.successfulConnections++;
          this.stats.lastConnectedAt = new Date();

          logger.info('connection', 'WebSocket connection established');
          this.updateState(ConnectionState.CONNECTED);
          this.processMessageQueue();
          resolve();
        };

        this.ws!.onclose = (event) => {
          clearTimeout(timeout);
          if (this.state === ConnectionState.CONNECTING) {
            reject(new Error(`Connection closed during connect: ${event.code} ${event.reason}`));
          } else {
            logger.warn('connection', `WebSocket closed: ${event.code} ${event.reason}`);
            this.stats.lastDisconnectedAt = new Date();
            this.updateState(ConnectionState.DISCONNECTED);
            this.handleConnectionFailure('Connection closed');
          }
        };

        this.ws!.onerror = (error) => {
          clearTimeout(timeout);
          if (this.state === ConnectionState.CONNECTING) {
            reject(new Error('WebSocket connection failed'));
          }
        };

        this.ws!.onmessage = (event) => {
          this.handleMessage(event);
        };
      });

    } catch (error) {
      this.stats.failedConnections++;
      logger.error('connection', 'Connection failed', error as Error);
      this.updateState(ConnectionState.ERROR);
      throw error;
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const startTime = Date.now();
      const data = JSON.parse(event.data);

      // Update response time metrics
      if (data.type === 'pong' && data.timestamp) {
        const responseTime = startTime - data.timestamp;
        this.updateResponseTime(responseTime);
      }

      this.emitEvent({
        type: 'message',
        timestamp: new Date(),
        data
      });

      logger.debug('websocket', 'Message received', data);
    } catch (error) {
      logger.error('websocket', 'Failed to parse message', error as Error, {
        data: event.data
      });
    }
  }

  private updateResponseTime(responseTime: number): void {
    this.responseTimeBuffer.push(responseTime);
    if (this.responseTimeBuffer.length > 100) {
      this.responseTimeBuffer.shift();
    }
    this.stats.averageResponseTime = this.responseTimeBuffer.reduce((a, b) => a + b, 0) / this.responseTimeBuffer.length;
  }

  send(data: any): void {
    if (this.state !== ConnectionState.CONNECTED || !this.ws) {
      this.messageQueue.push(data);
      logger.warn('connection', 'Message queued - not connected', { data });
      return;
    }

    try {
      this.ws.send(JSON.stringify(data));
      logger.debug('websocket', 'Message sent', data);
    } catch (error) {
      logger.error('websocket', 'Failed to send message', error as Error, { data });
      this.handleConnectionFailure('Send failed');
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.state === ConnectionState.CONNECTED) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  disconnect(): void {
    this.updateState(ConnectionState.DISCONNECTED);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHealthCheck();
    this.updateUptime();

    if (this.ws) {
      this.ws.close(1000, 'User disconnect');
      this.ws = null;
    }

    this.messageQueue.length = 0;
    logger.info('connection', 'Disconnected');
  }

  addEventListener(type: string, listener: Function): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: Function): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: ConnectionEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          logger.error('connection', 'Event listener error', error as Error);
        }
      });
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  updateConfig(config: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('connection', 'Configuration updated', config);
  }
}