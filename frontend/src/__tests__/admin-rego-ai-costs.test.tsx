import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/api', () => ({
  fetchWithCsrf: vi.fn(),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'fr',
    t: (k: string) => k,
    dir: 'ltr',
  }),
}));

import { AdminReGoAiCosts } from '@/components/admin/rego/AdminReGoAiCosts';
import { fetchWithCsrf } from '@/lib/api';

describe('AdminReGoAiCosts Component', () => {
  const mockProviders = [
    {
      id: 'prov-1',
      provider: 'gemini',
      label: 'Gemini 1.5 Flash',
      model: 'gemini-1.5-flash',
      base_url: null,
      api_key_set: true,
      is_enabled: true,
      is_default: true,
      priority: 100,
    },
    {
      id: 'prov-2',
      provider: 'openai',
      label: 'GPT-4o Mini',
      model: 'gpt-4o-mini',
      base_url: null,
      api_key_set: true,
      is_enabled: true,
      is_default: false,
      priority: 90,
    },
  ];

  const mockPricing = [
    { job_type: 'product_description', tokens_required: 2 },
    { job_type: 'seo_generation', tokens_required: 2 },
    { job_type: 'page_copy', tokens_required: 1 },
  ];

  const mockRouting = [
    {
      purpose: 'product_description',
      provider_config_id: 'prov-1',
      provider_label: 'Gemini 1.5 Flash',
      model: 'gemini-1.5-flash',
      fallback_provider_config_id_1: 'prov-2',
      fallback_label_1: 'GPT-4o Mini',
      fallback_model_1: 'gpt-4o-mini',
      fallback_provider_config_id_2: null,
      fallback_label_2: null,
      fallback_model_2: null,
    },
  ];

  const mockPrompts = [
    {
      prompt_key: 'product_description',
      title: "Sublimer avec l'IA — Description Produit",
      tag: 'Copywriting & HTML',
      description: 'Rédige une description structurée en HTML.',
      system_prompt: 'System prompt prompt 1',
      default_prompt: 'Default prompt 1 for {title}',
      variables: ['{title}', '{description}'],
    },
  ];

  const mockStats = {
    total_jobs: 142,
    total_tokens_consumed: 2840,
    jobs_today: 12,
    tokens_today: 240,
    compression_jobs: 20,
    seo_jobs: 40,
    page_copy_jobs: 10,
    failed_jobs: 0,
    processing_jobs: 1,
    queued_jobs: 0,
    estimated_cost_tnd: 14.2,
    credits: {
      active_wallets: 55,
      unlimited_wallets: 10,
      finite_tokens_remaining: 5000,
      tokens_used: 2840,
    },
    by_type: [
      { type: 'product_description', count: 80, tokens: 1600 },
      { type: 'seo_generation', count: 40, tokens: 800 },
    ],
    by_status: [{ status: 'completed', count: 142 }],
    recent_failures: [],
    recent_activity: [
      {
        id: 'act-1',
        store_id: 'store-1',
        store_name: 'Panda Boutique',
        user_id: 'user-1',
        type: 'product_description',
        status: 'completed',
        tokens_consumed: 2,
        error_message: null,
        duration_seconds: 0.85,
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        input_meta: { title: 'Test Product' },
        output: { suggested_title: 'Sublime Test' },
        provider_label: 'gemini-1.5-flash',
      },
    ],
    top_consumers: [
      { store_id: 'store-1', store_name: 'Panda Boutique', tokens_used: 1200, job_count: 60 },
    ],
    daily_usage: [
      { date: '2026-09-08', tokens: 500, jobs: 25 },
      { date: '2026-09-09', tokens: 240, jobs: 12 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetchWithCsrf as any).mockImplementation((url: string, opts?: any) => {
      if (url.includes('/api/pd/admin/ai-stats')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStats) });
      }
      if (url.includes('/api/pd/admin/ai-config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ providers: mockProviders, pricing: mockPricing }),
        });
      }
      if (url.includes('/api/pd/admin/ai/purpose-routing')) {
        if (opts?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ routing: mockRouting }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ routing: mockRouting }),
        });
      }
      if (url.includes('/api/pd/admin/ai/prompts')) {
        if (opts?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                template: {
                  prompt_key: 'product_description',
                  system_prompt: 'Updated system prompt',
                  default_prompt: 'Updated default prompt {title}',
                },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: mockPrompts }),
        });
      }
      if (url.includes('/api/pd/admin/ai-pricing') && opts?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ pricing: mockPricing }),
        });
      }
      if (url.includes('/api/pd/admin/ai-providers') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              provider: {
                id: 'prov-new',
                provider: 'claude',
                label: 'Claude 3.5 Sonnet',
                model: 'claude-3-5-sonnet',
                base_url: null,
                api_key_set: true,
                is_enabled: true,
                is_default: false,
                priority: 110,
              },
            }),
        });
      }
      if (url.includes('/api/pd/admin/ai-jobs')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                {
                  id: 'job-1',
                  store_id: 'store-1',
                  store_name: 'Panda Boutique',
                  user_id: 'user-1',
                  user_email: 'seller@pandamarket.tn',
                  user_name: 'Sami Seller',
                  type: 'product_description',
                  status: 'completed',
                  input_url: null,
                  input_meta: { title: 'Test Product' },
                  output: { description_html: '<p>Super</p>' },
                  tokens_consumed: 2,
                  error_message: null,
                  bullmq_job_id: 'bull-101',
                  duration_seconds: 0.9,
                  provider_label: 'gemini-1.5-flash',
                  created_at: new Date().toISOString(),
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                },
              ],
              pagination: { total: 1, page: 1, limit: 25, total_pages: 1 },
              summary: { total: 1, completed_count: 1, failed_count: 0, active_count: 0, total_tokens: 2, avg_duration_seconds: 0.9 },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renders overview KPIs and loads telemetry data properly', async () => {
    render(<AdminReGoAiCosts />);

    await waitFor(() => {
      expect(screen.getByText(/Supervision IA & Maîtrise des Coûts/i)).toBeInTheDocument();
    });
    // print main content
    screen.debug();
  });

  it('saves prompt template to live backend endpoint without fake timeouts', async () => {
    render(<AdminReGoAiCosts />);

    await waitFor(() => {
      expect(screen.getByText(/Prompts Studio \(Templates\)/i)).toBeInTheDocument();
    });

    // Navigate to Prompts tab
    fireEvent.click(screen.getByText(/Prompts Studio \(Templates\)/i));

    await waitFor(() => {
      expect(screen.getByText(/Éditeur de Consigne Système & Prompt Utilisateur/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        expect.stringContaining('/api/pd/admin/ai/prompts/product_description'),
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(screen.getByText(/Directives du prompt enregistrées avec succès/i)).toBeInTheDocument();
    });
  });

  it('updates pricing to live backend endpoint PUT /api/pd/admin/ai-pricing', async () => {
    render(<AdminReGoAiCosts />);

    await waitFor(() => {
      expect(screen.getByText(/Barème & Quotas Jetons/i)).toBeInTheDocument();
    });

    // Navigate to Pricing tab
    fireEvent.click(screen.getByText(/Barème & Quotas Jetons/i));

    await waitFor(() => {
      expect(screen.getByText(/Barème de Consommation des Jetons IA/i)).toBeInTheDocument();
    });

    const savePricingBtn = screen.getByRole('button', { name: /Enregistrer les Tarifs/i });
    fireEvent.click(savePricingBtn);

    await waitFor(() => {
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        '/api/pd/admin/ai-pricing',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(screen.getByText(/Barème des jetons IA mis à jour avec succès/i)).toBeInTheDocument();
    });
  });

  it('updates 3-tier routing failover via PUT /api/pd/admin/ai/purpose-routing', async () => {
    render(<AdminReGoAiCosts />);

    await waitFor(() => {
      expect(screen.getByText(/Routage & Failover 3-Niveaux/i)).toBeInTheDocument();
    });

    // Navigate to Routing tab
    fireEvent.click(screen.getByText(/Routage & Failover 3-Niveaux/i));

    await waitFor(() => {
      expect(screen.getByText(/Routage & Basculement Multi-Modèles/i)).toBeInTheDocument();
    });

    // Change primary provider dropdown for product_description
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);

    fireEvent.change(selects[0], { target: { value: 'prov-2' } });

    await waitFor(() => {
      expect(fetchWithCsrf).toHaveBeenCalledWith(
        '/api/pd/admin/ai/purpose-routing',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
  });
});
