/**
 * Professional WebSocket management hook
 * Handles WebSocket connections with automatic reconnection, health monitoring, and performance optimization
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ConnectionManager, ConnectionState, ConnectionStats } from '../core/connectionManager';
import { errorHandler, ErrorCategory } from '../core/errorHandler';
import { logger } from '../core/logger';

export interface WebSocketConfig {
  url: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  timeout?: number;
  healthCheckInterval?: number;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
  id?: string;
}

export interface UseWebSocketReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  stats: ConnectionStats;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: WebSocketMessage) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: Error | null;
  reconnect: () => Promise<void>;
}

export function useWebSocket(config: WebSocketConfig): UseWebSocketReturn {
  const {
    url,
    autoConnect = true,
    autoReconnect = true,
    reconnectInterval = 1000,
    maxReconnectAttempts = 5,
    timeout = 10000,
    healthCheckInterval = 30000
  } = config;

  // State management
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [stats, setStats] = useState<ConnectionStats>({
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageResponseTime: 0,
    uptime: 0
  });
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs for connection management
  const connectionManagerRef = useRef<ConnectionManager | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const isMountedRef = useRef(true);

  // Memoize connection manager configuration
  const connectionConfig = useMemo(() => ({
    url,
    timeout,
    maxRetries: maxReconnectAttempts,
    retryDelay: reconnectInterval,
    healthCheckInterval,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000
  }), [url, timeout, maxReconnectAttempts, reconnectInterval, healthCheckInterval]);

  // Initialize connection manager
  useEffect(() => {
    if (!connectionManagerRef.current) {
      connectionManagerRef.current = new ConnectionManager(connectionConfig);
      setupEventListeners();
    }

    return () => {
      cleanup();
    };
  }, [connectionConfig]);

  const setupEventListeners = useCallback(() => {
    const manager = connectionManagerRef.current;
    if (!manager) return;

    manager.addEventListener('state_change', (event: any) => {
      if (!isMountedRef.current) return;

      const newState = event.data.to;
      setConnectionState(newState);

      logger.info('websocket-hook', `Connection state changed: ${newState}`);

      if (newState === ConnectionState.CONNECTED) {
        setError(null);
      }
    });

    manager.addEventListener('message', (event: any) => {
      if (!isMountedRef.current) return;

      const message: WebSocketMessage = {
        ...event.data,
        timestamp: Date.now()
      };

      setLastMessage(message);

      logger.debug('websocket-hook', 'Message received', message);
    });

    manager.addEventListener('error', (event: any) => {
      if (!isMountedRef.current) return;

      const error = new Error(event.data.message);
      setError(error);

      logger.error('websocket-hook', 'WebSocket error', error);
    });

    manager.addEventListener('stats_update', (event: any) => {
      if (!isMountedRef.current) return;
      setStats(event.data);
    });
  }, []);

  const cleanup = useCallback(() => {
    isMountedRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (connectionManagerRef.current) {
      connectionManagerRef.current.disconnect();
    }
  }, []);

  // Auto-connect logic
  useEffect(() => {
    if (autoConnect && url && connectionState === ConnectionState.DISCONNECTED) {
      connect();
    }
  }, [autoConnect, url]);

  // Auto-reconnect logic
  useEffect(() => {
    if (autoReconnect &&
        connectionState === ConnectionState.ERROR &&
        error &&
        connectionManagerRef.current) {

      const reconnectDelay = reconnectInterval * Math.min(
        Math.pow(2, connectionManagerRef.current.getStats().failedConnections),
        10
      );

      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          reconnect();
        }
      }, reconnectDelay);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectionState, error, autoReconnect, reconnectInterval]);

  const connect = useCallback(async (): Promise<void> => {
    if (!connectionManagerRef.current) {
      const error = new Error('Connection manager not initialized');
      setError(error);
      throw error;
    }

    try {
      setError(null);
      await connectionManagerRef.current.connect();
      logger.info('websocket-hook', 'Connection successful');
    } catch (err) {
      const error = err as Error;
      setError(error);

      await errorHandler.handleError(error, {
        operation: 'websocket_connect',
        url: config.url
      });

      throw error;
    }
  }, [config.url]);

  const disconnect = useCallback((): void => {
    if (connectionManagerRef.current) {
      connectionManagerRef.current.disconnect();
      setLastMessage(null);
      logger.info('websocket-hook', 'Disconnected');
    }
  }, []);

  const reconnect = useCallback(async (): Promise<void> => {
    try {
      disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      await connect();
      logger.info('websocket-hook', 'Reconnection successful');
    } catch (err) {
      logger.error('websocket-hook', 'Reconnection failed', err as Error);
      throw err;
    }
  }, [disconnect, connect]);

  const sendMessage = useCallback((message: WebSocketMessage): void => {
    if (!connectionManagerRef.current) {
      const error = new Error('Cannot send message: connection manager not initialized');
      setError(error);
      throw error;
    }

    if (connectionState !== ConnectionState.CONNECTED) {
      const error = new Error('Cannot send message: not connected');
      setError(error);
      throw error;
    }

    try {
      const enhancedMessage = {
        ...message,
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };

      connectionManagerRef.current.send(enhancedMessage);
      logger.debug('websocket-hook', 'Message sent', enhancedMessage);
    } catch (err) {
      const error = err as Error;
      setError(error);

      errorHandler.handleError(error, {
        operation: 'websocket_send',
        message
      });

      throw error;
    }
  }, [connectionState]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionManagerRef.current) {
        setStats(connectionManagerRef.current.getStats());
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Memoize return value to prevent unnecessary re-renders
  const returnValues = useMemo((): UseWebSocketReturn => ({
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isConnecting: connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING,
    stats,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    error,
    reconnect
  }), [
    connectionState,
    stats,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    error,
    reconnect
  ]);

  return returnValues;
}

// Hook for managing multiple WebSocket connections
export function useMultiWebSocket(connections: Array<{ id: string; config: WebSocketConfig }>) {
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionState>>({});
  const [globalStats, setGlobalStats] = useState<ConnectionStats>({
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageResponseTime: 0,
    uptime: 0
  });

  const websockets = useMemo(() => {
    const result: Record<string, UseWebSocketReturn> = {};

    connections.forEach(({ id, config }) => {
      result[id] = useWebSocket(config);
    });

    return result;
  }, [connections]);

  // Update connection states
  useEffect(() => {
    const states: Record<string, ConnectionState> = {};
    let combinedStats: ConnectionStats = {
      totalConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageResponseTime: 0,
      uptime: 0
    };

    Object.entries(websockets).forEach(([id, ws]) => {
      states[id] = ws.connectionState;

      combinedStats.totalConnections += ws.stats.totalConnections;
      combinedStats.successfulConnections += ws.stats.successfulConnections;
      combinedStats.failedConnections += ws.stats.failedConnections;
      combinedStats.uptime += ws.stats.uptime;
    });

    setConnectionStates(states);
    setGlobalStats(combinedStats);
  }, [websockets]);

  const sendMessageToAll = useCallback((message: WebSocketMessage) => {
    const results: Record<string, boolean> = {};

    Object.entries(websockets).forEach(([id, ws]) => {
      try {
        ws.sendMessage(message);
        results[id] = true;
      } catch (error) {
        results[id] = false;
        logger.error('multi-websocket', `Failed to send to ${id}`, error as Error);
      }
    });

    return results;
  }, [websockets]);

  const connectAll = useCallback(async () => {
    const results: Record<string, boolean> = {};

    for (const [id, ws] of Object.entries(websockets)) {
      try {
        await ws.connect();
        results[id] = true;
      } catch (error) {
        results[id] = false;
        logger.error('multi-websocket', `Failed to connect ${id}`, error as Error);
      }
    }

    return results;
  }, [websockets]);

  const disconnectAll = useCallback(() => {
    Object.values(websockets).forEach(ws => {
      ws.disconnect();
    });
  }, [websockets]);

  return {
    websockets,
    connectionStates,
    globalStats,
    sendMessageToAll,
    connectAll,
    disconnectAll,
    anyConnected: Object.values(websockets).some(ws => ws.isConnected),
    allConnected: Object.values(websockets).every(ws => ws.isConnected)
  };
}