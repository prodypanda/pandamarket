import React from 'react';

export interface ProductItem {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  inventory_quantity: number;
  status: 'active' | 'draft' | 'archived';
  thumbnail?: string | null;
}

interface Props {
  products: ProductItem[];
  onEdit: (product: ProductItem) => void;
  onDelete: (id: string) => void;
}

export function ProductsTable({ products, onEdit, onDelete }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <p className="text-sm text-slate-500">Aucun produit trouvé dans votre catalogue.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="py-3 px-4">Produit</th>
            <th className="py-3 px-4">SKU</th>
            <th className="py-3 px-4">Prix</th>
            <th className="py-3 px-4">Stock</th>
            <th className="py-3 px-4">Statut</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {products.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
              <td className="py-3 px-4 flex items-center space-x-3">
                <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-400">
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    '📦'
                  )}
                </div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{p.title}</span>
              </td>
              <td className="py-3 px-4 font-mono text-slate-500">{p.sku || '—'}</td>
              <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                {p.price.toFixed(3)} TND
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    p.inventory_quantity > 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                  }`}
                >
                  {p.inventory_quantity} en stock
                </span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    p.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : p.status === 'draft'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {p.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right space-x-2">
                <button
                  type="button"
                  onClick={() => onEdit(p)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-medium"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(p.id)}
                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded font-medium"
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
