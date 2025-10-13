import require$$0 from "react-dom";
import { jsx, jsxs } from "react/jsx-runtime";
import React, { useState, useCallback } from "react";
var createRoot;
var m = require$$0;
if (process.env.NODE_ENV === "production") {
  createRoot = m.createRoot;
  m.hydrateRoot;
} else {
  var i = m.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  createRoot = function(c, o) {
    i.usingClientEntryPoint = true;
    try {
      return m.createRoot(c, o);
    } finally {
      i.usingClientEntryPoint = false;
    }
  };
}
const Button = ({ variant, onClick, children }) => {
  const baseClasses = "px-4 py-2 rounded font-medium transition-colors";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    default: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    reject: "bg-red-600 text-white hover:bg-red-700"
  };
  return /* @__PURE__ */ jsx(
    "button",
    {
      className: `${baseClasses} ${variantClasses[variant]}`,
      onClick,
      children
    }
  );
};
const TabItem = ({ tab, button, onClick }) => {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer",
      onClick,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3", children: [
          tab.favIconUrl && /* @__PURE__ */ jsx(
            "img",
            {
              src: tab.favIconUrl,
              alt: "",
              className: "w-4 h-4"
            }
          ),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium text-gray-900 truncate max-w-xs", children: tab.title }),
            /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-500 truncate max-w-xs", children: tab.url })
          ] })
        ] }),
        button && /* @__PURE__ */ jsx("div", { children: button })
      ]
    }
  );
};
const CopyToClipboard = ({ value }) => {
  const [copied, setCopied] = useState(false);
  React.useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2e3);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
    }
  }, [value]);
  return /* @__PURE__ */ jsx(
    "button",
    {
      onClick: handleCopy,
      className: "px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors",
      title: "Copier dans le presse-papiers",
      children: copied ? "✓ Copié" : "📋 Copier"
    }
  );
};
const AuthTokenSection = ({}) => {
  const [showToken, setShowToken] = useState(false);
  const onRegenerateToken = useCallback(() => {
    localStorage.removeItem("browserManagerAuthToken");
    getOrCreateAuthToken();
    setShowToken(true);
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "auth-token-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold mb-2", children: "Authentification" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Pour une connexion automatique sans intervention utilisateur, utilisez ce token d'authentification." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setShowToken(!showToken),
          className: "px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors",
          children: showToken ? "Masquer le token" : "Afficher le token"
        }
      ),
      showToken && /* @__PURE__ */ jsxs("div", { className: "p-4 bg-gray-50 rounded border", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "Token d'authentification:" }),
          /* @__PURE__ */ jsx(CopyToClipboard, { value: getOrCreateAuthToken() })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "auth-token-code font-mono text-sm bg-white p-2 rounded border break-all", children: getOrCreateAuthToken() })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: onRegenerateToken,
          className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors",
          children: "Régénérer le token"
        }
      )
    ] })
  ] });
};
function generateAuthToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const getOrCreateAuthToken = () => {
  const storageKey = "browserManagerAuthToken";
  let token = localStorage.getItem(storageKey);
  if (!token) {
    token = generateAuthToken();
    localStorage.setItem(storageKey, token);
  }
  return token;
};
export {
  AuthTokenSection as A,
  Button as B,
  TabItem as T,
  createRoot as c,
  getOrCreateAuthToken as g
};
