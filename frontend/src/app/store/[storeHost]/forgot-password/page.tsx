import { StorefrontRecoveryPage } from '@/components/store/StorefrontRecoveryPage';
import { Suspense } from 'react';

export default function StorefrontForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <StorefrontRecoveryPage mode="forgot" />
    </Suspense>
  );
}
