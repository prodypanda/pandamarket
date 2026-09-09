'use client';

import { useAdminTheme } from '@/contexts/AdminThemeContext';
import { AdminReGoAiCosts } from '@/components/admin/rego/AdminReGoAiCosts';
import AiCostsDashboard from './AiCostsDashboard';

export default function AiCostsPage() {
  const { adminTheme } = useAdminTheme();

  if (adminTheme === 'rego') {
    return <AdminReGoAiCosts />;
  }

  return <AiCostsDashboard />;
}
