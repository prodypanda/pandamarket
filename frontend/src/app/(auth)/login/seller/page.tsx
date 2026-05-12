import { RoleScopedLoginPage } from '@/components/auth/RoleScopedLoginPage';

export default function SellerLoginPage() {
  return (
    <RoleScopedLoginPage
      title="Connexion vendeur"
      subtitle="Connectez-vous à votre tableau de bord vendeur."
      endpoint="/api/pd/auth/login/vendor"
      defaultRedirect="/hub/dashboard"
      registerHref="/register/seller"
      registerLabel="Créer ma boutique"
      allowedNextPrefixes={['/hub/dashboard']}
      variant="seller"
    />
  );
}
