import React from 'react';

export interface ProductMediaData {
  images: string[];
}

interface Props {
  data: ProductMediaData;
  onAddImage: (url: string) => void;
  onRemoveImage: (index: number) => void;
}

export function ProductMediaTab({ data, onAddImage, onRemoveImage }: Props) {
  const [inputUrl, setInputUrl] = React.useState('');

  const handleAdd = () => {
    if (inputUrl.trim()) {
      onAddImage(inputUrl.trim());
      setInputUrl('');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Ajouter une photo par URL
        </label>
        <div className="flex space-x-2">
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="https://cdn.pandamarket.tn/..."
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
          >
            Ajouter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {data.images.map((img, idx) => (
          <div key={idx} className="relative group border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden h-28 bg-slate-50 dark:bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={`Product photo ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveImage(idx)}
              className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
