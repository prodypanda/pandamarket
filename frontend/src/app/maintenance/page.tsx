'use client';

import { useEffect, useState, useCallback } from 'react';
import { Construction, RefreshCw, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MaintenanceSettings {
  maintenance_enabled: string;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_eta: string;
  maintenance_block_storefronts: string;
  marketplace_name: string;
  marketplace_logo_url: string;
}

function CountdownTimer({ eta }: { eta: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function calc() {
      const target = new Date(eta).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft('');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      );
    }
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [eta]);

  if (!timeLeft) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm">
      <Clock className="h-5 w-5 text-[#16C784]" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Retour estimé dans
        </p>
        <p className="mt-0.5 font-mono text-2xl font-bold tracking-widest text-white">
          {timeLeft}
        </p>
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);

  const checkMaintenance = useCallback(async () => {
    try {
      const res = await fetch('/api/pd/marketplace/settings');
      if (!res.ok) return;
      const data = await res.json();
      const s = data.data as MaintenanceSettings | undefined;
      if (!s) return;
      if (s.maintenance_enabled !== 'true') {
        router.replace('/');
        return;
      }
      setSettings(s);
    } catch {
      // Ignore
    }
  }, [router]);

  useEffect(() => {
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, [checkMaintenance]);

  const title = settings?.maintenance_title || 'Maintenance en cours';
  const message =
    settings?.maintenance_message ||
    'Notre plateforme est en cours de maintenance. Nous serons de retour très bientôt.';
  const eta = settings?.maintenance_eta || '';
  const marketplaceName = settings?.marketplace_name || 'PandaMarket';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f1c]">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #16C784 0%, transparent 70%)',
            animation: 'pulse-slow 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-15 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)',
            animation: 'pulse-slow 8s ease-in-out infinite 2s',
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
            animation: 'pulse-slow 7s ease-in-out infinite 1s',
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Main card */}
      <div className="relative z-10 mx-4 w-full max-w-lg text-center" style={{ animation: 'rise-in 0.6s ease-out' }}>
        {/* Panda icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl" style={{ animation: 'breathing-glow 3s ease-in-out infinite' }}>
          <Construction className="h-12 w-12 text-[#16C784]" />
        </div>

        {/* Content */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-gray-400">
            {message}
          </p>

          {eta && <CountdownTimer eta={eta} />}

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Vérification automatique toutes les 30 secondes</span>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-gray-600">
          {marketplaceName} — Nous serons bientôt de retour
        </p>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.15); opacity: 0.25; }
        }
        @keyframes rise-in {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes breathing-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(22, 199, 132, 0.15); }
          50% { box-shadow: 0 0 40px rgba(22, 199, 132, 0.3); }
        }
      `}</style>
    </div>
  );
}
