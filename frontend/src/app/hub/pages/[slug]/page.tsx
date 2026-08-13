import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const revalidate = 0; // Or standard revalidation if we implement caching

async function getPageBySlug(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/pd/marketplace/cms/slug/${slug}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (e) {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await getPageBySlug(params.slug);
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

export default async function HubCmsPage({ params }: { params: { slug: string } }) {
  const page = await getPageBySlug(params.slug);

  if (!page || !page.is_published) {
    notFound();
  }

  // Same rendering logic as Vendor PageBuilder pages
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: page.css || '' }} />
      <div 
        className="pd-page-content" 
        dangerouslySetInnerHTML={{ __html: page.html || '' }} 
      />
    </>
  );
}
