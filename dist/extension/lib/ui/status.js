import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { c as createRoot, T as TabItem, B as Button, A as AuthTokenSection } from "../../authToken-DIAu5wI6.mjs";
const StatusApp = () => {
  const [status, setStatus] = useState({
    isConnected: false,
    connectedTabId: null
  });
  useEffect(() => {
    void loadStatus();
  }, []);
  const loadStatus = async () => {
    const { connectedTabId } = await chrome.runtime.sendMessage({ type: "getConnectionStatus" });
    if (connectedTabId) {
      const tab = await chrome.tabs.get(connectedTabId);
      setStatus({
        isConnected: true,
        connectedTabId,
        connectedTab: {
          id: tab.id,
          windowId: tab.windowId,
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl
        }
      });
    } else {
      setStatus({
        isConnected: false,
        connectedTabId: null
      });
    }
  };
  const openConnectedTab = async () => {
    if (!status.connectedTabId)
      return;
    await chrome.tabs.update(status.connectedTabId, { active: true });
    window.close();
  };
  const disconnect = async () => {
    await chrome.runtime.sendMessage({ type: "disconnect" });
    window.close();
  };
  return /* @__PURE__ */ jsx("div", { className: "app-container", children: /* @__PURE__ */ jsxs("div", { className: "content-wrapper", children: [
    status.isConnected && status.connectedTab ? /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "tab-section-title", children: "Page avec client MCP connecté:" }),
      /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
        TabItem,
        {
          tab: status.connectedTab,
          button: /* @__PURE__ */ jsx(Button, { variant: "primary", onClick: disconnect, children: "Déconnecter" }),
          onClick: openConnectedTab
        }
      ) })
    ] }) : /* @__PURE__ */ jsx("div", { className: "status-banner", children: "Aucun client MCP n'est actuellement connecté." }),
    /* @__PURE__ */ jsx(AuthTokenSection, {})
  ] }) });
};
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(/* @__PURE__ */ jsx(StatusApp, {}));
}
