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

import React from 'react';

export interface TabInfo {
  id: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl?: string;
}

export interface TabItemProps {
  tab: TabInfo;
  button?: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<{
  variant: 'primary' | 'default' | 'reject';
  onClick: () => void;
  children: React.ReactNode;
}> = ({ variant, onClick, children }) => {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    default: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    reject: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export const TabItem: React.FC<TabItemProps> = ({ tab, button, onClick }) => {
  return (
    <div
      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        {tab.favIconUrl && (
          <img
            src={tab.favIconUrl}
            alt=""
            className="w-4 h-4"
          />
        )}
        <div>
          <div className="font-medium text-gray-900 truncate max-w-xs">
            {tab.title}
          </div>
          <div className="text-sm text-gray-500 truncate max-w-xs">
            {tab.url}
          </div>
        </div>
      </div>
      {button && <div>{button}</div>}
    </div>
  );
};