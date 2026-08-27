import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get('title') || 'Produit Artisanal Tunisien';
    const price = searchParams.get('price') || 'Prix sur demande';
    const store = searchParams.get('store') || 'PandaMarket Tunisie';
    const badge = searchParams.get('badge') || '100% Fait Main 🇹🇳';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#090d16',
            backgroundImage: 'radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%)',
            backgroundSize: '50px 50px',
            padding: '60px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '36px' }}>🐼</span>
              <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff' }}>
                {store}
              </span>
            </div>
            <div
              style={{
                backgroundColor: '#059669',
                color: '#ffffff',
                padding: '8px 20px',
                borderRadius: '9999px',
                fontSize: '20px',
                fontWeight: 'bold',
              }}
            >
              {badge}
            </div>
          </div>

          {/* Center Product Title & Price */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1
              style={{
                fontSize: '56px',
                fontWeight: '900',
                color: '#ffffff',
                lineHeight: 1.1,
                maxWidth: '900px',
              }}
            >
              {title}
            </h1>
            <div
              style={{
                fontSize: '40px',
                fontWeight: '800',
                color: '#10b981',
              }}
            >
              {price}
            </div>
          </div>

          {/* Footer bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #334155',
              paddingTop: '20px',
            }}
          >
            <span style={{ fontSize: '20px', color: '#94a3b8' }}>
              Livraison rapide sur toute la Tunisie • Paiement à la livraison
            </span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' }}>
              pandamarket.tn
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch {
    return new Response('Failed to generate OG image', { status: 500 });
  }
}
