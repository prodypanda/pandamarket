import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Mon Fil Panda — Boutiques Suivies & Nouveautés | PandaMarket',
  description: 'Retrouvez en temps réel les nouveautés, baisses de prix et recommandations exclusives de vos boutiques suivies sur PandaMarket.',
};

export default async function MyFollowedFeedRedirectPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      entries.push([key, value]);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === 'string') entries.push([key, v]);
      }
    }
  }
  const queryString = new URLSearchParams(entries).toString();
  redirect(queryString ? `/hub/my-followed-feed?${queryString}` : '/hub/my-followed-feed');
}
