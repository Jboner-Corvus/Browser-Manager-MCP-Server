/**
 * Professional Background Script - Enterprise Grade Architecture
 * Replaces the basic background.ts with advanced error handling, monitoring, and performance optimization
 */

import { ConnectionManager, ConnectionState } from './core/connectionManager';
import { errorHandler, ErrorCategory, ErrorSeverity } from './core/errorHandler';
import { logger, LogLevel } from './core/logger';
import { stateManager } from './core/stateManager';

// Professional TypeScript interfaces
interface ExtensionMessage {
  type: 'connectToMCPRelay' | 'getTabs' | 'connectToTab' | 'getConnectionStatus' | 'disconnect' | 'ping';
  id?: string;
  timestamp?: number;
  data?: any;
}

interface TabConnection {
  tabId: number;
  connectionManager: ConnectionManager;
  connectedAt: Date;
  lastActivity: Date;
  messageCount: number;
}

interface PerformanceMetrics {
  startTime: Date;
  totalMessages: number;
  totalConnections: number;
  activeConnections: number;
  errorsHandled: number;
  averageResponseTime: number;
  memoryUsage: number;
}

class ProfessionalExtensionService {
  private connections: Map<number, TabConnection> = new Map();
  private pendingConnections: Map<number, ConnectionManager> = new Map();
  private performanceMetrics: PerformanceMetrics;
  private healthCheckInterval: number | null = null;
  private cleanupInterval: number | null = null;

  constructor() {
    this.performanceMetrics = {
      startTime: new Date(),
      totalMessages: 0,
      totalConnections: 0,
      activeConnections: 0,
      errorsHandled: 0,
      averageResponseTime: 0,
      memoryUsage: 0
    };

    this.initializeEventListeners();
    this.startHealthMonitoring();
    this.startPeriodicCleanup();

    logger.info('extension-service', 'Professional Extension Service initialized');
  }

  private initializeEventListeners(): void {
    // Chrome extension events
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
    chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    chrome.action.onClicked.addListener(this.handleActionClicked.bind(this));

    // Performance monitoring
    this.setupPerformanceMonitoring();

    logger.info('extension-service', 'Event listeners initialized');
  }

