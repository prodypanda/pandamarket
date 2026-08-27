'use client';

import React, { useState, useEffect } from 'react';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between space-x-3">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">🐼</span>
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Installer PandaMarket</h4>
          <p className="text-[11px] text-slate-500">Accédez au catalogue même sans connexion.</p>
        </div>
      </div>
      <div className="flex space-x-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowPrompt(false)}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1"
        >
          Plus tard
        </button>
        <button
          type="button"
          onClick={handleInstall}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow"
        >
          Installer
        </button>
      </div>
    </div>
  );
}
