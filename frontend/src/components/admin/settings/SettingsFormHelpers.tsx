import React from 'react';
import { UseFormRegister, FieldErrors, Path } from 'react-hook-form';
import { ToggleLeft, ToggleRight } from 'lucide-react';

interface SettingsFormProps<T extends Record<string, any>> {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  setValue?: (name: Path<T>, value: any, options?: { shouldValidate?: boolean; shouldDirty?: boolean; shouldTouch?: boolean }) => void;
  watch?: (name: Path<T>) => any;
}

export function renderTextInput<T extends Record<string, any>>(
  { register, errors }: SettingsFormProps<T>,
  key: Path<T>,
  label: string,
  placeholder = '',
  type = 'text',
  readOnly = false
) {
  const error = errors[key];
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        readOnly={readOnly}
        {...register(key, { valueAsNumber: type === 'number' })}
        className={`w-full rounded-xl border ${
          error ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-stone-50'
        } px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15 ${
          readOnly ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      />
      {error && <p className="text-xs text-red-500 ml-1">{error.message?.toString()}</p>}
    </div>
  );
}

export function renderNumberInput<T extends Record<string, any>>(
  { register, errors }: SettingsFormProps<T>,
  key: Path<T>,
  label: string,
  unit = '',
  min?: number,
  max?: number,
  step?: number
) {
  const error = errors[key];
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          {...register(key, { valueAsNumber: true })}
          className={`w-full rounded-xl border ${
            error ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-stone-50'
          } px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-[#B91C1C] focus:bg-white focus:ring-2 focus:ring-[#B91C1C]/15`}
        />
        {unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
            {unit}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500 ml-1">{error.message?.toString()}</p>}
    </div>
  );
}

export function renderToggle<T extends Record<string, any>>(
  { watch, setValue }: SettingsFormProps<T>,
  options: { key: Path<T>; label: string; description?: string }
) {
  const { key, label, description } = options;
  if (!watch || !setValue) return null;
  const value = watch(key);

  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200/60 bg-stone-50/50 p-4 transition-colors hover:bg-stone-50">
      <button
        type="button"
        onClick={() => setValue(key, !value as any, { shouldDirty: true })}
        className="mt-0.5 flex-shrink-0"
      >
        {value ? (
          <ToggleRight className="h-8 w-8 text-[#B91C1C] transition-colors" />
        ) : (
          <ToggleLeft className="h-8 w-8 text-slate-300 transition-colors hover:text-slate-400" />
        )}
      </button>
      <div>
        <div className="text-sm font-bold text-slate-700">{label}</div>
        {description && <div className="mt-1 text-[11px] leading-relaxed text-slate-500">{description}</div>}
      </div>
    </div>
  );
}
