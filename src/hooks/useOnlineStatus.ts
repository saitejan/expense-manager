/**
 * Hook to monitor network connectivity status
 * Updates state when browser goes online or offline
 */

import { useState, useEffect } from 'react';

/**
 * Monitors online/offline network status
 * @returns Current online status (true if online, false if offline)
 */
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
