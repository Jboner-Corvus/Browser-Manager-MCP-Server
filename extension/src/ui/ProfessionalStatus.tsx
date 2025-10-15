/**
 * Professional Status Page - Real-time monitoring and advanced features
 * Replaces the basic status.html with enterprise-grade dashboard
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { useStateValue } from '../hooks/useStateManager';
import { usePerformance, useResourceMonitor } from '../hooks/usePerformance';
import { logger } from '../core/logger';
import { stateManager } from '../core/stateManager';

import Button from '../components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface TabInfo {
  id: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl?: string;
}

interface ConnectionMetrics {
  connectedAt?: Date;
  uptime: number;
  messagesExchanged: number;
  averageLatency: number;
  lastActivity?: Date;
}

interface PerformanceData {
  renderTime: number;
  memoryUsage: number;
  componentCount: number;
}

const ProfessionalStatus: React.FC = () => {
  // State management with performance tracking
  const { reRenderCount, averageRenderTime } = usePerformance({ enableRenderTimeTracking: true });
  const { memory, performanceGrade, isHighMemoryUsage } = useResourceMonitor();

  // Connection state
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    connectedTabId: null as number | null,
    connectedTab: null as TabInfo | null,
    metrics: null as ConnectionMetrics | null
  });

  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Load connection status
  const loadConnectionStatus = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'getConnectionStatus' });

      let connectedTab: TabInfo | null = null;
      if (response.connectedTabId) {
        const tab = await chrome.tabs.get(response.connectedTabId);
        connectedTab = {
          id: tab.id!,
          windowId: tab.windowId!,
          title: tab.title!,
          url: tab.url!,
          favIconUrl: tab.favIconUrl
        };
      }

      // Get performance metrics from state manager
      const performanceMetrics = stateManager.getValue('performance');

      setConnectionState({
        isConnected: !!response.connectedTabId,
        connectedTabId: response.connectedTabId,
        connectedTab,
        metrics: {
          connectedAt: performanceMetrics?.lastConnectedAt ? new Date(performanceMetrics.lastConnectedAt) : undefined,
          uptime: performanceMetrics?.uptime || 0,
          messagesExchanged: performanceMetrics?.messageCount || 0,
          averageLatency: performanceMetrics?.connectionLatency || 0,
          lastActivity: new Date()
        }
      });

    } catch (error) {
      logger.error('status-page', 'Failed to load connection status', error as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize and set up auto-refresh
  useEffect(() => {
    loadConnectionStatus();

    const interval = setInterval(loadConnectionStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [loadConnectionStatus, refreshInterval]);

  // Disconnect function
  const handleDisconnect = useCallback(async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'disconnect' });
      window.close();
    } catch (error) {
      logger.error('status-page', 'Failed to disconnect', error as Error);
    }
  }, []);

  // Open connected tab
  const handleOpenTab = useCallback(async () => {
    if (connectionState.connectedTabId) {
      try {
        await chrome.tabs.update(connectionState.connectedTabId, { active: true });
        window.close();
      } catch (error) {
        logger.error('status-page', 'Failed to open tab', error as Error);
      }
    }
  }, [connectionState.connectedTabId]);

  // Format uptime
  const formatUptime = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Get connection status color
  const getStatusColor = useCallback((isConnected: boolean) => {
    return isConnected ? 'text-green-600' : 'text-gray-600';
  }, []);

  // Performance metrics memoization
  const performanceData = useMemo((): PerformanceData => ({
    renderTime: averageRenderTime,
    memoryUsage: memory,
    componentCount: 1 // This component
  }), [averageRenderTime, memory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" />
          <p className="mt-4 text-gray-600">Chargement du statut de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Statut de Connexion MCP
          </h1>
          <p className="text-gray-600">
            Surveillance en temps réel de votre connexion Browser Manager
          </p>
        </div>

        {/* Connection Status Card */}
        <Card className="mb-6" shadow="md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                État de la Connexion
              </h2>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  connectionState.isConnected ? 'bg-green-500' : 'bg-gray-400'
                )} />
                <span className={cn('text-sm font-medium', getStatusColor(connectionState.isConnected))}>
                  {connectionState.isConnected ? 'Connecté' : 'Non connecté'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {connectionState.isConnected && connectionState.connectedTab ? (
              <div className="space-y-4">
                {/* Connected Tab Info */}
                <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  {connectionState.connectedTab.favIconUrl && (
                    <img
                      src={connectionState.connectedTab.favIconUrl}
                      alt=""
                      className="w-8 h-8"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {connectionState.connectedTab.title}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">
                      {connectionState.connectedTab.url}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleOpenTab}>
                      Ouvrir l'onglet
                    </Button>
                    <Button size="sm" variant="danger" onClick={handleDisconnect}>
                      Déconnecter
                    </Button>
                  </div>
                </div>

                {/* Connection Metrics */}
                {connectionState.metrics && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatUptime(connectionState.metrics.uptime)}
                      </div>
                      <div className="text-sm text-gray-600">Temps de connexion</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {connectionState.metrics.messagesExchanged}
                      </div>
                      <div className="text-sm text-gray-600">Messages échangés</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {connectionState.metrics.averageLatency.toFixed(0)}ms
                      </div>
                      <div className="text-sm text-gray-600">Latence moyenne</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucune connexion active
                </h3>
                <p className="text-gray-600 mb-4">
                  Aucun client MCP n'est actuellement connecté.
                </p>
                <Button onClick={async () => { await chrome.tabs.create({ url: chrome.runtime.getURL('lib/ui/connect.html') }); }}>
                  Se connecter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Monitoring */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Extension Performance */}
          <Card shadow="md">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Performance de l'Extension
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Utilisation mémoire</span>
                  <span className={cn(
                    'text-sm font-medium',
                    isHighMemoryUsage ? 'text-red-600' : 'text-green-600'
                  )}>
                    {memory.toFixed(1)} MB
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Note de performance</span>
                  <span className={cn(
                    'text-sm font-medium',
                    performanceGrade === 'A' ? 'text-green-600' :
                    performanceGrade === 'B' ? 'text-blue-600' :
                    performanceGrade === 'C' ? 'text-yellow-600' : 'text-red-600'
                  )}>
                    {performanceGrade}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rendus du composant</span>
                  <span className="text-sm font-medium text-gray-900">
                    {reRenderCount}
                  </span>
                </div>
                {isHighMemoryUsage && (
                  <Alert variant="warning" dismissible>
                    L'utilisation mémoire est élevée. Considérez recharger l'extension.
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card shadow="md">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Informations Système
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Navigateur</span>
                  <span className="text-sm font-medium text-gray-900">
                    {navigator.userAgent.split(' ')[0]}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Version d'Extension</span>
                  <span className="text-sm font-medium text-gray-900">
                    2.0.0 Professional
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Intervalle de rafraîchissement</span>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value={1000}>1s</option>
                    <option value={5000}>5s</option>
                    <option value={10000}>10s</option>
                    <option value={30000}>30s</option>
                  </select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full"
                >
                  {showDetails ? 'Masquer' : 'Afficher'} les détails
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Details */}
        {showDetails && (
          <Card shadow="md">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Détails Techniques
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">État du gestionnaire d'état</h4>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(stateManager.getValue('connection'), null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Métriques de performance</h4>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(performanceData, null, 2)}
                  </pre>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => { const logs = logger.exportLogs(); console.log(logs); }}>
                    Exporter les logs
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { const state = stateManager.exportState(); console.log(state); }}>
                    Exporter l'état
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Browser Manager MCP Extension v2.0 - Professional Edition
          </p>
          <p className="mt-1">
            Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper function for className merging
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Initialize the React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ProfessionalStatus />);
}