import React from 'react';

export interface ProductInventoryData {
  sku: string;
  price: number;
  compare_at_price?: number;
  inventory_quantity: number;
}

interface Props {
  data: ProductInventoryData;
  onChange: (field: keyof ProductInventoryData, value: any) => void;
}

export function ProductInventoryTab({ data, onChange }: Props) {
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Prix de vente (TND) *
          </label>
          <input
            type="number"
            step="0.001"
            value={data.price}
            onChange={(e) => onChange('price', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Prix barré (Optionnel)
          </label>
          <input
            type="number"
            step="0.001"
            value={data.compare_at_price || ''}
            onChange={(e) => onChange('compare_at_price', parseFloat(e.target.value) || undefined)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            SKU (Référence unique)
          </label>
          <input
            type="text"
            value={data.sku}
            onChange={(e) => onChange('sku', e.target.value)}
            placeholder="ART-POT-001"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Quantité en stock *
          </label>
          <input
            type="number"
            value={data.inventory_quantity}
            onChange={(e) => onChange('inventory_quantity', parseInt(e.target.value, 10) || 0)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>
    </div>
  );
}
