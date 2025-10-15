let isConnected = false;
let currentTabId = null;
let connectionStatus = {
  isConnected: false,
  connectedTabId: null,
  uptime: 0,
  lastChecked: /* @__PURE__ */ new Date()
};
let statusElement = null;
let connectButton = null;
let wsUrlInput = null;
let tabsList = null;
document.addEventListener("DOMContentLoaded", () => {
  initializeElements();
  setupEventListeners();
  checkConnectionStatus();
  startStatusMonitoring();
});
function initializeElements() {
  statusElement = document.getElementById("status");
  connectButton = document.getElementById("connectBtn");
  wsUrlInput = document.getElementById("wsUrl");
  tabsList = document.getElementById("tabsList");
  if (wsUrlInput) {
    wsUrlInput.value = "ws://localhost:8084";
  }
}
function setupEventListeners() {
  if (connectButton) {
    connectButton.addEventListener("click", toggleConnection);
  }
  if (wsUrlInput) {
    wsUrlInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        toggleConnection();
      }
    });
  }
}
function updateStatus(text, type) {
  if (!statusElement) return;
  statusElement.textContent = text;
  statusElement.className = `status ${type}`;
  isConnected = type === "connected";
}
function toggleConnection() {
  if (isConnected) {
    disconnect();
  } else {
    connect();
  }
}
async function connect() {
  if (!wsUrlInput) {
    updateStatus("URL WebSocket requise", "error");
    return;
  }
  const wsUrl = wsUrlInput.value.trim();
  if (!wsUrl) {
    updateStatus("URL WebSocket invalide", "error");
    return;
  }
  updateStatus("Connexion en cours...", "connecting");
  setButtonState("connecting");
  try {
    const connectResponse = await sendMessage({
      type: "connectToMCPRelay",
      mcpRelayUrl: wsUrl
    });
    if (!connectResponse.success) {
      throw new Error(connectResponse.error || "Échec de connexion au relay");
    }
    const tabsResponse = await sendMessage({ type: "getTabs" });
    if (!tabsResponse.success) {
      throw new Error(tabsResponse.error || "Échec de récupération des onglets");
    }
    const tabs = tabsResponse.data || [];
    if (!Array.isArray(tabs) || tabs.length === 0) {
      throw new Error("Aucun onglet disponible");
    }
    const activeTab = tabs.find((tab) => tab.active) || tabs[0];
    const connectTabResponse = await sendMessage({
      type: "connectToTab",
      tabId: activeTab.id,
      windowId: activeTab.windowId,
      mcpRelayUrl: wsUrl
    });
    if (!connectTabResponse.success) {
      throw new Error(connectTabResponse.error || "Échec de connexion à l'onglet");
    }
    currentTabId = activeTab.id;
    updateStatus("Connecté - MCP Ready", "connected");
    setButtonState("connected");
    await updateConnectionStatus();
    displayTabs(tabs, activeTab.id);
  } catch (error) {
    console.error("Connection error:", error);
    updateStatus(`Erreur: ${error.message}`, "error");
    setButtonState("disconnected");
  }
}
async function disconnect() {
  updateStatus("Déconnexion...", "connecting");
  setButtonState("disconnecting");
  try {
    const response = await sendMessage({ type: "disconnect" });
    if (response.success) {
      currentTabId = null;
      updateStatus("Déconnecté", "disconnected");
      setButtonState("disconnected");
      hideTabsList();
    } else {
      throw new Error(response.error || "Échec de déconnexion");
    }
  } catch (error) {
    console.error("Disconnect error:", error);
    updateStatus(`Erreur: ${error.message}`, "error");
    setButtonState("connected");
  }
}
async function checkConnectionStatus() {
  try {
    const response = await sendMessage({ type: "getConnectionStatus" });
    if (response.success) {
      const status = response.data;
      connectionStatus = {
        ...status,
        lastChecked: /* @__PURE__ */ new Date()
      };
      if (status.isConnected) {
        currentTabId = status.connectedTabId;
        updateStatus("Connecté - MCP Ready", "connected");
        setButtonState("connected");
        const tabsResponse = await sendMessage({ type: "getTabs" });
        if (tabsResponse.success) {
          const tabs = tabsResponse.data || [];
          if (Array.isArray(tabs)) {
            displayTabs(tabs, status.connectedTabId);
          }
        }
      } else {
        updateStatus("Déconnecté", "disconnected");
        setButtonState("disconnected");
      }
    }
  } catch (error) {
    console.error("Status check error:", error);
    updateStatus("Erreur de vérification du statut", "error");
    setButtonState("disconnected");
  }
}
function setButtonState(state) {
  if (!connectButton) return;
  switch (state) {
    case "connecting":
      connectButton.textContent = "Connexion...";
      connectButton.disabled = true;
      break;
    case "connected":
      connectButton.textContent = "Se déconnecter";
      connectButton.disabled = false;
      break;
    case "disconnected":
      connectButton.textContent = "Se connecter";
      connectButton.disabled = false;
      break;
    case "disconnecting":
      connectButton.textContent = "Déconnexion...";
      connectButton.disabled = true;
      break;
  }
}
function displayTabs(tabs, connectedTabId) {
  if (!tabsList) return;
  if (!Array.isArray(tabs) || tabs.length === 0) {
    tabsList.innerHTML = `
      <div class="tabs-header">
        <h4>Aucun onglet disponible</h4>
      </div>
    `;
    return;
  }
  tabsList.style.display = "block";
  tabsList.innerHTML = `
    <div class="tabs-header">
      <h4>Onglets disponibles (${tabs.length})</h4>
      <div class="connection-info">
        <small>Connecté à: ${connectedTabId ? `Onglet ${connectedTabId}` : "Aucun"}</small>
      </div>
    </div>
    <div class="tabs-grid">
      ${tabs.map((tab) => createTabElement(tab, tab.id === connectedTabId)).join("")}
    </div>
  `;
}
function createTabElement(tab, isConnected2) {
  const title = tab.title || "Sans titre";
  const url = tab.url || "";
  const domain = extractDomain(url);
  const connectedClass = isConnected2 ? "connected" : "";
  return `
    <div class="tab-item ${connectedClass}" data-tab-id="${tab.id}">
      <div class="tab-icon">
        ${getFaviconUrl(url)}
      </div>
      <div class="tab-info">
        <div class="tab-title" title="${title}">${title}</div>
        <div class="tab-url" title="${url}">${domain}</div>
      </div>
      <div class="tab-status">
        ${isConnected2 ? '<span class="status-indicator connected"></span>' : ""}
      </div>
    </div>
  `;
}
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}
function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    return `<img src="https://www.google.com/s2/favicons?domain=${urlObj.hostname}&size=16" alt="favicon" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23999%22><path d=%22M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z%22/></svg>'" />`;
  } catch {
    return '<div class="default-favicon">📄</div>';
  }
}
function hideTabsList() {
  if (tabsList) {
    tabsList.style.display = "none";
  }
}
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else {
        resolve(response);
      }
    });
  });
}
async function updateConnectionStatus() {
  try {
    const response = await sendMessage({ type: "getConnectionStatus" });
    if (response.success) {
      connectionStatus = {
        ...response.data,
        lastChecked: /* @__PURE__ */ new Date()
      };
    }
  } catch (error) {
    console.error("Failed to update connection status:", error);
  }
}
function startStatusMonitoring() {
  setInterval(async () => {
    if (isConnected) {
      await updateConnectionStatus();
    }
  }, 1e4);
}
export {
  checkConnectionStatus,
  disconnect,
  toggleConnection
};
