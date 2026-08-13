const fs = require('fs');
const path = require('path');

const pageContent = fs.readFileSync('frontend/src/app/(admin)/settings/page.tsx', 'utf8');

function extractSection(content, tabName) {
  const sections = [];
  const lines = content.split('\n');
  let inSection = false;
  let currentSection = [];
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(`activeTab === '${tabName}' ?`) && line.includes('<section')) {
      inSection = true;
      braceCount = 0;
    }

    if (inSection) {
      currentSection.push(line);
      const opens = (line.match(/<section/g) || []).length;
      const closes = (line.match(/<\/section>/g) || []).length;
      braceCount += opens;
      braceCount -= closes;
      
      if (braceCount === 0 && currentSection.length > 0) {
        inSection = false;
        
        // Clean up className to remove the ternary
        const rootStr = currentSection[0];
        if (rootStr.includes("activeTab ===")) {
           currentSection[0] = '<section className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-200/40 mb-8">';
        }
        sections.push(currentSection.join('\n'));
        currentSection = [];
      }
    }
  }
  return sections;
}

const sections = extractSection(pageContent, 'operations');
if (sections.length === 0) {
  console.log("No sections found for operations");
  process.exit(1);
}

const content = `
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { fetchWithCsrf } from '@/lib/api';
import { PlatformSettings, DEFAULT_SETTINGS } from '@/types/settings';
import { renderTextInput, renderNumberInput, renderToggle } from '@/components/admin/settings/SettingsFormHelpers';
import { Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Store, Wallet, ShieldCheck, Globe2, SlidersHorizontal, CreditCard, Crown, Truck, Mail, Shield, BarChart3, MessageSquare, Bell, Construction, UploadCloud } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { MarketplaceAssetPicker } from "@/components/admin/MarketplaceAssetPicker";
import { HomepageBlocksEditor } from "@/components/admin/HomepageBlocksEditor";
import { HeroCarouselEditor } from "@/components/admin/HeroCarouselEditor";
import { getResizedImageUrl } from '@/lib/image-url';

const schema = z.any();

export default function OperationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [marketplaceLogoPickerTarget, setMarketplaceLogoPickerTarget] = useState<string | null>(null);

  const form = useForm<PlatformSettings>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_SETTINGS,
  });

  useEffect(() => {
    fetch('/api/pd/marketplace/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          form.reset({ ...DEFAULT_SETTINGS, ...data.settings });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [form]);

  const onSubmit = async (data: PlatformSettings) => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetchWithCsrf('/api/pd/marketplace/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('success');
      fetch('/api/marketplace/revalidate').catch(console.error);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const formProps = { register: form.register, errors: form.formState.errors, watch: form.watch, setValue: form.setValue };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex items-center justify-between bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm sticky top-4 z-10">
        <h2 className="text-lg font-bold text-slate-800 ml-4">Operations Settings</h2>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-lg disabled:opacity-50"
        >
          {saving ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      ${sections.join('\\n\\n').split('renderTextInput(').join('renderTextInput(formProps, ').split('renderNumberInput(').join('renderNumberInput(formProps, ').split('renderToggle(').join('renderToggle(formProps, ').replace(/updateSetting\\((['"]\\w+['"]), (.*?)\\)/g, 'form.setValue($1, $2, {shouldDirty: true})').replace(/settings\\.([a-zA-Z0-9_]+)/g, 'form.watch("$1")')}
      
      {marketplaceLogoPickerTarget && (
        <MarketplaceAssetPicker
          onSelect={(url) => {
            form.setValue(marketplaceLogoPickerTarget as any, url, { shouldDirty: true });
            setMarketplaceLogoPickerTarget(null);
          }}
          onClose={() => setMarketplaceLogoPickerTarget(null)}
        />
      )}
    </form>
  );
}
`;

fs.writeFileSync('frontend/src/app/(admin)/settings/operations/page.tsx', content);
console.log('Rebuilt operations');
