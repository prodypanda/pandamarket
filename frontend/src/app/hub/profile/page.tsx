'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Save, Loader2, Shield } from 'lucide-react';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  email_verified: boolean;
  created_at: string;
}

interface Address {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  const [newAddress, setNewAddress] = useState({
    label: '',
    first_name: '',
    last_name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'TN',
    phone: '',
  });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const { settings, classes } = useMarketplaceTheme();
  const inputClass = `w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 ${classes.focus} outline-none`;
  const compactInputClass = `px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 ${classes.focus} outline-none text-sm`;
  const cardClass = `${classes.panel} p-6`;

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/pd/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.data);
          setForm({
            first_name: data.data.first_name || '',
            last_name: data.data.last_name || '',
            phone: data.data.phone || '',
          });
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetchWithCsrf('/api/pd/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage('Profil mis à jour avec succès !');
      } else {
        setMessage('Erreur lors de la mise à jour.');
      }
    } catch {
      setMessage('Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${classes.pageSoft}`}>
        <HubNavbar
          marketplaceName={settings.marketplace_name}
          marketplaceLogoUrl={settings.marketplace_logo_url}
          marketplaceTheme={settings.marketplace_theme}
        />
        <div className="flex items-center justify-center py-16">
          <Loader2 className={`w-6 h-6 ${classes.primaryText} animate-spin`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar
        marketplaceName={settings.marketplace_name}
        marketplaceLogoUrl={settings.marketplace_logo_url}
        marketplaceTheme={settings.marketplace_theme}
      />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className={`mb-8 rounded-[2rem] p-6 text-white sm:p-8 ${classes.header}`}>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <User className="w-6 h-6" />
            Mon Profil
          </h1>
          <p className="text-white/75 text-sm mt-1">Gérez vos informations personnelles et adresses.</p>
        </div>

      {/* Profile Form */}
      <div className={`${cardClass} mb-6`}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className={inputClass}
                placeholder="Votre prénom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className={inputClass}
                placeholder="Votre nom"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              Email
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
              {profile?.email_verified ? (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${classes.primarySoft}`}>
                  <Shield className="w-3 h-3 mr-1" /> Vérifié
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">
                  Non vérifié
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              Téléphone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
              placeholder="+216 XX XXX XXX"
            />
          </div>

          {message && (
            <p className={`text-sm ${message.includes('succès') ? classes.primaryText : 'text-red-600'}`}>
              {message}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center px-4 py-2 rounded-full transition-colors text-sm font-black disabled:opacity-50 ${classes.primary}`}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer
          </button>
        </div>
      </div>

      {/* Addresses Section */}
      <div className={cardClass}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className={`w-5 h-5 ${classes.primaryText}`} />
            Mes Adresses
          </h2>
          <button
            onClick={() => setShowAddressForm(!showAddressForm)}
            className={`text-sm font-bold transition-colors ${classes.primaryText} ${classes.primaryTextHover}`}
          >
            {showAddressForm ? 'Annuler' : '+ Ajouter une adresse'}
          </button>
        </div>

        {showAddressForm && (
          <div className={`rounded-2xl p-4 mb-4 ${classes.subtlePanel}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Label (ex: Maison, Bureau)"
                value={newAddress.label}
                onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                className={compactInputClass}
              />
              <input
                type="text"
                placeholder="Téléphone"
                value={newAddress.phone}
                onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                className={compactInputClass}
              />
              <input
                type="text"
                placeholder="Adresse ligne 1"
                value={newAddress.address_line_1}
                onChange={(e) => setNewAddress({ ...newAddress, address_line_1: e.target.value })}
                className={`sm:col-span-2 ${compactInputClass}`}
              />
              <input
                type="text"
                placeholder="Ville"
                value={newAddress.city}
                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                className={compactInputClass}
              />
              <input
                type="text"
                placeholder="Code postal"
                value={newAddress.postal_code}
                onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                className={compactInputClass}
              />
            </div>
            <button className={`mt-3 px-4 py-2 rounded-full transition-colors text-sm font-black ${classes.primary}`}>
              Ajouter l&apos;adresse
            </button>
          </div>
        )}

        {addresses.length === 0 && !showAddressForm && (
          <p className="text-gray-400 text-sm text-center py-8">
            Aucune adresse enregistrée. Ajoutez-en une pour faciliter vos achats.
          </p>
        )}

        {addresses.map((addr) => (
          <div key={addr.id} className="border border-gray-200 rounded-lg p-4 mb-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm font-medium text-gray-900">{addr.label}</span>
                {addr.is_default && (
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${classes.primarySoft}`}>
                    Par défaut
                  </span>
                )}
                <p className="text-sm text-gray-600 mt-1">{addr.address_line_1}</p>
                <p className="text-sm text-gray-600">{addr.city}, {addr.postal_code}</p>
                <p className="text-sm text-gray-500">{addr.phone}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Account Info */}
      <div className="mt-6 text-center text-sm text-gray-400">
        Membre depuis {profile ? new Date(profile.created_at).toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' }) : '—'}
      </div>
      </main>
      <HubFooter {...settings} />
    </div>
  );
}
