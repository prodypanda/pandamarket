'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface ApiKey {
  id: string;
  key_prefix: string;
  label: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const AVAILABLE_SCOPES = [
  'read:products',
  'write:products',
  'read:orders',
  'write:orders',
  'read:customers',
  'full_access',
];

export default function ApiKeysPage() {
  const { t, locale } = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  const scopeInfo: Record<string, { label: string; desc: string }> = {
    'read:products': {
      label: t('dashboardPages.apiKeys.scopeReadProductsLabel'),
      desc: t('dashboardPages.apiKeys.scopeReadProductsDesc'),
    },
    'write:products': {
      label: t('dashboardPages.apiKeys.scopeWriteProductsLabel'),
      desc: t('dashboardPages.apiKeys.scopeWriteProductsDesc'),
    },
    'read:orders': {
      label: t('dashboardPages.apiKeys.scopeReadOrdersLabel'),
      desc: t('dashboardPages.apiKeys.scopeReadOrdersDesc'),
    },
    'write:orders': {
      label: t('dashboardPages.apiKeys.scopeWriteOrdersLabel'),
      desc: t('dashboardPages.apiKeys.scopeWriteOrdersDesc'),
    },
    'read:customers': {
      label: t('dashboardPages.apiKeys.scopeReadCustomersLabel'),
      desc: t('dashboardPages.apiKeys.scopeReadCustomersDesc'),
    },
    'full_access': {
      label: t('dashboardPages.apiKeys.scopeFullAccessLabel'),
      desc: t('dashboardPages.apiKeys.scopeFullAccessDesc'),
    },
  };

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newScopes, setNewScopes] = useState<string[]>([]);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Newly created key (shown once)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke confirmation
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/vendor/api-keys', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.data || []);
      } else {
        setError(t('dashboardPages.apiKeys.errorLoadFailed'));
      }
    } catch {
      setError(t('dashboardPages.apiKeys.errorNetwork'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void fetchKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    setCreateError('');
    if (!newLabel.trim()) {
      setCreateError(t('dashboardPages.apiKeys.errorLabelRequired'));
      return;
    }
    if (newScopes.length === 0) {
      setCreateError(t('dashboardPages.apiKeys.errorSelectScope'));
      return;
    }

    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        label: newLabel.trim(),
        scopes: newScopes,
      };
      if (newExpiresAt) {
        body.expires_at = new Date(newExpiresAt).toISOString();
      }

      const res = await fetchWithCsrf('/api/pd/vendor/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setNewlyCreatedKey(data.key);
        setShowCreate(false);
        setNewLabel('');
        setNewScopes([]);
        setNewExpiresAt('');
        fetchKeys();
      } else {
        const data = await res.json();
        setCreateError(data.error?.message || t('dashboardPages.apiKeys.errorCreateFailed'));
      }
    } catch {
      setCreateError(t('dashboardPages.apiKeys.errorNetwork'));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    setRevoking(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/vendor/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch {
      // ignore
    } finally {
      setRevoking(false);
      setRevokeId(null);
    }
  };

  const handleCopyKey = async () => {
    if (newlyCreatedKey) {
      await navigator.clipboard.writeText(newlyCreatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleScope = (scope: string) => {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboardPages.apiKeys.title')}</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboardPages.apiKeys.title')}</h1>
          <p className="text-gray-500 mt-1">
            {t('dashboardPages.apiKeys.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setNewlyCreatedKey(null);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#B91C1C] text-white font-semibold rounded-lg hover:bg-[#991B1B] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('dashboardPages.apiKeys.createKey')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>
      )}

      {/* Newly Created Key Banner */}
      {newlyCreatedKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-yellow-800 mb-1">
                {t('dashboardPages.apiKeys.saveKeyWarning')}
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                {t('dashboardPages.apiKeys.saveKeyWarningDesc')}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2.5 bg-white border border-yellow-300 rounded-lg text-sm font-mono text-gray-900 break-all">
                  {newlyCreatedKey}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="p-2.5 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-yellow-700" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
            >
              {t('dashboardPages.apiKeys.dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">{t('dashboardPages.apiKeys.createNewApiKey')}</h2>
          {createError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{createError}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboardPages.apiKeys.label')}</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={t('dashboardPages.apiKeys.labelPlaceholder')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('dashboardPages.apiKeys.scopes')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_SCOPES.map((scope) => {
                  const info = scopeInfo[scope];
                  return (
                    <label
                      key={scope}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        newScopes.includes(scope)
                          ? 'border-[#B91C1C] bg-[#B91C1C]/5'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newScopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="mt-0.5 text-[#B91C1C] focus:ring-[#B91C1C]"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{info.label}</p>
                        <p className="text-xs text-gray-500">{info.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboardPages.apiKeys.expirationOptional')}
              </label>
              <input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-6 py-2.5 bg-[#B91C1C] text-white font-semibold rounded-lg hover:bg-[#991B1B] transition-colors disabled:opacity-50"
              >
                {creating ? t('dashboardPages.apiKeys.creating') : t('dashboardPages.apiKeys.createApiKey')}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-6 py-2.5 text-gray-600 font-medium hover:text-gray-800 transition-colors"
              >
                {t('dashboardPages.apiKeys.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{t('dashboardPages.apiKeys.yourApiKeys')}</h2>
        </div>
        {keys.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('dashboardPages.apiKeys.emptyState')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {keys.map((key) => (
              <div key={key.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        key.is_active ? 'bg-green-50' : 'bg-gray-100'
                      }`}
                    >
                      <Key
                        className={`w-4 h-4 ${
                          key.is_active ? 'text-green-600' : 'text-gray-400'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{key.label}</p>
                      <p className="text-sm text-gray-500 font-mono">{key.key_prefix}••••••••</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      {key.is_active ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700">
                          {t('dashboardPages.apiKeys.active')}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                          {t('dashboardPages.apiKeys.revoked')}
                        </span>
                      )}
                    </div>
                    {key.is_active && (
                      <>
                        {revokeId === key.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRevoke(key.id)}
                              disabled={revoking}
                              className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              {revoking ? t('dashboardPages.apiKeys.revoking') : t('dashboardPages.apiKeys.confirm')}
                            </button>
                            <button
                              onClick={() => setRevokeId(null)}
                              className="px-3 py-1.5 text-gray-500 text-xs font-medium hover:text-gray-700"
                            >
                              {t('dashboardPages.apiKeys.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRevokeId(key.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title={t('dashboardPages.apiKeys.revokeKey')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    {t('dashboardPages.apiKeys.scopesLabel')}{' '}
                    {key.scopes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 mr-1"
                      >
                        {s}
                      </span>
                    ))}
                  </span>
                  <span>{t('dashboardPages.apiKeys.created')} {new Date(key.created_at).toLocaleDateString(dateLocale)}</span>
                  {key.expires_at && (
                    <span>{t('dashboardPages.apiKeys.expires')} {new Date(key.expires_at).toLocaleDateString(dateLocale)}</span>
                  )}
                  {key.last_used_at && (
                    <span>
                      {t('dashboardPages.apiKeys.lastUsed')} {new Date(key.last_used_at).toLocaleDateString(dateLocale)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
