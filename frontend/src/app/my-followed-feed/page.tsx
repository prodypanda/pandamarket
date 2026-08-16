import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Mon Fil Panda — Boutiques Suivies & Nouveautés | PandaMarket',
  description: 'Retrouvez en temps réel les nouveautés, baisses de prix et recommandations exclusives de vos boutiques suivies sur PandaMarket.',
};

export default function MyFollowedFeedRedirectPage() {
  redirect('/hub/my-followed-feed');
}
