import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-lg bg-amber-500/95 dark:bg-amber-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-white shadow-none border border-amber-400/30 animate-pulse"
      role="status"
      aria-live="polite"
    >
      <WifiOff size={14} className="shrink-0" />
      <span>Offline Mode — Using cached data & local offline storage.</span>
    </div>
  );
};
