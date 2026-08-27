import React, { useState } from 'react';
import { ProductGeneralTab, ProductGeneralData } from './tabs/ProductGeneralTab';
import { ProductMediaTab, ProductMediaData } from './tabs/ProductMediaTab';
import { ProductInventoryTab, ProductInventoryData } from './tabs/ProductInventoryTab';
import { ProductItem } from './ProductsTable';

interface Props {
  isOpen: boolean;
  product: ProductItem | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export function ProductDrawer({ isOpen, product, onClose, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<'general' | 'media' | 'inventory'>('general');
  const [generalData, setGeneralData] = useState<ProductGeneralData>({
    title: product?.title || '',
    slug: '',
    description: '',
    category_id: '',
    status: product?.status || 'active',
  });
  const [mediaData, setMediaData] = useState<ProductMediaData>({
    images: product?.thumbnail ? [product.thumbnail] : [],
  });
  const [inventoryData, setInventoryData] = useState<ProductInventoryData>({
    sku: product?.sku || '',
    price: product?.price || 0,
    inventory_quantity: product?.inventory_quantity || 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        id: product?.id,
        ...generalData,
        ...mediaData,
        ...inventoryData,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
            {product ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'general'
                ? 'border-emerald-600 text-emerald-600 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Général
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'media'
                ? 'border-emerald-600 text-emerald-600 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Photos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'inventory'
                ? 'border-emerald-600 text-emerald-600 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Prix & Stock
          </button>
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'general' && (
            <ProductGeneralTab
              data={generalData}
              onChange={(f, v) => setGeneralData((p) => ({ ...p, [f]: v }))}
            />
          )}
          {activeTab === 'media' && (
            <ProductMediaTab
              data={mediaData}
              onAddImage={(url) => setMediaData((p) => ({ ...p, images: [...p.images, url] }))}
              onRemoveImage={(idx) =>
                setMediaData((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))
              }
            />
          )}
          {activeTab === 'inventory' && (
            <ProductInventoryTab
              data={inventoryData}
              onChange={(f, v) => setInventoryData((p) => ({ ...p, [f]: v }))}
            />
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
