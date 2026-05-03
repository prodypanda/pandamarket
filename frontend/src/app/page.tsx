/**
 * Root page — redirects to /hub via middleware.
 * This page is only shown if the middleware doesn't match (shouldn't happen).
 */
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/hub');
}
