import { StorefrontRecoveryPage } from '@/components/store/StorefrontRecoveryPage';
import { Suspense } from 'react';

export default function StorefrontResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <StorefrontRecoveryPage mode="reset" />
    </Suspense>
  );
}
