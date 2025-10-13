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

import React, { useCallback, useState } from 'react';
import { CopyToClipboard } from './copyToClipboard';

export const AuthTokenSection: React.FC<{}> = ({}) => {
  const [showToken, setShowToken] = useState(false);

  const onRegenerateToken = useCallback(() => {
    // Clear existing token
    localStorage.removeItem('browserManagerAuthToken');
    // Generate new token
    getOrCreateAuthToken();
    setShowToken(true);
  }, []);

  return (
    <div className="auth-token-section">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Authentification</h3>
        <p className="text-sm text-gray-600 mb-4">
          Pour une connexion automatique sans intervention utilisateur, utilisez ce token d'authentification.
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setShowToken(!showToken)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
        >
          {showToken ? 'Masquer le token' : 'Afficher le token'}
        </button>

        {showToken && (
          <div className="p-4 bg-gray-50 rounded border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Token d'authentification:</span>
              <CopyToClipboard value={getOrCreateAuthToken()} />
            </div>
            <div className="auth-token-code font-mono text-sm bg-white p-2 rounded border break-all">
              {getOrCreateAuthToken()}
            </div>
          </div>
        )}

        <button
          onClick={onRegenerateToken}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
        >
          Régénérer le token
        </button>
      </div>
    </div>
  );
};

function generateAuthToken(): string {
  // Generate a cryptographically secure random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  // Convert to base64url format (URL-safe base64)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const getOrCreateAuthToken = (): string => {
  const storageKey = 'browserManagerAuthToken';
  let token = localStorage.getItem(storageKey);

  if (!token) {
    token = generateAuthToken();
    localStorage.setItem(storageKey, token);
  }

  return token;
};