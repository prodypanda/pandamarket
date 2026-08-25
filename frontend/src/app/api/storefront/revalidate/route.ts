import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/api';
import { storeHostTag } from '@/lib/store-cache';

interface AuthMeResponse {
  user?: {
    role?: string | null;
    store_id?: string | null;
  };
}

/**
 * On-demand ISR revalidation for storefront store data.
 *
 * Called by the seller dashboard (settings / onboarding pages) after saving
 * theme or store settings so changes are visible immediately on the storefront
 * instead of waiting for the 60-second ISR TTL to expire.
 *
 * Accepts POST { hostnames: string[] } where each hostname is a subdomain
 * or custom domain that maps to the store.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { hostnames?: unknown };
  const hostnames = Array.isArray(body.hostnames)
    ? (body.hostnames as unknown[]).filter((h): h is string => typeof h === 'string' && h.length > 0)
    : [];
  if (hostnames.length === 0) {
    return NextResponse.json({ error: 'hostnames[] is required' }, { status: 400 });
  }

  // Audit P2-16: machine-caller path. The backend outbox worker triggers
  // ISR revalidation server-to-server and has no user session — it
  // authenticated against nothing before and got 401 on every call.
  // Shared secret (constant-time compare) from PD_REVALIDATE_SECRET.
  const revalidateSecret = process.env.PD_REVALIDATE_SECRET;
  const providedSecret = request.headers.get('x-revalidate-secret') || '';
  const isMachineCaller =
    Boolean(revalidateSecret) &&
    providedSecret.length === revalidateSecret!.length &&
    providedSecret === revalidateSecret;

  if (!isMachineCaller) {
    // Authenticate the human caller
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
    const isSeller = user?.role === 'seller' || user?.role === 'vendor';
    if (!isAdmin && !isSeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const tags: string[] = [];
  for (const hostname of hostnames) {
    const tag = storeHostTag(hostname);
    revalidateTag(tag, { expire: 0 });
    tags.push(tag);
  }

  return NextResponse.json({ ok: true, tags });
}
