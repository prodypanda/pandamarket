import { Metadata } from 'next';
import { SellerLoyaltyDashboard } from '@/components/dashboard/SellerLoyaltyDashboard';

export const metadata: Metadata = {
  title: 'Abonnés & Fidélité — Tableau de bord Vendeur | PandaMarket',
  description: 'Gérez vos abonnés, vos diffusions privées de coupons et analysez la répartition géographique de votre audience tunisienne.',
};

export default function Page() {
  return <SellerLoyaltyDashboard />;
}
