import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. favicon.ico)
     */
    '/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
  ],
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname of request (e.g. demo.pandamarket.tn, demo.localhost:3000)
  const hostname = req.headers.get('host') || 'pandamarket.local:3000';

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`;

  // Define Hub domains (local and production)
  const isHub =
    hostname === 'localhost:3000' ||
    hostname === 'pandamarket.local:3000' ||
    hostname === 'pandamarket.tn' ||
    hostname === 'www.pandamarket.tn';

  if (isHub) {
    return NextResponse.rewrite(new URL(`/hub${path}`, req.url));
  }

  // Extract subdomain (e.g. 'demo' from 'demo.pandamarket.local:3000')
  const currentHost = hostname
    .replace('.pandamarket.local:3000', '')
    .replace('.localhost:3000', '')
    .replace('.pandamarket.tn', '');

  return NextResponse.rewrite(new URL(`/store/${currentHost}${path}`, req.url));
}
