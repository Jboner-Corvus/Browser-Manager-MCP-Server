/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { RelayConnection, debugLog } from './relayConnection';

type PageMessage = {
  type: 'connectToMCPRelay';
  mcpRelayUrl: string;
} | {
  type: 'getTabs';
} | {
  type: 'connectToTab';
  tabId?: number;
  windowId?: number;
  mcpRelayUrl: string;
} | {
  type: 'getConnectionStatus';
} | {
  type: 'disconnect';
};

class TabShareExtension {
  private _activeConnection: RelayConnection | undefined;
  private _connectedTabId: number | null = null;
  private _pendingTabSelection = new Map<number, { connection: RelayConnection, timerId?: number }>();

  constructor() {
    chrome.tabs.onRemoved.addListener(this._onTabRemoved.bind(this));
    chrome.tabs.onUpdated.addListener(this._onTabUpdated.bind(this));
    chrome.tabs.onActivated.addListener(this._onTabActivated.bind(this));
    chrome.runtime.onMessage.addListener(this._onMessage.bind(this));
    chrome.action.onClicked.addListener(this._onActionClicked.bind(this));
  }

  // Promise-based message handling is not supported in Chrome: https://issues.chromium.org/issues/40753031
  private _onMessage(message: PageMessage, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
    // Extract tab info safely at the beginning
    const senderTabId = sender.tab?.id;
    const senderWindowId = sender.tab?.windowId;

    switch (message.type) {
      case 'connectToMCPRelay':
        // For popup connections, we don't need a sender tab ID
        // The popup will specify which tab to connect to later
        this._connectToRelayFromPopup(message.mcpRelayUrl).then(
            () => sendResponse({ success: true }),
            (error: any) => sendResponse({ success: false, error: error.message }));
        return true;
      case 'getTabs':
        this._getTabs().then(
            tabs => sendResponse({ success: true, tabs, currentTabId: senderTabId }),
            (error: any) => sendResponse({ success: false, error: error.message }));
        return true;
      case 'connectToTab':
        // If message specifies tabId and windowId, use them
        // Otherwise, try to use sender's tab info
        const targetTabId = message.tabId;
        const targetWindowId = message.windowId;

        if (!targetTabId || !targetWindowId) {
          sendResponse({ success: false, error: 'Tab ID and window ID are required' });
          return false;
        }

        // Use a generic selector ID for popup connections
        const selectorTabId = senderTabId || 0; // Use 0 as default for popup
        this._connectTab(selectorTabId, targetTabId, targetWindowId, message.mcpRelayUrl).then(
            () => sendResponse({ success: true }),
            (error: any) => sendResponse({ success: false, error: error.message }));
        return true; // Return true to indicate that the response will be sent asynchronously
      case 'getConnectionStatus':
        sendResponse({
          connectedTabId: this._connectedTabId
        });
        return false;
      case 'disconnect':
        this._disconnect().then(
            () => sendResponse({ success: true }),
            (error: any) => sendResponse({ success: false, error: error.message }));
        return true;
    }
    return false;
  }

  private async _connectToRelayFromPopup(mcpRelayUrl: string): Promise<void> {
    try {
      debugLog(`Connecting to relay at ${mcpRelayUrl} from popup`);

      // Tentative de connexion avec retry automatique
      let socket: WebSocket;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          socket = new WebSocket(mcpRelayUrl);
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              socket.close();
              reject(new Error(`Connection timeout (attempt ${retryCount + 1}/${maxRetries})`));
            }, 3000);

