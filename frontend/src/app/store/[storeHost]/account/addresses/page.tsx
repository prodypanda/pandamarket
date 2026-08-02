'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, Plus, Trash2, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';

interface Address {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export default function StorefrontAccountAddressesPage() {
  const params = useParams();
  const storeHost = decodeURIComponent(params.storeHost as string);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    label: 'Maison',
    first_name: '',
    last_name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    postal_code: '',
    country: 'TN',
    is_default: false,
  });

  async function loadAddresses() {
    try {
      const res = await fetchWithCsrf('/api/pd/storefront/account/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || data.data || []);
      }
    } catch {
      setError('Erreur lors du chargement des adresses.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
  }, [storeHost]);

  function openAddModal() {
    setEditingId(null);
    setForm({
      label: 'Maison',
      first_name: '',
      last_name: '',
      phone: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      postal_code: '',
      country: 'TN',
      is_default: addresses.length === 0,
    });
    setShowModal(true);
  }

  function openEditModal(addr: Address) {
    setEditingId(addr.id);
    setForm({
      label: addr.label,
      first_name: addr.first_name,
      last_name: addr.last_name,
      phone: addr.phone,
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2 || '',
      city: addr.city,
      postal_code: addr.postal_code,
      country: addr.country || 'TN',
      is_default: addr.is_default,
    });
    setShowModal(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const endpoint = editingId
        ? `/api/pd/storefront/account/addresses/${editingId}`
        : '/api/pd/storefront/account/addresses';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetchWithCsrf(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Erreur lors de l’enregistrement de l’adresse.');
        setSubmitting(false);
        return;
      }

      setMessage(editingId ? 'Adresse mise à jour.' : 'Adresse ajoutée.');
      setShowModal(false);
      await loadAddresses();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Voulez-vous vraiment supprimer cette adresse ?')) return;
    try {
      const res = await fetchWithCsrf(`/api/pd/storefront/account/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('Adresse supprimée.');
        await loadAddresses();
      }
    } catch {
      setError('Erreur lors de la suppression de l’adresse.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <h1 className="text-xl font-bold text-gray-900">Mes Adresses de livraison</h1>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#16C784] text-white text-xs font-bold rounded-xl hover:bg-[#14b576] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter une adresse
          </button>
        </div>

        {message && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500" />
            {error}
          </div>
        )}

        {addresses.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Aucune adresse enregistrée pour le moment.</p>
            <button
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#16C784] text-white text-xs font-bold rounded-xl hover:bg-[#14b576] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter une première adresse
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`relative rounded-2xl border p-5 transition-all ${
                  addr.is_default ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-100 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                    {addr.label || 'Adresse'}
                  </span>
                  {addr.is_default && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Par défaut
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-gray-900">{addr.first_name} {addr.last_name}</p>
                <p className="text-xs text-gray-600 mt-1">{addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}</p>
                <p className="text-xs text-gray-600">{addr.city}, {addr.postal_code}</p>
                <p className="text-xs text-gray-500 mt-1">Tél : {addr.phone}</p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(addr)}
                    className="p-1.5 text-gray-500 hover:text-emerald-600 transition-colors"
                    title="Modifier"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Address Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-3">
              {editingId ? 'Modifier l’adresse' : 'Ajouter une adresse'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Libellé (Maison, Bureau, etc.)</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Nom</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Téléphone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Adresse</label>
                <input
                  type="text"
                  value={form.address_line_1}
                  onChange={(e) => setForm((prev) => ({ ...prev, address_line_1: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Ville</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Code Postal</label>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, postal_code: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk_default"
                  checked={form.is_default}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="chk_default" className="text-xs font-medium text-gray-700">Définir comme adresse par défaut</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#16C784] text-white text-xs font-bold rounded-xl hover:bg-[#14b576] transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
