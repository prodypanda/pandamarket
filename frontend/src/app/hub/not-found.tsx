import { Home, PackageSearch, Search } from 'lucide-react';
import { ErrorStatePage } from '../../components/ErrorStatePage';

export default function HubNotFoundPage() {
  return (
    <ErrorStatePage
      eyebrow="Marketplace hub"
      code="404"
      title="This hub page is unavailable"
      description="The marketplace page you requested could not be found. Browse the hub, search products, or check your orders from your account."
      icon={PackageSearch}
      actions={[
        { href: '/hub', label: 'Hub home', icon: Home },
        { href: '/hub/search', label: 'Search products', icon: Search, variant: 'secondary' },
      ]}
    />
  );
}
