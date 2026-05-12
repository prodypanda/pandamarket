import { Home, Search, ShoppingBag } from 'lucide-react';
import { ErrorStatePage } from '../components/ErrorStatePage';

export default function NotFoundPage() {
  return (
    <ErrorStatePage
      eyebrow="Page not found"
      code="404"
      title="We couldn’t find this page"
      description="The page may have moved, the link may be outdated, or the address may contain a typo. You can return to PandaMarket and continue browsing safely."
      icon={ShoppingBag}
      actions={[
        { href: '/hub', label: 'Go to marketplace', icon: Home },
        { href: '/hub/search', label: 'Search products', icon: Search, variant: 'secondary' },
      ]}
    />
  );
}
