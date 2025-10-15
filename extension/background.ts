/**
 * Enhanced Background Script - Professional Simple Bridge
 * Combines the reliability of Simple Bridge with professional features
 */

// Professional logging - always enabled for debugging
const debugLog = (...args: any[]) => {
  console.log('[Extension]', ...args);
};

// Enhanced Relay Connection with professional features
class RelayConnection {
  private _debuggee: any = {};
  private _ws: WebSocket | null = null;
  private _eventListener: any;
  private _detachListener: any;
  private _tabPromise: Promise<void>;
  private _tabPromiseResolve: () => void = () => {};
  private _closed = false;
  private _messageCount = 0;
  private _lastActivity: Date = new Date();
  public onclose: (() => void) | null = null;

  constructor(ws: WebSocket) {
    this._ws = ws;
    this._tabPromise = new Promise((resolve) => {
      this._tabPromiseResolve = resolve;
    });

    this._ws.onmessage = this._onMessage.bind(this);
    this._ws.onclose = () => this._onClose();
    this._eventListener = this._onDebuggerEvent.bind(this);
    this._detachListener = this._onDebuggerDetach.bind(this);

    chrome.debugger.onEvent.addListener(this._eventListener);
    chrome.debugger.onDetach.addListener(this._detachListener);

    debugLog('RelayConnection initialized');
  }

  setTabId(tabId: number): void {
    this._debuggee = { tabId };
    this._tabPromiseResolve();
    debugLog(`Tab ID set: ${tabId}`);
  }

  close(message: string): void {
    if (this._ws) {
      this._ws.close(1000, message);
    }
    this._onClose();
  }

  getStats(): any {
    return {
      messageCount: this._messageCount,
      lastActivity: this._lastActivity,
      uptime: Date.now() - this._lastActivity.getTime()
    };
  }

  private _onClose(): void {
    if (this._closed) return;
    this._closed = true;

    chrome.debugger.onEvent.removeListener(this._eventListener);
    chrome.debugger.onDetach.removeListener(this._detachListener);

    if (this._debuggee.tabId) {
      chrome.debugger.detach(this._debuggee).catch(() => {});
    }

    if (this.onclose) {
      this.onclose();
    }

    debugLog('RelayConnection closed');
  }

  private _onDebuggerEvent(source: any, method: string, params: any): void {
    if (source.tabId !== this._debuggee.tabId) return;

    this._messageCount++;
    this._lastActivity = new Date();

    debugLog('Forwarding CDP event:', method, params);
    const sessionId = source.sessionId;

    this._sendMessage({
      method: 'forwardCDPEvent',
      params: { sessionId, method, params }
    });
  }

  private _onDebuggerDetach(source: any, reason: string): void {
    if (source.tabId !== this._debuggee.tabId) return;
    this.close(`Debugger detached: ${reason}`);
    this._debuggee = {};
  }

  private _onMessage(event: MessageEvent): void {
    this._onMessageAsync(event).catch((e) =>
      debugLog('Error handling message:', e)
    );
  }

  private async _onMessageAsync(event: MessageEvent): Promise<void> {
    let message: any;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      debugLog('Error parsing message:', error);
      this._sendError(-32700, `Error parsing message: ${(error as Error).message}`);
      return;
    }

    this._messageCount++;
    this._lastActivity = new Date();

    debugLog('Received message:', message);
    const response = { id: message.id };

    try {
      response.result = await this._handleCommand(message);
    } catch (error) {
      debugLog('Error handling command:', error);
      response.error = (error as Error).message;
    }

    debugLog('Sending response:', response);
    this._sendMessage(response);
  }

  private async _handleCommand(message: any): Promise<any> {
    if (message.method === 'attachToTab') {
      await this._tabPromise;
      debugLog('Attaching debugger to tab:', this._debuggee);

      try {
        await chrome.debugger.attach(this._debuggee, '1.3');

        // Get all tabs for comprehensive response
        const tabs = await chrome.tabs.query({});

        // Ensure we have at least one tab
        if (!tabs || tabs.length === 0) {
          throw new Error('No tabs available');
        }

        const activeTab = tabs.find(tab => tab.active && tab.id) || tabs.find(tab => tab.id);

        if (!activeTab || !activeTab.id) {
          throw new Error('No valid tab found');
        }

        return {
          targetInfo: {
            id: activeTab.id.toString(),
            title: activeTab.title || 'Unknown Tab',
            url: activeTab.url || 'about:blank',
            type: 'page'
          },
          allTabs: tabs
            .filter(tab => tab.id) // Filter out tabs without ID
            .map(tab => ({
              id: tab.id!.toString(),
              title: tab.title || 'Unknown Tab',
              url: tab.url || 'about:blank',
              type: 'page',
              active: tab.active,
              windowId: tab.windowId
            }))
        };
      } catch (error) {
        debugLog('Failed to attach debugger:', error);
        throw new Error(`Failed to attach debugger: ${(error as Error).message}`);
      }
    }

    if (!this._debuggee.tabId) {
      throw new Error('No tab is connected. Please connect to a tab first.');
    }

    if (message.method === 'forwardCDPCommand') {
      const { sessionId, method, params } = message.params;
      debugLog('CDP command:', method, params);

      const debuggerSession = {
        ...this._debuggee,
        sessionId
      };

      try {
        return await chrome.debugger.sendCommand(
          debuggerSession,
          method,
          params
        );
      } catch (error) {
        debugLog('CDP command failed:', error);
        throw new Error(`CDP command failed: ${(error as Error).message}`);
      }
    }

    throw new Error(`Unknown method: ${message.method}`);
  }

  private _sendError(code: number, message: string): void {
    this._sendMessage({
      error: { code, message }
    });
  }

  private _sendMessage(message: any): void {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(message));
    }
  }
}

