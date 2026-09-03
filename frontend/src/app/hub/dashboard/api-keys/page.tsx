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
  const { t, locale, dir } = useLocale();
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
      <div dir={dir} className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.apiKeys.title')}</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.apiKeys.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboardPages.apiKeys.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setNewlyCreatedKey(null);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl shadow-2xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('dashboardPages.apiKeys.createKey')}
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 p-4 rounded-xl">{error}</div>
      )}

      {/* Newly Created Key Banner */}
      {newlyCreatedKey && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-1">
                {t('dashboardPages.apiKeys.saveKeyWarning')}
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">
                {t('dashboardPages.apiKeys.saveKeyWarningDesc')}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-lg text-sm font-mono text-slate-900 dark:text-white break-all">
                  {newlyCreatedKey}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="p-2.5 bg-white dark:bg-slate-850 border border-amber-300 dark:border-amber-700/60 rounded-lg hover:bg-amber-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 text-sm font-medium"
            >
              {t('dashboardPages.apiKeys.dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">{t('dashboardPages.apiKeys.createNewApiKey')}</h2>
          {createError && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-sm rounded-lg">{createError}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('dashboardPages.apiKeys.label')}</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={t('dashboardPages.apiKeys.labelPlaceholder')}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('dashboardPages.apiKeys.scopes')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_SCOPES.map((scope) => {
                  const info = scopeInfo[scope];
                  const isSelected = newScopes.includes(scope);
                  return (
                    <label
                      key={scope}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800/80'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleScope(scope)}
                        className="mt-0.5 text-slate-900 focus:ring-slate-900 dark:text-white dark:focus:ring-white rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{info.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{info.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('dashboardPages.apiKeys.expirationOptional')}
              </label>
              <input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl shadow-2xs transition-colors disabled:opacity-50"
              >
                {creating ? t('dashboardPages.apiKeys.creating') : t('dashboardPages.apiKeys.createApiKey')}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {t('dashboardPages.apiKeys.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t('dashboardPages.apiKeys.yourApiKeys')}</h2>
        </div>
        {keys.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Key className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">{t('dashboardPages.apiKeys.emptyState')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {keys.map((key) => (
              <div key={key.id} className="px-6 py-4 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        key.is_active ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      <Key
                        className={`w-4 h-4 ${
                          key.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{key.label}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{key.key_prefix}••••••••</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      {key.is_active ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                          {t('dashboardPages.apiKeys.active')}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
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
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                            >
                              {revoking ? t('dashboardPages.apiKeys.revoking') : t('dashboardPages.apiKeys.confirm')}
                            </button>
                            <button
                              onClick={() => setRevokeId(null)}
                              className="px-3 py-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              {t('dashboardPages.apiKeys.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRevokeId(key.id)}
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title={t('dashboardPages.apiKeys.revokeKey')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {t('dashboardPages.apiKeys.scopesLabel')}{' '}
                    {key.scopes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 mr-1"
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
