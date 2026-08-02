'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchWithCsrf } from '@/lib/api';
import {
  Monitor,
  Tablet,
  Smartphone,
  Send,
  ArrowLeft,
} from 'lucide-react';

interface StorefrontPreviewBarProps {
  storeName: string;
  themeName: string;
  token?: string;
  mode: 'draft' | 'live';
  children: React.ReactNode;
}

type Viewport = 'desktop' | 'tablet' | 'mobile';

export function StorefrontPreviewBar({
  storeName,
  themeName,
  mode,
  children,
}: StorefrontPreviewBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleModeChange = (newMode: 'draft' | 'live') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', newMode);
    router.replace(`?${params.toString()}`);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/theme/publish-draft', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setFeedback('Thème publié avec succès ! Redirection...');
        setTimeout(() => {
          window.location.href = '/hub/dashboard/online-store/customize';
        }, 1500);
      } else {
        setFeedback('Erreur lors de la publication du thème');
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      setFeedback('Erreur réseau');
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Top Preview Control Bar */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 shadow-xl backdrop-blur">
        {/* Left: Store info & Back button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quitter l&apos;aperçu</span>
          </button>
          <div className="hidden sm:block text-xs">
            <span className="font-bold text-white">{storeName}</span>
            <span className="ml-2 text-slate-400">Thème: <strong className="text-slate-200">{themeName}</strong></span>
          </div>
        </div>

        {/* Center: Viewport Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            title="Mode Ordinateur (100%)"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
              viewport === 'desktop'
                ? 'bg-[#B91C1C] text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bureau</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport('tablet')}
            title="Mode Tablette (768px)"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
              viewport === 'tablet'
                ? 'bg-[#B91C1C] text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tablet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tablette</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            title="Mode Mobile (375px)"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
              viewport === 'mobile'
                ? 'bg-[#B91C1C] text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Right: Compare Mode & Publish Action */}
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="hidden lg:flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs">
            <button
              type="button"
              onClick={() => handleModeChange('draft')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                mode === 'draft' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'
              }`}
            >
              Brouillon
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('live')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                mode === 'live' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
              }`}
            >
              En direct
            </button>
          </div>

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-1.5 rounded-xl bg-[#B91C1C] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#991B1B] transition shadow-md disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{publishing ? 'Publication...' : 'Publier ce thème'}</span>
          </button>
        </div>
      </header>

      {feedback && (
        <div className="bg-amber-500 py-2 text-center text-xs font-bold text-slate-950">
          {feedback}
        </div>
      )}

      {/* Main Viewport Shell */}
      <div className="flex-1 overflow-y-auto bg-slate-900 py-6 flex justify-center">
        <div
          className={`transition-all duration-300 bg-white shadow-2xl overflow-hidden ${
            viewport === 'desktop'
              ? 'w-full min-h-screen'
              : viewport === 'tablet'
              ? 'w-[768px] min-h-[900px] rounded-3xl border-8 border-slate-800 shadow-2xl my-4'
              : 'w-[375px] min-h-[750px] rounded-3xl border-8 border-slate-800 shadow-2xl my-4'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
