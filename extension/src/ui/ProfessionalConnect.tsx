/**
 * Professional Connection Page - Modern, Fast, and User-Friendly
 * Replaces the basic connect.html with enterprise-grade interface
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { useStateValue, usePersistedState } from '../hooks/useStateManager';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDebounce } from '../hooks/usePerformance';
import { logger } from '../core/logger';
import { errorHandler, ErrorCategory } from '../core/errorHandler';

import Button from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Import cn utility or define it locally
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface TabInfo {
  id: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl?: string;
}

interface ConnectionStatus {
  status: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';
  message?: string;
  lastError?: Error;
}

const ProfessionalConnect: React.FC = () => {
  // State management with optimized hooks
  const [serverUrl, setServerUrl] = usePersistedState('ui.serverUrl', '');
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ status: 'idle' });
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounced URL to prevent excessive re-renders
  const debouncedServerUrl = useDebounce(serverUrl, 500);

  // WebSocket connection with professional management
  const {
    isConnected: isWebSocketConnected,
    isConnecting: isWebSocketConnecting,
    sendMessage,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    error: webSocketError
  } = useWebSocket({
    url: debouncedServerUrl,
    autoConnect: false,
    autoReconnect: true,
    reconnectInterval: 2000,
    maxReconnectAttempts: 5,
    timeout: 10000
  });

  // Load tabs from Chrome API
  const loadTabs = useCallback(async () => {
    try {
      const chromeTabs = await chrome.tabs.query({});
      const validTabs = chromeTabs
        .filter(tab => tab.url && tab.id && tab.title && !tab.url.startsWith('chrome://'))
        .map(tab => ({
          id: tab.id!,
          windowId: tab.windowId!,
          title: tab.title!,
          url: tab.url!,
          favIconUrl: tab.favIconUrl
        }));

      setTabs(validTabs);
      logger.info('connect-page', `Loaded ${validTabs.length} valid tabs`);
    } catch (error) {
      logger.error('connect-page', 'Failed to load tabs', error as Error);
      await errorHandler.handleError(error as Error, { operation: 'load_tabs' });
    }
  }, []);

  // Initialize component
  useEffect(() => {
    loadTabs();
    loadSavedConnectionState();
  }, [loadTabs]);

  const loadSavedConnectionState = useCallback(() => {
    try {
      const savedUrl = localStorage.getItem('browser_manager_last_url');
      if (savedUrl && !serverUrl) {
        setServerUrl(savedUrl);
      }
    } catch (error) {
      logger.warn('connect-page', 'Failed to load saved connection state', error as Error);
    }
  }, [serverUrl, setServerUrl]);

  // Connect to MCP server
  const handleConnect = useCallback(async () => {
    if (!debouncedServerUrl.trim()) {
      setConnectionStatus({
        status: 'error',
        message: 'Veuillez entrer une URL de serveur valide'
      });
      return;
    }

    setConnectionStatus({ status: 'connecting', message: 'Connexion au serveur MCP...' });

    try {
      // Save the URL for future use
      localStorage.setItem('browser_manager_last_url', debouncedServerUrl);

      // Connect WebSocket
      await connectWebSocket();

      setConnectionStatus({
        status: 'connected',
        message: 'Connecté au serveur MCP avec succès'
      });

      logger.info('connect-page', 'Successfully connected to MCP server', { url: debouncedServerUrl });

    } catch (error) {
      const appError = await errorHandler.handleError(error as Error, {
        operation: 'connect_mcp_server',
        url: debouncedServerUrl
      });

      setConnectionStatus({
        status: 'error',
        message: appError.userMessage,
        lastError: {
          name: appError.code,
          message: appError.message,
          stack: undefined
        } as Error
      });
    }
  }, [debouncedServerUrl, connectWebSocket]);

  // Connect to specific tab
  const handleConnectTab = useCallback(async (tabId: number) => {
    if (!isWebSocketConnected) {
      setConnectionStatus({
        status: 'error',
        message: 'Veuillez vous connecter au serveur MCP d\'abord'
      });
      return;
    }

    setSelectedTabId(tabId);

    try {
      await chrome.runtime.sendMessage({
        type: 'connectToTab',
        tabId,
        mcpRelayUrl: debouncedServerUrl
      });

      logger.info('connect-page', `Connected tab ${tabId} to MCP server`);

      // Close this window and focus on connected tab
      window.close();

    } catch (error) {
      await errorHandler.handleError(error as Error, {
        operation: 'connect_tab',
        tabId
      });

      setConnectionStatus({
        status: 'error',
        message: 'Échec de la connexion à l\'onglet'
      });
    }
  }, [isWebSocketConnected, debouncedServerUrl]);

  // Disconnect from MCP server
  const handleDisconnect = useCallback(async () => {
    try {
      disconnectWebSocket();
      setSelectedTabId(null);
      setConnectionStatus({ status: 'disconnected' });

      logger.info('connect-page', 'Disconnected from MCP server');

    } catch (error) {
      logger.error('connect-page', 'Failed to disconnect', error as Error);
    }
  }, [disconnectWebSocket]);

  // URL validation
  const isValidUrl = useMemo(() => {
    try {
      const url = new URL(debouncedServerUrl);
      return url.protocol === 'ws:' || url.protocol === 'wss:';
    } catch {
      return false;
    }
  }, [debouncedServerUrl]);

  // Connection status color mapping
  const getStatusColor = useCallback((status: ConnectionStatus['status']) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-blue-600';
      case 'error': return 'text-red-600';
      case 'disconnected': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browser Manager MCP
          </h1>
          <p className="text-gray-600">
            Connectez votre navigateur au serveur MCP pour l'automatisation
          </p>
        </div>

        {/* Connection Status */}
        {connectionStatus.status !== 'idle' && (
          <Alert
            variant={
              connectionStatus.status === 'connected' ? 'success' :
              connectionStatus.status === 'error' ? 'error' :
              connectionStatus.status === 'connecting' ? 'info' : 'warning'
            }
            title={connectionStatus.status === 'connected' ? 'Connexion réussie' :
                   connectionStatus.status === 'error' ? 'Erreur de connexion' :
                   connectionStatus.status === 'connecting' ? 'Connexion en cours' : 'Déconnecté'}
            dismissible={connectionStatus.status === 'connected' || connectionStatus.status === 'error'}
            onDismiss={() => setConnectionStatus({ status: 'idle' })}
          >
            {connectionStatus.message}
          </Alert>
        )}

        {/* Server Connection */}
        <Card className="mb-8" shadow="md">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">
              Connexion au serveur MCP
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <label htmlFor="server-url" className="block text-sm font-medium text-gray-700 mb-2">
                  URL du serveur WebSocket
                </label>
                <div className="flex space-x-3">
                  <input
                    id="server-url"
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="ws://localhost:8080"
                    className={cn(
                      'flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                      isValidUrl || !serverUrl ? 'border-gray-300' : 'border-red-300',
                      'transition-colors duration-200'
                    )}
                  />
                  <Button
                    onClick={handleConnect}
                    disabled={isWebSocketConnecting || !isValidUrl}
                    loading={isWebSocketConnecting}
                    loadingText="Connexion..."
                    variant={isWebSocketConnected ? 'danger' : 'primary'}
                  >
                    {isWebSocketConnected ? 'Déconnecter' : 'Se connecter'}
                  </Button>
                </div>
                {!isValidUrl && serverUrl && (
                  <p className="mt-1 text-sm text-red-600">
                    Veuillez entrer une URL WebSocket valide (ws:// ou wss://)
                  </p>
                )}
              </div>

              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  isWebSocketConnected ? 'bg-green-500' :
                  isWebSocketConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                )} />
                <span className={cn('text-sm font-medium', getStatusColor(connectionStatus.status))}>
                  {isWebSocketConnected ? 'Connecté' :
                   isWebSocketConnecting ? 'Connexion en cours...' :
                   'Non connecté'}
                </span>
                {isWebSocketConnected && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDisconnect}
                  >
                    Déconnecter
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Selection */}
        <Card shadow="md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Sélectionner un onglet
              </h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {tabs.length} onglets disponibles
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Moins' : 'Plus'} d'options
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tabs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <LoadingSpinner size="lg" />
                <p className="mt-4">Chargement des onglets...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={cn(
                      'flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200',
                      'hover:border-blue-300 hover:bg-blue-50',
                      selectedTabId === tab.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    )}
                    onClick={() => handleConnectTab(tab.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {tab.favIconUrl && (
                        <img
                          src={tab.favIconUrl}
                          alt=""
                          className="w-5 h-5"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {tab.title}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {tab.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedTabId === tab.id && (
                        <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                          Connecté
                        </span>
                      )}
                      <Button
                        size="sm"
                        disabled={!isWebSocketConnected}
                        variant={selectedTabId === tab.id ? 'secondary' : 'primary'}
                      >
                        {selectedTabId === tab.id ? 'Connecté' : 'Connecter'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Browser Manager MCP Extension v2.0 - Professional Edition
          </p>
        </div>
      </div>
    </div>
  );
};

// Initialize the React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ProfessionalConnect />);
}