import {
  getStorefrontOrganizationJsonLd,
  getStorefrontProductJsonLd,
  serializeJsonLd,
  type StorefrontSeoProduct,
  type StorefrontSeoStore,
} from '../../lib/storefront-seo';

interface StorefrontSeoJsonLdProps {
  store: StorefrontSeoStore;
  canonicalUrl: string;
  product?: StorefrontSeoProduct;
}

export function StorefrontSeoJsonLd({ store, canonicalUrl, product }: StorefrontSeoJsonLdProps) {
  const organization = getStorefrontOrganizationJsonLd(store, canonicalUrl);
  const productData = product ? getStorefrontProductJsonLd(store, product, canonicalUrl) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(organization) }}
      />
      {productData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(productData) }}
        />
      )}
    </>
  );
}
