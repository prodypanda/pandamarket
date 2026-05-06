import StoreProductPage, { generateMetadata as generateProductMetadata } from '../../product/[slug]/page';

function getSlug(segments: string[]): string {
  return segments[segments.length - 1] || '';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeHost: string; segments: string[] }>;
}) {
  const { storeHost, segments } = await params;
  return generateProductMetadata({
    params: Promise.resolve({ storeHost, slug: getSlug(segments) }),
  });
}

export default async function PrettyStoreProductPage({
  params,
}: {
  params: Promise<{ storeHost: string; segments: string[] }>;
}) {
  const { storeHost, segments } = await params;
  return StoreProductPage({
    params: Promise.resolve({ storeHost, slug: getSlug(segments) }),
  });
}
