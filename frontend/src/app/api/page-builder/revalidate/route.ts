import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/api';
import { pageBuilderHomepageTag, pageBuilderPageTag, pageBuilderStoreTag } from '@/lib/page-builder-cache';

interface AuthMeResponse {
  user?: {
    role?: string | null;
    store_id?: string | null;
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { storeId?: unknown; slug?: unknown; homepage?: unknown };
  const storeId = typeof body.storeId === 'string' ? body.storeId : '';
  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie') || '';
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);
  const authRes = await fetch(`${BACKEND_URL}/api/pd/auth/me`, {
    headers,
    cache: 'no-store',
  }).catch(() => null);
  if (!authRes?.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const auth = await authRes.json().catch(() => null) as AuthMeResponse | null;
  const user = auth?.user;
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  if (!isAdmin && user?.store_id !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tags = new Set<string>([pageBuilderStoreTag(storeId)]);
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (slug) tags.add(pageBuilderPageTag(storeId, slug));
  if (body.homepage === true) tags.add(pageBuilderHomepageTag(storeId));

  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json({ ok: true, tags: [...tags] });
}
