import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Share2, PlusSquare } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed standalone PWA, do not show install prompt
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <>
        <button
          id="pwa-install-btn"
          onClick={install}
          title="Install SQL Migration Task Manager as Desktop/Mobile App"
          className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800/60 shadow-none transition-colors cursor-pointer ${className}`}
        >
          <Download size={13} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>{variant === 'full' ? 'Install SQL Tasks App' : 'Install App'}</span>
        </button>
      </>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-btn"
          onClick={() => setShowIOSGuide(true)}
          title="Install on iOS"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer ${className}`}
        >
          <Smartphone size={13} className="text-blue-500" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            id="pwa-ios-modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              id="pwa-ios-modal"
              className="w-full max-w-sm rounded-xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] p-5 shadow-none animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                    <Smartphone size={18} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Install on iPhone / iPad
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                    1
                  </span>
                  <div className="pt-0.5">
                    Tap the <strong className="text-slate-800 dark:text-slate-100">Share</strong> button in the Safari bottom toolbar:
                    <div className="mt-1 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                      <Share2 size={13} />
                      <span>Share icon</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                    2
                  </span>
                  <div className="pt-0.5">
                    Scroll down and tap <strong className="text-slate-800 dark:text-slate-100">Add to Home Screen</strong>:
                    <div className="mt-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <PlusSquare size={13} />
                      <span>Add to Home Screen</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                id="pwa-ios-modal-close"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white shadow-none hover:bg-blue-700 transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
