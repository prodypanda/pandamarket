import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/api';
import { MARKETPLACE_SETTINGS_TAG } from '@/lib/marketplace-settings';

interface AuthMeResponse {
  user?: {
    role?: string | null;
  };
}

/**
 * Instantly invalidates cached marketplace settings and the hub pages.
 * Called by the superadmin settings page after saving, so theme/layout
 * changes are visible immediately instead of waiting for ISR expiry.
 */
export async function POST(request: NextRequest) {
  const headers = new Headers();
  const cookie = request.headers.get('cookie') || '';
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
  const role = auth?.user?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  revalidateTag(MARKETPLACE_SETTINGS_TAG, { expire: 0 });
  revalidatePath('/hub', 'layout');
  revalidatePath('/');

  return NextResponse.json({ ok: true });
}
