import React from 'react';

export interface ProductGeneralData {
  title: string;
  slug: string;
  description: string;
  category_id: string;
  status: 'active' | 'draft' | 'archived';
}

interface Props {
  data: ProductGeneralData;
  onChange: (field: keyof ProductGeneralData, value: string) => void;
}

export function ProductGeneralTab({ data, onChange }: Props) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Titre du produit *
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Ex: Vase en poterie de Nabeul"
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Slug / URL personnalisée
        </label>
        <input
          type="text"
          value={data.slug}
          onChange={(e) => onChange('slug', e.target.value)}
          placeholder="vase-poterie-nabeul"
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Description détaillée
        </label>
        <textarea
          rows={4}
          value={data.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Décrivez les caractéristiques, matériaux et dimensions du produit..."
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Statut de publication
        </label>
        <select
          value={data.status}
          onChange={(e) => onChange('status', e.target.value as any)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="active">Actif (En ligne)</option>
          <option value="draft">Brouillon (Non visible)</option>
          <option value="archived">Archivé</option>
        </select>
      </div>
    </div>
  );
}
