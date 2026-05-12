import { BarChart3, Flag, ShieldAlert } from 'lucide-react';
import { ErrorStatePage } from '@/components/ErrorStatePage';

export default function AdminNotFoundPage() {
  return (
    <ErrorStatePage
      eyebrow="Admin area"
      code="404"
      title="Admin page not found"
      description="This admin screen does not exist or the link is outdated. Return to the dashboard or continue managing reports."
      icon={ShieldAlert}
      actions={[
        { href: '/dashboard', label: 'Admin dashboard', icon: BarChart3, variant: 'dark' },
        { href: '/reports', label: 'Reports', icon: Flag, variant: 'secondary' },
      ]}
    />
  );
}
