import { StorefrontAuthPage } from '@/components/store/StorefrontAuthPage';
import { Suspense } from 'react';

export default function StorefrontLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <StorefrontAuthPage mode="login" />
    </Suspense>
  );
}
