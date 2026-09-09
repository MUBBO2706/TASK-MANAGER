import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X, Share2, PlusSquare } from 'lucide-react';

export const PWAInstallModal: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install, isPromptHandled, dismissPrompt } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, or prompt was cancelled/downloaded previously, do NOT show
  if (isInstalled || isPromptHandled) {
    return null;
  }

  // Show if installable on Android/Chromium/Desktop or if on iOS
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleDownload = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      await install();
      dismissPrompt();
    }
  };

  const handleCancel = () => {
    dismissPrompt();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={handleCancel}
    >
      <div 
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] p-5 flex flex-col text-left font-sans shadow-none transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="SQL Tasks Icon" className="w-11 h-11 rounded-xl shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Install SQL Tasks
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Install app for fast access and offline usage
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Cancel"
          >
            <X size={18} />
          </button>
        </div>

        {showIOSGuide ? (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                1
              </span>
              <div className="pt-0.5">
                Tap the <strong className="text-slate-800 dark:text-slate-100">Share</strong> icon in Safari toolbar:
                <div className="mt-1 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                  <Share2 size={13} />
                  <span>Share button</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                2
              </span>
              <div className="pt-0.5">
                Scroll & tap <strong className="text-slate-800 dark:text-slate-100">Add to Home Screen</strong>:
                <div className="mt-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <PlusSquare size={13} />
                  <span>Add to Home Screen</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  dismissPrompt();
                  setShowIOSGuide(false);
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-none"
              >
                Got it
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2.5">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-zinc-700 shadow-none"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-none"
            >
              <Download size={14} />
              <span>Download / Install</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