  private setupPerformanceMonitoring(): void {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.performanceMetrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB

        if (this.performanceMetrics.memoryUsage > 100) {
          logger.warn('extension-service', 'High memory usage detected', {
            memoryUsage: this.performanceMetrics.memoryUsage
          });
        }
      }, 30000); // Every 30 seconds
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute
  }

  private performHealthCheck(): void {
    const now = Date.now();
    let activeConnections = 0;

    for (const [tabId, connection] of this.connections.entries()) {
      const timeSinceActivity = now - connection.lastActivity.getTime();

      if (timeSinceActivity > 300000) { // 5 minutes of inactivity
        logger.warn('extension-service', `Cleaning up inactive connection for tab ${tabId}`);
        this.cleanupConnection(tabId);
      } else {
        activeConnections++;
      }
    }

    this.performanceMetrics.activeConnections = activeConnections;

    logger.debug('extension-service', 'Health check completed', {
      activeConnections,
      totalConnections: this.connections.size,
      memoryUsage: this.performanceMetrics.memoryUsage
    });
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupStaleConnections();
      this.updatePerformanceMetrics();
    }, 300000); // Every 5 minutes
  }

  private cleanupStaleConnections(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [tabId, connection] of this.pendingConnections.entries()) {
      if (connection.getState() === ConnectionState.ERROR) {
        this.pendingConnections.delete(tabId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('extension-service', `Cleaned up ${cleanedCount} stale pending connections`);
    }
  }

  private updatePerformanceMetrics(): void {
    const uptime = Date.now() - this.performanceMetrics.startTime.getTime();

    stateManager.batchUpdate(() => {
      stateManager.setValue('performance.uptime', uptime);
      stateManager.setValue('performance.messageCount', this.performanceMetrics.totalMessages);
      stateManager.setValue('performance.errorCount', this.performanceMetrics.errorsHandled);
    });

    logger.debug('extension-service', 'Performance metrics updated', this.performanceMetrics);
  }

  private async handleTabRemoved(tabId: number): Promise<void> {
    logger.info('extension-service', `Tab ${tabId} removed`);

    // Clean up active connection
    this.cleanupConnection(tabId);

    // Clean up pending connection
    const pendingConnection = this.pendingConnections.get(tabId);
    if (pendingConnection) {
      pendingConnection.disconnect();
      this.pendingConnections.delete(tabId);
    }
  }

  private handleTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void {
    const connection = this.connections.get(tabId);
    if (connection) {
      connection.lastActivity = new Date();

      // Update stored tab info if URL changed significantly
      if (changeInfo.url && tab.url) {
        logger.debug('extension-service', `Tab ${tabId} URL updated to ${tab.url}`);
      }
    }
  }

  private handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo): void {
    // Optional: Update metrics for tab activity
    const connection = this.connections.get(activeInfo.tabId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  private handleActionClicked(): void {
    chrome.tabs.create({
      url: chrome.runtime.getURL('lib/ui/status.html'),
      active: true
    }).catch(error => {
      logger.error('extension-service', 'Failed to create status tab', error);
    });
  }

  private async handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<boolean> {
    const startTime = Date.now();
    this.performanceMetrics.totalMessages++;

    try {
      logger.debug('extension-service', 'Message received', { type: message.type, senderTabId: sender.tab?.id });

      const response = await this.processMessage(message, sender);

      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      sendResponse({ success: true, data: response, responseTime });

      logger.debug('extension-service', 'Message processed successfully', {
        type: message.type,
        responseTime
      });

    } catch (error) {
      this.performanceMetrics.errorsHandled++;

      const appError = await errorHandler.handleError(error as Error, {
        messageType: message.type,
        senderTabId: sender.tab?.id,
        timestamp: new Date()
      });

      sendResponse({
        success: false,
        error: appError.userMessage,
        technicalError: appError.message,
        errorId: appError.id
      });

      logger.error('extension-service', 'Message processing failed', error as Error);
    }

    return true; // Indicates async response
  }

  private async processMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender
  ): Promise<any> {
    const tabId = sender.tab?.id;

    switch (message.type) {
      case 'connectToMCPRelay':
        return this.handleConnectToRelay(tabId!, message.data.mcpRelayUrl);

      case 'getTabs':
        return this.handleGetTabs();

      case 'connectToTab':
        return this.handleConnectToTab(
          tabId!,
          message.data.tabId || tabId!,
          message.data.windowId || sender.tab?.windowId!,
          message.data.mcpRelayUrl
        );

      case 'getConnectionStatus':
        return this.handleGetConnectionStatus();

      case 'disconnect':
        return this.handleDisconnect();

      case 'ping':
        return { timestamp: Date.now(), status: 'healthy' };

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  private async handleConnectToRelay(selectorTabId: number, mcpRelayUrl: string): Promise<void> {
    logger.info('extension-service', `Connecting to relay: ${mcpRelayUrl}`);

    // Create connection manager with professional configuration
    const connectionManager = new ConnectionManager({
      url: mcpRelayUrl,
      timeout: 15000,
      maxRetries: 5,
      retryDelay: 2000,
      healthCheckInterval: 45000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 120000
    });

    // Set up event listeners for the connection
    this.setupConnectionEventListeners(connectionManager, selectorTabId);

    // Store the pending connection
    this.pendingConnections.set(selectorTabId, connectionManager);

    try {
      await connectionManager.connect();
      this.performanceMetrics.totalConnections++;

      // Send success message to the tab
      this.sendMessageToTab(selectorTabId, {
        type: 'connectionStatus',
        status: 'connected',
        message: 'Connecté au serveur MCP avec succès'
      });

      logger.info('extension-service', `Successfully connected to relay for tab ${selectorTabId}`);

    } catch (error) {
      // Clean up on failure
      this.pendingConnections.delete(selectorTabId);

      // Send error message to the tab
      this.sendMessageToTab(selectorTabId, {
        type: 'connectionStatus',
        status: 'error',
        message: 'Échec de la connexion au serveur MCP'
      });

      throw error;
    }
  }

  private setupConnectionEventListeners(connectionManager: ConnectionManager, tabId: number): void {
    connectionManager.addEventListener('state_change', (event: any) => {
      const { from, to } = event.data;

      this.sendMessageToTab(tabId, {
        type: 'connectionStateChanged',
        from,
        to,
        timestamp: new Date()
      });

      if (to === ConnectionState.CONNECTED) {
        logger.info('extension-service', `Connection state changed to CONNECTED for tab ${tabId}`);
      } else if (to === ConnectionState.ERROR || to === ConnectionState.DISCONNECTED) {
        // Clean up on error or disconnect
        this.cleanupConnection(tabId);
        this.pendingConnections.delete(tabId);
      }
    });

    connectionManager.addEventListener('message', (event: any) => {
      // Forward messages to the appropriate tab
      this.sendMessageToTab(tabId, {
        type: 'mcpMessage',
        data: event.data
      });
    });

    connectionManager.addEventListener('error', (event: any) => {
      logger.error('extension-service', `Connection error for tab ${tabId}`, event.data);
    });
  }

  private async handleGetTabs(): Promise<chrome.tabs.Tab[]> {
    try {
      const tabs = await chrome.tabs.query({});
      return tabs.filter(tab => tab.url && !tab.url.startsWith('chrome://'));
    } catch (error) {
      logger.error('extension-service', 'Failed to get tabs', error as Error);
      throw error;
    }
  }

  private async handleConnectToTab(
    selectorTabId: number,
    targetTabId: number,
    windowId: number,
    mcpRelayUrl: string
  ): Promise<void> {
    logger.info('extension-service', `Connecting tab ${targetTabId} to MCP relay`);

    // Get the pending connection
    const connectionManager = this.pendingConnections.get(selectorTabId);
    if (!connectionManager) {
      throw new Error('No pending MCP relay connection found');
    }

    try {
      // Get target tab info
      const targetTab = await chrome.tabs.get(targetTabId);

      // Create tab connection record
      const tabConnection: TabConnection = {
        tabId: targetTabId,
        connectionManager,
        connectedAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0
      };

      // Store the active connection
      this.connections.set(targetTabId, tabConnection);
      this.pendingConnections.delete(selectorTabId);

      // Update state manager
      stateManager.batchUpdate(() => {
        stateManager.setValue('connection.isConnected', true);
        stateManager.setValue('connection.connectedTabId', targetTabId);
        stateManager.setValue('connection.lastConnectedAt', new Date());
        stateManager.setValue('connection.serverUrl', mcpRelayUrl);
      });

      // Focus on the target tab
      await Promise.all([
        chrome.tabs.update(targetTabId, { active: true }),
        chrome.windows.update(windowId, { focused: true })
      ]);

      // Update badge
      await this.updateTabBadge(targetTabId, true);

      logger.info('extension-service', `Successfully connected tab ${targetTabId} to MCP relay`);

    } catch (error) {
      this.cleanupConnection(targetTabId);
      throw error;
    }
  }

  private async handleGetConnectionStatus(): Promise<any> {
    const connection = Array.from(this.connections.values())[0]; // Get first connection

    if (!connection) {
      return {
        isConnected: false,
        connectedTabId: null,
        connectedAt: null
      };
    }

    return {
      isConnected: true,
      connectedTabId: connection.tabId,
      connectedAt: connection.connectedAt,
      lastActivity: connection.lastActivity,
      messageCount: connection.messageCount,
      connectionStats: connection.connectionManager.getStats()
    };
  }

  private async handleDisconnect(): Promise<void> {
    logger.info('extension-service', 'Disconnecting all connections');

    // Disconnect all active connections
    for (const [tabId] of this.connections.entries()) {
      this.cleanupConnection(tabId);
    }

    // Disconnect all pending connections
    for (const [tabId, connection] of this.pendingConnections.entries()) {
      connection.disconnect();
    }

    this.pendingConnections.clear();

    // Reset state
    stateManager.batchUpdate(() => {
      stateManager.setValue('connection.isConnected', false);
      stateManager.setValue('connection.connectedTabId', null);
      stateManager.setValue('connection.lastConnectedAt', null);
      stateManager.setValue('connection.serverUrl', '');
    });

    logger.info('extension-service', 'All connections disconnected');
  }

  private cleanupConnection(tabId: number): void {
    const connection = this.connections.get(tabId);
    if (connection) {
      connection.connectionManager.disconnect();
      this.connections.delete(tabId);
      this.updateTabBadge(tabId, false);

      logger.info('extension-service', `Cleaned up connection for tab ${tabId}`);
    }
  }

  private async updateTabBadge(tabId: number, isConnected: boolean): Promise<void> {
    try {
      if (isConnected) {
        await chrome.action.setBadgeText({ tabId, text: 'MCP' });
        await chrome.action.setBadgeBackgroundColor({ tabId, color: '#4CAF50' });
        await chrome.action.setTitle({ tabId, title: 'Connected to MCP' });
      } else {
        await chrome.action.setBadgeText({ tabId, text: '' });
      }
    } catch (error) {
      // Ignore errors if tab no longer exists
      logger.debug('extension-service', `Failed to update badge for tab ${tabId}`, error);
    }
  }

  private async sendMessageToTab(tabId: number, message: any): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      logger.debug('extension-service', `Failed to send message to tab ${tabId}`, error);
    }
  }

  private updateAverageResponseTime(responseTime: number): void {
    const currentAverage = this.performanceMetrics.averageResponseTime;
    const totalMessages = this.performanceMetrics.totalMessages;

    this.performanceMetrics.averageResponseTime =
      (currentAverage * (totalMessages - 1) + responseTime) / totalMessages;
  }

  public cleanup(): void {
    logger.info('extension-service', 'Cleaning up extension service');

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Disconnect all connections
    this.handleDisconnect();

    logger.info('extension-service', 'Extension service cleanup completed');
  }
}

// Initialize the professional extension service
let extensionService: ProfessionalExtensionService;

try {
  extensionService = new ProfessionalExtensionService();

  // Set up global error handler
  chrome.runtime.onSuspend.addListener(() => {
    logger.info('extension-service', 'Extension suspending');
    extensionService?.cleanup();
  });

  logger.info('extension-service', 'Professional Browser Manager MCP Extension started successfully');

} catch (error) {
  logger.critical('extension-service', 'Failed to initialize extension service', error as Error);

  // Attempt basic initialization
  chrome.runtime.onInstalled.addListener(() => {
    console.error('Extension initialization failed:', error);
  });
}

// Export for testing purposes
export { ProfessionalExtensionService };