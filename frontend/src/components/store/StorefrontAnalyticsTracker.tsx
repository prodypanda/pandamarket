'use client';

import Script from 'next/script';

export interface StoreAnalyticsSettings {
  ga4_measurement_id?: string | null;
  meta_pixel_id?: string | null;
  tiktok_pixel_id?: string | null;
  gtm_container_id?: string | null;
}

interface StorefrontAnalyticsTrackerProps {
  storeId?: string | null;
  analytics?: unknown;
}

function cleanId(val?: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

export function StorefrontAnalyticsTracker({ storeId: _storeId, analytics }: StorefrontAnalyticsTrackerProps) {
  if (!analytics || typeof analytics !== 'object') return null;

  const typed = analytics as StoreAnalyticsSettings;
  const gtmId = cleanId(typed.gtm_container_id);
  const ga4Id = cleanId(typed.ga4_measurement_id);
  const metaId = cleanId(typed.meta_pixel_id);
  const tiktokId = cleanId(typed.tiktok_pixel_id);

  return (
    <>
      {/* 1. Per-Store Google Tag Manager */}
      {gtmId && /^GTM-[A-Z0-9]{4,20}$/i.test(gtmId) && (
        <Script id="store-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      )}

      {/* 2. Per-Store GA4 Measurement ID */}
      {ga4Id && !gtmId && /^G-[A-Z0-9]{4,20}$/i.test(ga4Id) && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="store-ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Id}', { send_page_view: true });`}
          </Script>
        </>
      )}

      {/* 3. Per-Store Meta Pixel ID */}
      {metaId && /^\d{5,30}$/.test(metaId) && (
        <Script id="store-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${metaId}');
          fbq('track', 'PageView');`}
        </Script>
      )}

      {/* 4. Per-Store TikTok Pixel ID */}
      {tiktokId && /^[A-Z0-9]{10,30}$/i.test(tiktokId) && (
        <Script id="store-tiktok-pixel" strategy="afterInteractive">
          {`!function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load('${tiktokId}');
            ttq.page();
          }(window, document, 'ttq');`}
        </Script>
      )}
    </>
  );
}
