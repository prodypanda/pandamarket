import { redirect } from 'next/navigation';

/**
 * Audit M10: /hub/products was a 404 — it is the URL a user types, and two
 * test files reference it. The catalog experience lives at /hub/search with
 * full filters/sort/pagination, so route there instead of duplicating it.
 */
export default function HubProductsIndexPage() {
  redirect('/hub/search');
}
