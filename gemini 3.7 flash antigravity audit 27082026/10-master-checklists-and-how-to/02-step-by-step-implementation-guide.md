# 02 — Step-by-Step Implementation Recipes & Code Blueprints

This document provides concrete, copy-paste ready technical recipes for implementing the primary priority features identified in the audit.

---

## 🛠️ Recipe 1: Building the Interactive Seller Onboarding Tour

### 1. Database & API Contract
The backend already supports `PATCH /api/pd/auth/onboarding` with schema:
```json
{
  "step": "store_basics",
  "completed": true,
  "metadata": { "has_logo": true, "has_colors": true }
}
```

### 2. Frontend Wizard Component (`OnboardingModal.tsx`)
```tsx
// frontend/src/components/dashboard/OnboardingModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Store, Palette, ShieldCheck, Package, CreditCard, Rocket, Check, ArrowRight } from 'lucide-react';
import { fetchOnboardingState, updateOnboardingStep } from '@/lib/onboarding';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const steps = [
    { id: 'store_basics', title: 'Store Basics', icon: Store, desc: 'Set store name, logo, and brand identity.' },
    { id: 'theme', title: 'Theme Selection', icon: Palette, desc: 'Pick from 20 responsive Tunisian themes.' },
    { id: 'kyc', title: 'KYC Verification', icon: ShieldCheck, desc: 'Upload CIN and Registre de Commerce.' },
    { id: 'first_product', title: 'First Product', icon: Package, desc: 'Create your first listing with AI tagger.' },
    { id: 'payment_shipping', title: 'Payment & Shipping', icon: CreditCard, desc: 'Configure escrow wallet or direct gateway.' },
    { id: 'publish_store', title: 'Launch Store', icon: Rocket, desc: 'Go live with your custom domain.' },
  ];

  if (!isOpen) return null;

  const handleCompleteStep = async (stepId: string) => {
    setLoading(true);
    await updateOnboardingStep(stepId, { completed: true });
    setLoading(false);
    if (currentStep < steps.length - 1) {
      setCurrentStep((c) => c + 1);
    } else {
      onClose();
    }
  };

  const active = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-gray-100">
        {/* Stepper Header */}
        <div className="flex items-center justify-between border-b pb-6 mb-6">
          <div>
            <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">Step {currentStep + 1} of {steps.length}</span>
            <h2 className="text-2xl font-black text-gray-900 mt-1">{active.title}</h2>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <active.icon className="w-8 h-8" />
          </div>
        </div>

        {/* Step Description */}
        <p className="text-gray-600 text-sm mb-8 leading-relaxed">{active.desc}</p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-2 rounded-full mb-8 overflow-hidden">
          <div
            className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm font-semibold transition"
          >
            Skip for now
          </button>
          <button
            onClick={() => handleCompleteStep(active.id)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5"
          >
            {currentStep === steps.length - 1 ? 'Finish & Launch' : 'Continue'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🛠️ Recipe 2: Scoped Storefront Analytics Injection

```tsx
// frontend/src/components/store/StorefrontAnalyticsTracker.tsx
'use client';

import Script from 'next/script';

interface StorefrontAnalyticsProps {
  storeSettings?: {
    analytics?: {
      ga4_measurement_id?: string;
      meta_pixel_id?: string;
      tiktok_pixel_id?: string;
      gtm_container_id?: string;
    };
  };
}

export function StorefrontAnalyticsTracker({ storeSettings }: StorefrontAnalyticsProps) {
  const analytics = storeSettings?.analytics;
  if (!analytics) return null;

  return (
    <>
      {/* 1. Google Tag Manager */}
      {analytics.gtm_container_id && (
        <Script id="store-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${analytics.gtm_container_id}');`}
        </Script>
      )}

      {/* 2. Google Analytics 4 */}
      {analytics.ga4_measurement_id && !analytics.gtm_container_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${analytics.ga4_measurement_id}`}
            strategy="afterInteractive"
          />
          <Script id="store-ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${analytics.ga4_measurement_id}', { send_page_view: true });`}
          </Script>
        </>
      )}

      {/* 3. Meta Pixel */}
      {analytics.meta_pixel_id && (
        <Script id="store-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${analytics.meta_pixel_id}');
          fbq('track', 'PageView');`}
        </Script>
      )}
    </>
  );
}
```

---

## 🛠️ Recipe 3: Social Media Auto-Publishing Queue Worker

```typescript
// backend/src/workers/social-post.worker.ts
import { Worker, Job } from 'bullmq';
import { getRedis } from '../db/redis';
import { query } from '../db/pool';
import { decrypt } from '../utils/crypto';
import { logger } from '../utils/logger';
import axios from 'axios';

interface SocialPostJobData {
  postId: string;
  storeId: string;
  network: 'facebook' | 'instagram' | 'tiktok' | 'linkedin';
  message: string;
  mediaUrl?: string;
}

export function startSocialPostWorker() {
  const worker = new Worker<SocialPostJobData>(
    'pd_social_posts',
    async (job: Job<SocialPostJobData>) => {
      const { postId, storeId, network, message, mediaUrl } = job.data;
      logger.info({ postId, network }, 'Processing social media post job');

      // 1. Fetch encrypted OAuth token for store
      const { rows } = await query(
        `SELECT token_encrypted, account_id FROM pd_social_account WHERE store_id = $1 AND network = $2 AND status = 'active'`,
        [storeId, network],
      );
      if (!rows[0]) throw new Error(`No active ${network} account linked for store ${storeId}`);

      const token = decrypt(rows[0].token_encrypted);
      const pageId = rows[0].account_id;

      // 2. Publish to Facebook Graph API
      if (network === 'facebook') {
        const url = mediaUrl
          ? `https://graph.facebook.com/v19.0/${pageId}/photos`
          : `https://graph.facebook.com/v19.0/${pageId}/feed`;
        
        await axios.post(url, {
          message,
          url: mediaUrl,
          access_token: token,
        });
      }

      // 3. Mark post published in database
      await query(
        `UPDATE pd_social_post SET status = 'published', published_at = NOW() WHERE id = $1`,
        [postId],
      );
    },
    {
      connection: getRedis(),
      concurrency: 5,
    },
  );

  return worker;
}
```

---

## 🛠️ Implementation Checklist

- [x] Onboarding modal step-by-step component blueprint.
- [x] Scoped storefront analytics injection component recipe.
- [x] BullMQ social media auto-publisher worker recipe.
- [x] All blueprints aligned with PandaMarket's TypeScript and raw SQL architecture.