// Professional Extension Manager
class ProfessionalExtensionService {
  private connections = new Map<number, RelayConnection>();
  private pendingConnections = new Map<number, RelayConnection>();
  private connectedTabId: number | null = null;
  private connectionStartTime: Date | null = null;
  private totalConnections = 0;
  private metrics = {
    messagesProcessed: 0,
    errorsHandled: 0,
    averageResponseTime: 0
  };

  constructor() {
    this.initializeEventListeners();
    this.startHealthMonitoring();
    debugLog('ProfessionalExtensionService initialized');
  }

  private initializeEventListeners(): void {
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
    chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    chrome.action.onClicked.addListener(this.handleActionClicked.bind(this));

    debugLog('Event listeners initialized');
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute
  }

  private performHealthCheck(): void {
    const now = Date.now();
    let activeConnections = 0;

    for (const [tabId, connection] of this.connections.entries()) {
      const stats = connection.getStats();
      const timeSinceActivity = now - stats.lastActivity.getTime();

      if (timeSinceActivity > 300000) { // 5 minutes
        debugLog(`Cleaning up inactive connection for tab ${tabId}`);
        this.cleanupConnection(tabId);
      } else {
        activeConnections++;
      }
    }

    debugLog('Health check completed', {
      activeConnections,
      totalConnections: this.connections.size
    });
  }

  private async handleTabRemoved(tabId: number): Promise<void> {
    debugLog(`Tab ${tabId} removed`);
    this.cleanupConnection(tabId);

    const pendingConnection = this.pendingConnections.get(tabId);
    if (pendingConnection) {
      pendingConnection.close('Tab removed');
      this.pendingConnections.delete(tabId);
    }
  }