            socket.onopen = () => {
              clearTimeout(timeout);
              resolve();
            };
            socket.onerror = (error) => {
              clearTimeout(timeout);
              reject(new Error(`WebSocket error: ${error}`));
            };
          });
          break; // Connexion réussie
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          debugLog(`Connection attempt ${retryCount} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      const connection = new RelayConnection(socket!);

      // For popup connections, we don't set up tab-specific notifications
      // The connection will be associated with a tab when connectToTab is called

      // Store the connection temporarily until a tab is selected
      this._pendingTabSelection.set(0, { connection }); // Use 0 as key for popup

      debugLog(`Connected to MCP relay successfully from popup`);
    } catch (error: any) {
      const message = `Failed to connect to MCP relay: ${error.message}`;
      debugLog(message);
      throw new Error(message);
    }
  }

  private async _connectToRelay(selectorTabId: number, mcpRelayUrl: string): Promise<void> {
    try {
      debugLog(`Connecting to relay at ${mcpRelayUrl}`);
      
      // Tentative de connexion avec retry automatique
      let socket: WebSocket;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          socket = new WebSocket(mcpRelayUrl);
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              socket.close();
              reject(new Error(`Connection timeout (attempt ${retryCount + 1}/${maxRetries})`));
            }, 3000);

            socket.onopen = () => {
              clearTimeout(timeout);
              resolve();
            };
            socket.onerror = (error) => {
              clearTimeout(timeout);
              reject(new Error(`WebSocket error: ${error}`));
            };
          });
          break; // Connexion réussie
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          debugLog(`Connection attempt ${retryCount} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      const connection = new RelayConnection(socket!);
      connection.onclose = () => {
        debugLog('Connection closed');
        this._pendingTabSelection.delete(selectorTabId);
        // Notification à l'onglet de la déconnexion
        chrome.tabs.sendMessage(selectorTabId, { 
          type: 'connectionStatus', 
          status: 'disconnected',
          message: 'Connexion au serveur MCP perdue'
        }).catch(() => {}); // Ignorer si l'onglet n'existe plus
      };
      this._pendingTabSelection.set(selectorTabId, { connection });
      
      // Notification de connexion réussie
      chrome.tabs.sendMessage(selectorTabId, { 
        type: 'connectionStatus', 
        status: 'connected',
        message: 'Connecté au serveur MCP avec succès'
      }).catch(() => {});
      
      debugLog(`Connected to MCP relay successfully`);
    } catch (error: any) {
      const message = `Failed to connect to MCP relay: ${error.message}`;
      debugLog(message);
      
      // Notification d'échec de connexion
      chrome.tabs.sendMessage(selectorTabId, { 
        type: 'connectionStatus', 
        status: 'error',
        message: message
      }).catch(() => {});
      
      throw new Error(message);
    }
  }

  private async _connectTab(selectorTabId: number, tabId: number, windowId: number, mcpRelayUrl: string): Promise<void> {
    try {
      debugLog(`Connecting tab ${tabId} to relay at ${mcpRelayUrl}`);
      try {
        this._activeConnection?.close('Another connection is requested');
      } catch (error: any) {
        debugLog(`Error closing active connection:`, error);
      }
      await this._setConnectedTabId(null);

      this._activeConnection = this._pendingTabSelection.get(selectorTabId)?.connection;
      if (!this._activeConnection)
        throw new Error('No active MCP relay connection');
      this._pendingTabSelection.delete(selectorTabId);

      this._activeConnection.setTabId(tabId);
      this._activeConnection.onclose = () => {
        debugLog('MCP connection closed');
        this._activeConnection = undefined;
        void this._setConnectedTabId(null);
      };

      await Promise.all([
        this._setConnectedTabId(tabId),
        chrome.tabs.update(tabId, { active: true }),
        chrome.windows.update(windowId, { focused: true }),
      ]);
      debugLog(`Connected to MCP bridge`);
    } catch (error: any) {
      await this._setConnectedTabId(null);
      debugLog(`Failed to connect tab ${tabId}:`, error.message);
      throw error;
    }
  }

  private async _setConnectedTabId(tabId: number | null): Promise<void> {
    const oldTabId = this._connectedTabId;
    this._connectedTabId = tabId;
    if (oldTabId && oldTabId !== tabId)
      await this._updateBadge(oldTabId, { text: '' });
    if (tabId)
      await this._updateBadge(tabId, { text: '✓', color: '#4CAF50', title: 'Connected to MCP client' });
  }

  private async _updateBadge(tabId: number, { text, color, title }: { text: string; color?: string, title?: string }): Promise<void> {
    try {
      await chrome.action.setBadgeText({ tabId, text });
      await chrome.action.setTitle({ tabId, title: title || '' });
      if (color)
        await chrome.action.setBadgeBackgroundColor({ tabId, color });
    } catch (error: any) {
      // Ignore errors as the tab may be closed already.
    }
  }

  private async _onTabRemoved(tabId: number): Promise<void> {
    const pendingConnection = this._pendingTabSelection.get(tabId)?.connection;
    if (pendingConnection) {
      this._pendingTabSelection.delete(tabId);
      pendingConnection.close('Browser tab closed');
      return;
    }
    if (this._connectedTabId !== tabId)
      return;
    this._activeConnection?.close('Browser tab closed');
    this._activeConnection = undefined;
    this._connectedTabId = null;
  }

  private _onTabActivated(activeInfo: chrome.tabs.TabActiveInfo) {
    for (const [tabId, pending] of this._pendingTabSelection) {
      if (tabId === activeInfo.tabId) {
        if (pending.timerId) {
          clearTimeout(pending.timerId);
          pending.timerId = undefined;
        }
        continue;
      }
      if (!pending.timerId) {
        pending.timerId = setTimeout(() => {
          const existed = this._pendingTabSelection.delete(tabId);
          if (existed) {
            pending.connection.close('Tab has been inactive for 5 seconds');
            chrome.tabs.sendMessage(tabId, { type: 'connectionTimeout' });
          }
        }, 5000);
        return;
      }
    }
  }

  private _onTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {
    if (this._connectedTabId === tabId)
      void this._setConnectedTabId(tabId);
  }

  private async _getTabs(): Promise<chrome.tabs.Tab[]> {
    const tabs = await chrome.tabs.query({});
    debugLog(`Total tabs found: ${tabs.length}`);

    // Be more permissive - include tabs even if they don't have URLs
    // This helps with new tabs, chrome:// pages, etc.
    const filteredTabs = tabs.filter(tab => {
      const hasUrl = !!tab.url;
      const isValidTab = tab.id && tab.id > 0;
      if (hasUrl && isValidTab) {
        debugLog(`Tab ${tab.id}: ${tab.title} - ${tab.url}`);
      } else {
        debugLog(`Excluding tab ${tab.id}: URL=${tab.url}, Valid=${isValidTab}`);
      }
      return hasUrl && isValidTab;
    });

    debugLog(`Filtered tabs count: ${filteredTabs.length}`);

    // If no tabs with URLs found, create a fallback response
    if (filteredTabs.length === 0 && tabs.length > 0) {
      debugLog('No tabs with URLs found, returning all valid tabs as fallback');
      return tabs.filter(tab => tab.id && tab.id > 0);
    }

    return filteredTabs;
  }

  private async _onActionClicked(): Promise<void> {
    await chrome.tabs.create({
      url: chrome.runtime.getURL('status.html'),
      active: true
    });
  }

  private async _disconnect(): Promise<void> {
    this._activeConnection?.close('User disconnected');
    this._activeConnection = undefined;
    await this._setConnectedTabId(null);
  }
}

new TabShareExtension();
