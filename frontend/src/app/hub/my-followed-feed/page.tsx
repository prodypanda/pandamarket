import { Metadata } from 'next';
import { Suspense } from 'react';
import { MyFollowedFeedPage } from '@/components/feed/MyFollowedFeedPage';

export const metadata: Metadata = {
  title: 'Mon Fil Panda — Boutiques Suivies & Nouveautés | PandaMarket',
  description: 'Retrouvez en temps réel les nouveautés, baisses de prix et recommandations exclusives de vos boutiques suivies sur PandaMarket.',
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50/50 p-8 animate-pulse dark:bg-[#0b0f17]" />}>
      <MyFollowedFeedPage />
    </Suspense>
  );
}
