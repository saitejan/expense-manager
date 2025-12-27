/**
 * Network status indicator badge
 * Shows online/offline status and pending expense count
 */

import React from 'react';
import { Cloud, CloudOff } from 'lucide-react';

interface NetworkStatusBadgeProps {
  isOnline: boolean;
  pendingCount?: number;
}

/**
 * Displays current network status with visual indicator
 * @param isOnline - Whether the app is currently online
 * @param pendingCount - Number of pending expenses (optional)
 */
export const NetworkStatusBadge: React.FC<NetworkStatusBadgeProps> = ({ isOnline, pendingCount = 0 }) => {
  return (
    <div
      className={`flex items-center text-sm font-medium p-2 rounded-full ${
        isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {isOnline ? (
        <>
          <Cloud className="w-4 h-4 mr-1" />
          Online
          {pendingCount > 0 && (
            <span className="ml-2 font-bold">{`(${pendingCount} Pending)`}</span>
          )}
        </>
      ) : (
        <>
          <CloudOff className="w-4 h-4 mr-1" />
          Offline
        </>
      )}
    </div>
  );
};