  private handleTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo): void {
    const connection = this.connections.get(tabId);
    if (connection && changeInfo.url) {
      debugLog(`Tab ${tabId} URL updated to ${changeInfo.url}`);
    }
  }

  private handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo): void {
    const connection = this.connections.get(activeInfo.tabId);
    if (connection) {
      debugLog(`Tab ${activeInfo.tabId} activated`);
    }
  }

  private handleActionClicked(): void {
    chrome.tabs.create({
      url: chrome.runtime.getURL('status.html'),
      active: true
    }).catch(error => {
      debugLog('Failed to create status tab:', error);
    });
  }

  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<boolean> {
    const startTime = Date.now();
    this.metrics.messagesProcessed++;

    try {
      debugLog('Message received', {
        type: message.type,
        senderTabId: sender.tab?.id
      });

      const response = await this.processMessage(message, sender);
      const responseTime = Date.now() - startTime;

      this.updateAverageResponseTime(responseTime);
      sendResponse({ success: true, data: response });

      debugLog('Message processed successfully', {
        type: message.type,
        responseTime
      });

    } catch (error) {
      this.metrics.errorsHandled++;
      debugLog('Message processing failed:', error);

      sendResponse({
        success: false,
        error: (error as Error).message
      });
    }

    return true;
  }

  private async processMessage(
    message: any,
    sender: chrome.runtime.MessageSender
  ): Promise<any> {
    const tabId = sender.tab?.id;

    switch (message.type) {
      case 'connectToMCPRelay':
        return this.handleConnectToRelay(tabId!, message.mcpRelayUrl);

      case 'getTabs':
        return this.handleGetTabs();

      case 'connectToTab':
        return this.handleConnectToTab(
          tabId!,
          message.tabId || tabId!,
          message.windowId || sender.tab?.windowId!,
          message.mcpRelayUrl
        );

      case 'getConnectionStatus':
        return this.handleGetConnectionStatus();

      case 'disconnect':
        return this.handleDisconnect();

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  private async handleConnectToRelay(selectorTabId: number, mcpRelayUrl: string): Promise<void> {
    debugLog(`Connecting to relay: ${mcpRelayUrl}`);

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(mcpRelayUrl);

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 15000);

      ws.onopen = () => {
        clearTimeout(timeout);
        const connection = new RelayConnection(ws);

        connection.onclose = () => {
          debugLog('Connection closed');
          this.pendingConnections.delete(selectorTabId);
        };

        this.pendingConnections.set(selectorTabId, connection);
        this.totalConnections++;

        debugLog(`Successfully connected to relay for tab ${selectorTabId}`);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        debugLog('WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  private async handleGetTabs(): Promise<chrome.tabs.Tab[]> {
    try {
      debugLog('Getting all tabs...');
      const allTabs = await chrome.tabs.query({});
      debugLog(`Total tabs found: ${allTabs.length}`);

      // Log all tabs for debugging
      allTabs.forEach((tab, index) => {
        debugLog(`Tab ${index}: ID=${tab.id}, URL=${tab.url}, Title=${tab.title}, Active=${tab.active}`);
      });

      // First try to get tabs with URLs (excluding Chrome internal pages)
      let validTabs = allTabs.filter(tab =>
        tab.id && // Ensure tab has an ID
        tab.url &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('moz-extension://') &&
        !tab.url.startsWith('edge://')
      );

      debugLog(`Valid tabs with URLs: ${validTabs.length}`);

      // If no tabs with URLs, return all tabs with IDs (including new tabs)
      if (validTabs.length === 0) {
        debugLog('No tabs with URLs found, returning all tabs with IDs');
        validTabs = allTabs.filter(tab => tab.id);
        debugLog(`All tabs with IDs: ${validTabs.length}`);
      }

      return validTabs;
    } catch (error) {
      debugLog('Failed to get tabs:', error);
      throw error;
    }
  }

  private async handleConnectToTab(
    selectorTabId: number,
    targetTabId: number,
    windowId: number,
    mcpRelayUrl: string
  ): Promise<void> {
    debugLog(`Connecting tab ${targetTabId} to MCP relay`);

    const connection = this.pendingConnections.get(selectorTabId);
    if (!connection) {
      throw new Error('No pending MCP relay connection found');
    }

    try {
      connection.setTabId(targetTabId);
      this.connections.set(targetTabId, connection);
      this.pendingConnections.delete(selectorTabId);
      this.connectedTabId = targetTabId;
      this.connectionStartTime = new Date();

      await Promise.all([
        chrome.tabs.update(targetTabId, { active: true }),
        chrome.windows.update(windowId, { focused: true })
      ]);

      await this.updateTabBadge(targetTabId, true);

      debugLog(`Successfully connected tab ${targetTabId} to MCP relay`);

    } catch (error) {
      this.cleanupConnection(targetTabId);
      throw error;
    }
  }

  private async handleGetConnectionStatus(): Promise<any> {
    if (!this.connectedTabId) {
      return {
        isConnected: false,
        connectedTabId: null,
        connectedAt: null,
        uptime: 0,
        stats: this.metrics
      };
    }

    const connection = this.connections.get(this.connectedTabId);
    if (!connection) {
      return {
        isConnected: false,
        connectedTabId: null,
        connectedAt: null,
        uptime: 0,
        stats: this.metrics
      };
    }

    return {
      isConnected: true,
      connectedTabId: this.connectedTabId,
      connectedAt: this.connectionStartTime,
      uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime.getTime() : 0,
      connectionStats: connection.getStats(),
      stats: this.metrics
    };
  }

  private async handleDisconnect(): Promise<void> {
    debugLog('Disconnecting all connections');

    for (const [tabId] of this.connections.entries()) {
      this.cleanupConnection(tabId);
    }

    for (const [tabId, connection] of this.pendingConnections.entries()) {
      connection.close('User requested disconnect');
    }

    this.pendingConnections.clear();
    this.connectedTabId = null;
    this.connectionStartTime = null;

    debugLog('All connections disconnected');
  }

  private cleanupConnection(tabId: number): void {
    const connection = this.connections.get(tabId);
    if (connection) {
      connection.close('Connection cleanup');
      this.connections.delete(tabId);
      this.updateTabBadge(tabId, false);
      debugLog(`Cleaned up connection for tab ${tabId}`);
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
      debugLog(`Failed to update badge for tab ${tabId}:`, error);
    }
  }

  private updateAverageResponseTime(responseTime: number): void {
    const currentAverage = this.metrics.averageResponseTime;
    const totalMessages = this.metrics.messagesProcessed;

    this.metrics.averageResponseTime =
      (currentAverage * (totalMessages - 1) + responseTime) / totalMessages;
  }

  public cleanup(): void {
    debugLog('Cleaning up extension service');
    this.handleDisconnect();
    debugLog('Extension service cleanup completed');
  }
}

// Initialize the extension service
let extensionService: ProfessionalExtensionService;

try {
  extensionService = new ProfessionalExtensionService();

  chrome.runtime.onSuspend.addListener(() => {
    debugLog('Extension suspending');
    extensionService?.cleanup();
  });

  chrome.runtime.onInstalled.addListener(() => {
    debugLog('Professional Browser Manager MCP Extension installed');
  });

  debugLog('Professional Browser Manager MCP Extension started successfully');

} catch (error) {
  debugLog('Failed to initialize extension service:', error);

  chrome.runtime.onInstalled.addListener(() => {
    console.error('Extension initialization failed:', error);
  });
}

export { ProfessionalExtensionService };