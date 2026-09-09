'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { useDashboardStyle } from '@/contexts/DashboardStyleContext';
import { SellerReGoBanners, type HomepageSection } from '@/components/dashboard/rego/SellerReGoBanners';
import { RefreshCw } from 'lucide-react';

export default function OnlineStoreBannersPage() {
  const { t, dir } = useLocale();
  const { dashboardStyle } = useDashboardStyle();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const customSections = data.store?.settings?.homepageSections;
        if (Array.isArray(customSections) && customSections.length > 0) {
          setSections(customSections);
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (updatedSections: HomepageSection[]) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settings: { homepageSections: updatedSections },
        }),
      });
      if (res.ok) {
        setSections(updatedSections);
        setFeedback({ message: 'Agencement des sections enregistré et publié avec succès !' });
      } else {
        setFeedback({ message: "Erreur lors de l'enregistrement des sections.", isError: true });
      }
    } catch (err) {
      setFeedback({ message: err instanceof Error ? err.message : 'Erreur réseau', isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  if (loading) {
    return (
      <div dir={dir} className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  return (
    <SellerReGoBanners
      initialSections={sections}
      onSave={handleSave}
      saving={saving}
      feedback={feedback}
      dir={dir}
    />
  );
}
