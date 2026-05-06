'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
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
  { value: 'read:products', label: 'Read Products', desc: 'List and view products' },
  { value: 'write:products', label: 'Write Products', desc: 'Update product stock and details' },
  { value: 'read:orders', label: 'Read Orders', desc: 'List and view orders' },
  { value: 'write:orders', label: 'Write Orders', desc: 'Update order status' },
  { value: 'read:customers', label: 'Read Customers', desc: 'View customer information' },
  { value: 'full_access', label: 'Full Access', desc: 'All permissions' },
];

export default function ApiKeysPage() {
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
        setError('Failed to load API keys');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    setCreateError('');
    if (!newLabel.trim()) {
      setCreateError('Label is required');
      return;
    }
    if (newScopes.length === 0) {
      setCreateError('Select at least one scope');
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
        setCreateError(data.error?.message || 'Failed to create API key');
      }
    } catch {
      setCreateError('Network error');
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
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-500 mt-1">
            Manage API keys for external ERP/POS integration.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setNewlyCreatedKey(null);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Key
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
                Save your API key now!
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                This is the only time you will see the full key. Store it securely.
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
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Create New API Key</h2>
          {createError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{createError}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., My ERP Integration"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <label
                    key={scope.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      newScopes.includes(scope.value)
                        ? 'border-[#16C784] bg-[#16C784]/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={newScopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-0.5 text-[#16C784] focus:ring-[#16C784]"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{scope.label}</p>
                      <p className="text-xs text-gray-500">{scope.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration (optional)
              </label>
              <input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-6 py-2.5 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b876] transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create API Key'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-6 py-2.5 text-gray-600 font-medium hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Your API Keys</h2>
        </div>
        {keys.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No API keys yet. Create one to get started.</p>
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
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                          Revoked
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
                              {revoking ? 'Revoking...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setRevokeId(null)}
                              className="px-3 py-1.5 text-gray-500 text-xs font-medium hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRevokeId(key.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Revoke key"
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
                    Scopes:{' '}
                    {key.scopes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 mr-1"
                      >
                        {s}
                      </span>
                    ))}
                  </span>
                  <span>Created: {new Date(key.created_at).toLocaleDateString('fr-TN')}</span>
                  {key.expires_at && (
                    <span>Expires: {new Date(key.expires_at).toLocaleDateString('fr-TN')}</span>
                  )}
                  {key.last_used_at && (
                    <span>
                      Last used: {new Date(key.last_used_at).toLocaleDateString('fr-TN')}
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
