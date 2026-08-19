import StoreProductPage, { generateMetadata as generateProductMetadata } from '../../product/[slug]/page';
import StoreProductsPage from '../page';
import { notFound } from 'next/navigation';
import { STORE_DATA_REVALIDATE_SECONDS, storeHostTag } from '@/lib/store-cache';

interface StoreData {
  id: string;
  name: string;
  status?: string | null;
}

async function getStoreByHost(host: string): Promise<StoreData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/stores/by-host/${encodeURIComponent(host)}`, {
      next: { revalidate: STORE_DATA_REVALIDATE_SECONDS, tags: [storeHostTag(host)] },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.store;
  } catch {
    return null;
  }
}

async function getProduct(productSlug: string, storeId: string) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(
      `${backendUrl}/api/pd/products/by-store/${encodeURIComponent(storeId)}/${encodeURIComponent(productSlug)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const product = data.product || data;
    if (product.store_id !== storeId) return null;
    return product;
  } catch {
    return null;
  }
}

function getSlug(segments: string[]): string {
  return decodeURIComponent(segments[segments.length - 1] || '');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeHost: string; segments: string[] }>;
}) {
  const { storeHost, segments } = await params;
  const decodedHost = decodeURIComponent(storeHost);
  const store = await getStoreByHost(decodedHost);
  if (!store) return { title: 'Boutique introuvable' };

  const lastSlug = getSlug(segments);
  const product = await getProduct(lastSlug, store.id);
  if (product) {
    return generateProductMetadata({
      params: Promise.resolve({ storeHost, slug: product.slug || lastSlug }),
    });
  }

  return {
    title: `${lastSlug.replace(/-/g, ' ')} — ${store.name}`,
    description: `Découvrez nos produits dans la catégorie ${lastSlug.replace(/-/g, ' ')} chez ${store.name}.`,
  };
}

export default async function PrettyStoreProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeHost: string; segments: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { storeHost, segments } = await params;
  const decodedHost = decodeURIComponent(storeHost);
  const store = await getStoreByHost(decodedHost);
  if (!store) notFound();

  const lastSlug = getSlug(segments);
  let product = await getProduct(lastSlug, store.id);

  // If not found with the last segment, check intermediate candidate segments
  if (!product && segments.length > 1) {
    for (let i = segments.length - 2; i >= 0; i--) {
      const candidateSlug = decodeURIComponent(segments[i] || '');
      if (candidateSlug) {
        const candidate = await getProduct(candidateSlug, store.id);
        if (candidate) {
          product = candidate;
          break;
        }
      }
    }
  }

  // If product resolved: render product detail page
  if (product) {
    return StoreProductPage({
      params: Promise.resolve({ storeHost, slug: product.slug || lastSlug }),
      searchParams: searchParams as any,
    });
  }

  // Otherwise, it's a category/subcategory catalog listing URL
  const resolvedSearchParams = (await searchParams) || {};
  return StoreProductsPage({
    params: Promise.resolve({ storeHost }),
    searchParams: Promise.resolve({
      ...resolvedSearchParams,
      category: lastSlug,
    }),
  });
}

