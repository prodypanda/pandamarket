import { NextResponse } from 'next/server';

const MAX_REPORT_BYTES = 64 * 1024;

function safeLocation(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 512);
  } catch {
    return undefined;
  }
}

function reportValue(body: Record<string, unknown>, key: string): unknown {
  return body[key] ?? (body['csp-report'] as Record<string, unknown> | undefined)?.[key];
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REPORT_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  const rawBody = await request.text().catch(() => '');
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REPORT_BYTES) {
    return new NextResponse(null, { status: 413 });
  }
  let parsed: Record<string, unknown> | null = null;
  try {
    const candidate = JSON.parse(rawBody || 'null') as unknown;
    parsed = candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : null;
  } catch {
    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  if (parsed && typeof parsed === 'object') {
    // Reports are deliberately reduced to non-sensitive routing data. Query
    // strings, fragments, cookies, and request bodies are never logged.
    const report = {
      document_uri: safeLocation(reportValue(parsed, 'document-uri') || reportValue(parsed, 'documentURL')),
      blocked_uri: safeLocation(reportValue(parsed, 'blocked-uri') || reportValue(parsed, 'blockedURL')),
      violated_directive: typeof reportValue(parsed, 'violated-directive') === 'string'
        ? String(reportValue(parsed, 'violated-directive')).slice(0, 160)
        : undefined,
      effective_directive: typeof reportValue(parsed, 'effective-directive') === 'string'
        ? String(reportValue(parsed, 'effective-directive')).slice(0, 160)
        : undefined,
    };
    console.warn('[csp-report]', report);
  }

  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  });
}
