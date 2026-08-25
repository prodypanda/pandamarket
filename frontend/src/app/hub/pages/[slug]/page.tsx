import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
// Audit P1-5: render through the DOMPurify-based renderer used by the store
// page builder — never raw dangerouslySetInnerHTML for CMS content.
import { SafePageRenderer } from '@/components/page-builder/SafePageRenderer';

export const revalidate = 0; // Preview tokens must always reflect live content

interface HubCmsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function getPageBySlug(slug: string) {
  try {
    // Audit P1-3: this page previously used NEXT_PUBLIC_API_URL (unset in
    // production) with a localhost:3001 fallback, so every fetch failed and the
    // catch swallowed it into a 404. Server components must use BACKEND_URL,
    // like every other hub server page.
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/marketplace/cms/slug/${slug}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (e) {
    return null;
  }
}

/**
 * Audit P1-6: resolve draft/unpublished content via a short-lived signed
 * preview token minted by POST /marketplace/cms/:id/preview.
 */
async function getPageBySlugForPreview(slug: string, token: string) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(
      `${backendUrl}/api/pd/marketplace/cms/slug/${slug}/preview?pb_preview=${encodeURIComponent(token)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (e) {
    return null;
  }
}

export async function generateMetadata({ params }: HubCmsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page || !page.is_published) {
    return { title: 'Page Not Found' };
  }
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
    page = await getPageBySlugForPreview(slug, previewToken);
    if (!page) notFound();
  } else {
    page = await getPageBySlug(slug);
    if (!page || !page.is_published) notFound();
  }

  // Same rendering logic as Vendor PageBuilder pages — sanitized on write
  // (backend) and again at render (SafePageRenderer / DOMPurify).
  return (
    <SafePageRenderer html={page.html || ''} css={page.css || ''} />
  );
}
