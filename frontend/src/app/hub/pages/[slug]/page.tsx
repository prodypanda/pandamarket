import React from 'react';
import { notFound } from 'next/navigation';
import type { FetchResult } from '@/lib/fetch-result';
import { Metadata } from 'next';
// Audit P1-5: render through the DOMPurify-based renderer used by the store
// page builder — never raw dangerouslySetInnerHTML for CMS content.
import { SafePageRenderer } from '@/components/page-builder/SafePageRenderer';

export const revalidate = 0; // Preview tokens must always reflect live content

interface HubCmsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function getPageBySlug(slug: string): Promise<FetchResult<any>> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/marketplace/cms/slug/${slug}`, {
      next: { revalidate: 60 }
    });
    if (res.status === 404) return { status: 'not_found' };
    if (!res.ok) return { status: 'error', error: `Upstream CMS service returned ${res.status}`, statusCode: res.status };
    const json = await res.json();
    if (!json.data) return { status: 'not_found' };
    return { status: 'ok', data: json.data };
  } catch (e: any) {
    return { status: 'error', error: e?.message || 'Network error fetching CMS page' };
  }
}

/**
 * Audit P1-6: resolve draft/unpublished content via a short-lived signed
 * preview token minted by POST /marketplace/cms/:id/preview.
 */
async function getPageBySlugForPreview(slug: string, token: string): Promise<FetchResult<any>> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(
      `${backendUrl}/api/pd/marketplace/cms/slug/${slug}/preview?pb_preview=${encodeURIComponent(token)}`,
      { cache: 'no-store' }
    );
    if (res.status === 404) return { status: 'not_found' };
    if (!res.ok) return { status: 'error', error: `Upstream preview returned ${res.status}`, statusCode: res.status };
    const json = await res.json();
    if (!json.data) return { status: 'not_found' };
    return { status: 'ok', data: json.data };
  } catch (e: any) {
    return { status: 'error', error: e?.message || 'Network error fetching preview' };
  }
}

export async function generateMetadata({ params }: HubCmsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const pageRes = await getPageBySlug(slug);
  if (pageRes.status !== 'ok' || !pageRes.data?.is_published) {
    return { title: 'Page Not Found', robots: { index: false } };
  }
  const page = pageRes.data;
  const settings = page.settings || {};
  return {
    title: settings.seo_title || page.title,
    description: settings.seo_description,
    openGraph: {
      title: settings.seo_title || page.title,
      description: settings.seo_description,
      images: settings.og_image ? [{ url: settings.og_image }] : undefined,
    }
  };
}

export default async function HubCmsPage({ params, searchParams }: HubCmsPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const previewTokenRaw = resolvedSearchParams.pb_preview;
  const previewToken = Array.isArray(previewTokenRaw) ? previewTokenRaw[0] : previewTokenRaw;

  let page = null;
  if (previewToken) {
    const pageRes = await getPageBySlugForPreview(slug, previewToken);
    if (pageRes.status === 'not_found') notFound();
    if (pageRes.status === 'error') throw new Error(`Failed to load preview for CMS page ${slug}: ${pageRes.error}`);
    page = pageRes.data;
  } else {
    const pageRes = await getPageBySlug(slug);
    if (pageRes.status === 'not_found' || (pageRes.status === 'ok' && !pageRes.data?.is_published)) notFound();
    if (pageRes.status === 'error') throw new Error(`Failed to load CMS page ${slug}: ${pageRes.error}`);
    page = pageRes.data;
  }

  // Same rendering logic as Vendor PageBuilder pages — sanitized on write
  // (backend) and again at render (SafePageRenderer / DOMPurify).
  return (
    <SafePageRenderer html={page.html || ''} css={page.css || ''} />
  );
}
