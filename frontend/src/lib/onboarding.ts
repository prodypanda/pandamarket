import { fetchWithCsrf } from './api';

export type OnboardingStepId =
  | 'welcome'
  | 'store_basics'
  | 'theme'
  | 'kyc'
  | 'first_product'
  | 'payment_shipping'
  | 'publish_store'
  | 'buyer_welcome';

export interface OnboardingStepState {
  completed?: boolean;
  dismissed?: boolean;
  completed_at?: string;
  dismissed_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export type OnboardingState = Partial<Record<OnboardingStepId, OnboardingStepState>>;

export async function fetchOnboardingState(): Promise<OnboardingState> {
  const res = await fetchWithCsrf('/api/pd/auth/onboarding', { credentials: 'include' });
  if (!res.ok) return {};
  const data = await res.json();
  return data.onboarding_state || {};
}

export async function updateOnboardingStep(
  step: OnboardingStepId,
  patch: Pick<OnboardingStepState, 'completed' | 'dismissed' | 'metadata'>,
): Promise<OnboardingState> {
  const res = await fetchWithCsrf('/api/pd/auth/onboarding', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ step, ...patch }),
  });
  if (!res.ok) throw new Error('Failed to update onboarding progress');
  const data = await res.json();
  return data.onboarding_state || {};
}
