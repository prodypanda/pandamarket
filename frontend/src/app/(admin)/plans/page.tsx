'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, Loader2, AlertTriangle } from 'lucide-react';

interface PlanLimits {
  id: string;
  plan_id: string;
  max_products: number;
  max_images_per_product: number;
  has_ai_seo: boolean;
  has_image_compression: boolean;
  has_custom_domain: boolean;
  has_page_builder: boolean;
  has_direct_payment: boolean;
  has_white_label: boolean;
  commission_rate: string;
  ai_tokens_included: number;
  yearly_price: string;
}

const planOrder = ['free', 'starter', 'regular', 'agency', 'pro', 'golden', 'platinum'];

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanLimits[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchPlans() {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const res = await fetch(`${backendUrl}/api/pd/subscriptions/plans`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          const sorted = (data.data || []).sort(
            (a: PlanLimits, b: PlanLimits) =>
              planOrder.indexOf(a.plan_id) - planOrder.indexOf(b.plan_id),
          );
          setPlans(sorted);
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const updatePlan = (planId: string, field: string, value: unknown) => {
    setPlans((prev) =>
      prev.map((p) => (p.plan_id === planId ? { ...p, [field]: value } : p)),
    );
  };

  const savePlan = async (plan: PlanLimits) => {
    setSaving(plan.plan_id);
    setMessage('');
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const res = await fetch(`${backendUrl}/api/pd/admin/plans/${plan.plan_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(plan),
      });
      if (res.ok) {
        setMessage(`Plan "${plan.plan_id}" mis à jour avec succès.`);
      } else {
        setMessage(`Erreur lors de la mise à jour du plan "${plan.plan_id}".`);
      }
    } catch {
      setMessage('Erreur réseau.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#16C784] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#16C784]" />
          Gestion des Plans
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Configurez les limites et fonctionnalités de chaque plan d&apos;abonnement.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('succès') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-700">
          Attention : modifier les limites d&apos;un plan affecte tous les vendeurs abonnés à ce plan.
        </p>
      </div>

      {/* Plans Table */}
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-xl border border-gray-100 shadow-sm">
          <thead>
            <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <th className="px-4 py-3 text-left font-semibold">Plan</th>
              <th className="px-4 py-3 text-center font-semibold">Prix (TND/an)</th>
              <th className="px-4 py-3 text-center font-semibold">Commission</th>
              <th className="px-4 py-3 text-center font-semibold">Max Produits</th>
              <th className="px-4 py-3 text-center font-semibold">Max Images</th>
              <th className="px-4 py-3 text-center font-semibold">Tokens IA</th>
              <th className="px-4 py-3 text-center font-semibold">IA SEO</th>
              <th className="px-4 py-3 text-center font-semibold">Domaine</th>
              <th className="px-4 py-3 text-center font-semibold">Builder</th>
              <th className="px-4 py-3 text-center font-semibold">Direct Pay</th>
              <th className="px-4 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.map((plan) => (
              <tr key={plan.plan_id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <span className="font-bold text-gray-900 capitalize">{plan.plan_id}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    value={plan.yearly_price || '0'}
                    onChange={(e) => updatePlan(plan.plan_id, 'yearly_price', e.target.value)}
                    className="w-20 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-1 focus:ring-[#16C784] outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.commission_rate || '0'}
                    onChange={(e) => updatePlan(plan.plan_id, 'commission_rate', e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-1 focus:ring-[#16C784] outline-none"
                  />
                  <span className="text-xs text-gray-400 ml-1">%</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    value={plan.max_products}
                    onChange={(e) => updatePlan(plan.plan_id, 'max_products', parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-1 focus:ring-[#16C784] outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    value={plan.max_images_per_product}
                    onChange={(e) => updatePlan(plan.plan_id, 'max_images_per_product', parseInt(e.target.value) || 0)}
                    className="w-14 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-1 focus:ring-[#16C784] outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    value={plan.ai_tokens_included}
                    onChange={(e) => updatePlan(plan.plan_id, 'ai_tokens_included', parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border border-gray-200 rounded text-center text-sm focus:ring-1 focus:ring-[#16C784] outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={plan.has_ai_seo}
                    onChange={(e) => updatePlan(plan.plan_id, 'has_ai_seo', e.target.checked)}
                    className="w-4 h-4 text-[#16C784] rounded focus:ring-[#16C784]"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={plan.has_custom_domain}
                    onChange={(e) => updatePlan(plan.plan_id, 'has_custom_domain', e.target.checked)}
                    className="w-4 h-4 text-[#16C784] rounded focus:ring-[#16C784]"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={plan.has_page_builder}
                    onChange={(e) => updatePlan(plan.plan_id, 'has_page_builder', e.target.checked)}
                    className="w-4 h-4 text-[#16C784] rounded focus:ring-[#16C784]"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={plan.has_direct_payment}
                    onChange={(e) => updatePlan(plan.plan_id, 'has_direct_payment', e.target.checked)}
                    className="w-4 h-4 text-[#16C784] rounded focus:ring-[#16C784]"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => savePlan(plan)}
                    disabled={saving === plan.plan_id}
                    className="inline-flex items-center px-3 py-1.5 bg-[#16C784] text-white rounded-lg hover:bg-[#14b576] transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    {saving === plan.plan_id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
