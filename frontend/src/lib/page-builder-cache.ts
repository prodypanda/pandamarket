export const PAGE_BUILDER_REVALIDATE_SECONDS = 30;

function safeTagPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9:_-]/g, '-').slice(0, 120);
}

export function pageBuilderStoreTag(storeId: string): string {
  return `page-builder-store:${safeTagPart(storeId)}`;
}

export function pageBuilderHomepageTag(storeId: string): string {
  return `page-builder-homepage:${safeTagPart(storeId)}`;
}

export function pageBuilderPageTag(storeId: string, slug: string): string {
  return `page-builder-page:${safeTagPart(storeId)}:${safeTagPart(slug)}`;
}

export async function revalidatePageBuilderCache(input: {
  storeId?: string | null;
  slug?: string | null;
  homepage?: boolean;
}): Promise<void> {
  if (!input.storeId) return;
  await fetch('/api/page-builder/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  }).catch(() => undefined);
}
