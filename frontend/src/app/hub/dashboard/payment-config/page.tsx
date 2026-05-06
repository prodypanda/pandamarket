'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect } from 'react';
import {
  CreditCard,
  Save,
  AlertCircle,
  CheckCircle,
  Lock,
  Crown,
  Loader2,
} from 'lucide-react';

interface StoreInfo {
  id: string;
  subscription_plan: string;
}

async function getErrorMessage(res: Response, fallback = 'Request failed') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

export default function PaymentConfigPage() {
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Payment config fields
  const [flouciAppToken, setFlouciAppToken] = useState('');
  const [flouciAppSecret, setFlouciAppSecret] = useState('');
  const [konnectApiKey, setKonnectApiKey] = useState('');
  const [konnectReceiverWallet, setKonnectReceiverWallet] = useState('');

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setStore({
            id: data.store?.id || '',
            subscription_plan: data.store?.subscription_plan || 'free',
          });
        } else {
          setError(await getErrorMessage(res, 'Failed to load store information'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      }
      setLoading(false);
    }
    fetchStore();
  }, []);

  const isPlanEligible = store
    ? ['pro', 'golden', 'platinum'].includes(store.subscription_plan.toLowerCase())
    : false;

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const body: Record<string, string> = {};
      if (flouciAppToken) body.flouci_app_token = flouciAppToken;
      if (flouciAppSecret) body.flouci_app_secret = flouciAppSecret;
      if (konnectApiKey) body.konnect_api_key = konnectApiKey;
      if (konnectReceiverWallet) body.konnect_receiver_wallet = konnectReceiverWallet;

      if (Object.keys(body).length === 0) {
        setError('Please fill in at least one field');
        setSaving(false);
        return;
      }

      const res = await fetchWithCsrf('/api/pd/stores/me/payment-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess('Payment configuration saved successfully');
        // Clear fields after save (they're encrypted on the server)
        setFlouciAppToken('');
        setFlouciAppSecret('');
        setKonnectApiKey('');
        setKonnectReceiverWallet('');
      } else {
        setError(await getErrorMessage(res, 'Failed to save payment configuration'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Configuration</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isPlanEligible) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Configuration</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Pro Plan Required</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Direct payment configuration is available for Pro, Golden, and Platinum plans.
            Upgrade your plan to configure your own Flouci or Konnect credentials.
          </p>
          <a
            href="/hub/dashboard/subscription"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#16C784] text-white font-semibold rounded-xl hover:bg-[#14b876] transition-colors"
          >
            <Crown className="w-4 h-4" />
            Upgrade Plan
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Configuration</h1>
        <p className="text-gray-500 mt-1">
          Configure your own payment provider credentials for direct payments.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">Encrypted at rest</p>
          <p className="text-sm text-blue-700">
            Your credentials are encrypted before being stored. They are never exposed in API
            responses.
          </p>
        </div>
      </div>

      {/* Flouci Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Flouci</h2>
            <p className="text-sm text-gray-500">Accept payments via Flouci wallet and cards</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Token</label>
            <input
              type="password"
              value={flouciAppToken}
              onChange={(e) => setFlouciAppToken(e.target.value)}
              placeholder="Enter your Flouci app token"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Secret</label>
            <input
              type="password"
              value={flouciAppSecret}
              onChange={(e) => setFlouciAppSecret(e.target.value)}
              placeholder="Enter your Flouci app secret"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Konnect Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Konnect</h2>
            <p className="text-sm text-gray-500">Accept payments via the Konnect network</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={konnectApiKey}
              onChange={(e) => setKonnectApiKey(e.target.value)}
              placeholder="Enter your Konnect API key"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Wallet ID</label>
            <input
              type="text"
              value={konnectReceiverWallet}
              onChange={(e) => setKonnectReceiverWallet(e.target.value)}
              placeholder="Enter your Konnect wallet ID"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#16C784] text-white font-semibold rounded-xl hover:bg-[#14b876] transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
