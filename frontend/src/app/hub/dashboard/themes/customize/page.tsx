'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  announcementText: string;
  showAnnouncement: boolean;
  stickyHeader: boolean;
}

const DEFAULT_CONFIG: ThemeConfig = {
  primaryColor: '#059669',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  fontFamily: 'Inter',
  announcementText: 'Livraison gratuite sur toute la Tunisie à partir de 80 DT !',
  showAnnouncement: true,
  stickyHeader: true,
};

export default function ThemeCustomizerPage() {
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'header'>('colors');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleColorChange = (key: keyof ThemeConfig, val: string) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate saving to API or local persistence
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-96 border-r border-slate-800 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/hub/dashboard/online-store/themes"
              className="text-xs text-slate-400 hover:text-white"
            >
              &larr; Quitter
            </Link>
            <h1 className="text-base font-bold text-white">Personnaliseur de Thème</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition disabled:opacity-50"
          >
            {isSaving ? 'Enregistrement...' : savedSuccess ? '✓ Enregistré' : 'Publier'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('colors')}
            className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${
              activeTab === 'colors'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🎨 Couleurs
          </button>
          <button
            onClick={() => setActiveTab('typography')}
            className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${
              activeTab === 'typography'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🔤 Typographie
          </button>
          <button
            onClick={() => setActiveTab('header')}
            className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${
              activeTab === 'header'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🏷️ En-tête & Bannière
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeTab === 'colors' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Couleur Principale (Primary)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="h-9 w-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Couleur d&apos;Accent (Boutons d&apos;achat & Badges)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="h-9 w-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.accentColor}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Arrière-plan (Background)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                    className="h-9 w-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.backgroundColor}
                    onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Police Principale
                </label>
                <select
                  value={config.fontFamily}
                  onChange={(e) => handleColorChange('fontFamily', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="Inter">Inter (Moderne & Épuré)</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans (Tech & Minimal)</option>
                  <option value="Playfair Display">Playfair Display (Luxe & Éditorial)</option>
                  <option value="Outfit">Outfit (Dynamique & Jeune)</option>
                  <option value="Tajawal">Tajawal (Arabe & Artisanal)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'header' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Bannière d&apos;annonce</span>
                <input
                  type="checkbox"
                  checked={config.showAnnouncement}
                  onChange={(e) => setConfig((p) => ({ ...p, showAnnouncement: e.target.checked }))}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                />
              </div>

              {config.showAnnouncement && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Texte de l&apos;annonce
                  </label>
                  <input
                    type="text"
                    value={config.announcementText}
                    onChange={(e) => handleColorChange('announcementText', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-medium text-slate-300">En-tête Fixe (Sticky Header)</span>
                <input
                  type="checkbox"
                  checked={config.stickyHeader}
                  onChange={(e) => setConfig((p) => ({ ...p, stickyHeader: e.target.checked }))}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Preview Pane */}
      <div className="flex-1 flex flex-col bg-slate-900/50 p-6 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900 transition-all">
          {/* Announcement Bar */}
          {config.showAnnouncement && (
            <div
              style={{ backgroundColor: config.primaryColor }}
              className="py-2 px-4 text-center text-xs font-semibold text-white transition-colors"
            >
              {config.announcementText}
            </div>
          )}

          {/* Header */}
          <div
            style={{ backgroundColor: config.backgroundColor }}
            className="p-4 border-b border-slate-100 flex items-center justify-between"
          >
            <div className="font-bold text-lg" style={{ color: config.textColor }}>
              Boutique Démo
            </div>
            <div className="flex items-center space-x-4 text-xs font-medium" style={{ color: config.textColor }}>
              <span>Accueil</span>
              <span>Catalogue</span>
              <span>Contact</span>
              <button
                style={{ backgroundColor: config.primaryColor }}
                className="px-3 py-1 text-white rounded-md text-xs font-semibold"
              >
                Panier (0)
              </button>
            </div>
          </div>

          {/* Hero Banner */}
          <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
            <h2 className="text-2xl font-black mb-2" style={{ color: config.textColor }}>
              Nouvelle Collection Artisanale
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Créations 100% fait main fabriquées par des maîtres artisans tunisiens.
            </p>
            <button
              style={{ backgroundColor: config.accentColor }}
              className="px-4 py-2 text-white rounded-lg text-xs font-bold shadow-md hover:opacity-90 transition"
            >
              Découvrir les Nouveautés
            </button>
          </div>

          {/* Product Cards Grid Preview */}
          <div className="p-6 grid grid-cols-2 gap-4">
            <div className="border border-slate-100 rounded-lg p-3 bg-white shadow-sm">
              <div className="h-28 bg-slate-100 rounded-md mb-2 flex items-center justify-center text-xs text-slate-400">
                Image Produit
              </div>
              <h3 className="font-semibold text-xs text-slate-800">Vase en Céramique Émaillée</h3>
              <p className="text-xs font-bold text-emerald-600 mt-1">45.000 DT</p>
            </div>
            <div className="border border-slate-100 rounded-lg p-3 bg-white shadow-sm">
              <div className="h-28 bg-slate-100 rounded-md mb-2 flex items-center justify-center text-xs text-slate-400">
                Image Produit
              </div>
              <h3 className="font-semibold text-xs text-slate-800">Plateau en Bois d&apos;Olivier</h3>
              <p className="text-xs font-bold text-emerald-600 mt-1">65.000 DT</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
