import { RoleScopedLoginPage } from '@/components/auth/RoleScopedLoginPage';

const ADMIN_NEXT_PREFIXES = [
  '/dashboard',
  '/kyc',
  '/mandats',
  '/messages',
  '/reports',
  '/users',
  '/withdrawals',
  '/plans',
  '/marketplace-categories',
  '/ai-costs',
  '/audit-log',
  '/smtp-config',
  '/settings',
];

export default function AdminLoginPage() {
  return (
    <RoleScopedLoginPage
      title="Superadmin vault access"
      subtitle="Enter the restricted command center for marketplace governance, audit, finance, vendors, and platform-critical controls."
      endpoint="/api/pd/auth/login/admin"
      defaultRedirect="/dashboard"
      allowedNextPrefixes={ADMIN_NEXT_PREFIXES}
      variant="admin"
    />
  );
}
