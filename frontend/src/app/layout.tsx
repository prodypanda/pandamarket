import type { Metadata } from "next";
import { Inter, Playfair_Display, Poppins, Montserrat, Lora, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "grapesjs/dist/css/grapes.min.css";
import "./globals.css";
import { Providers } from "../components/Providers";
import { getMarketplacePublicUrl, getMarketplaceSettings } from "../lib/marketplace-settings";
import { selectLogoForSurface } from "../lib/public-assets";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const marketplaceSettings = await getMarketplaceSettings();
  const marketplaceName = marketplaceSettings.marketplace_name || "PandaMarket";
  const tagline = marketplaceSettings.marketplace_tagline || "La marketplace tunisienne pour boutiques modernes";
  const faviconUrl = marketplaceSettings.marketplace_favicon_url || "/favicon.ico";
  const logoImageUrl = selectLogoForSurface({
    marketplace_logo_url: marketplaceSettings.marketplace_logo_url,
    marketplace_logo_light_url: marketplaceSettings.marketplace_logo_light_url,
    marketplace_logo_dark_url: marketplaceSettings.marketplace_logo_dark_url,
  }, "light");
  const ogImageUrl = marketplaceSettings.marketplace_og_image_url || logoImageUrl || "/og-image.png";
  const marketplacePublicUrl = getMarketplacePublicUrl(marketplaceSettings);
  const title = `${marketplaceName} — ${tagline}`;
  const description = `Découvrez ${marketplaceName} : ${tagline}. Créez votre boutique en ligne gratuitement.`;

  return {
    title: {
      default: title,
      template: `%s | ${marketplaceName}`,
    },
    description,
    keywords: ["marketplace", "tunisie", "e-commerce", "boutique en ligne", marketplaceName.toLowerCase(), "vente en ligne", "flouci", "konnect"],
    metadataBase: new URL(marketplacePublicUrl),
    icons: {
      icon: faviconUrl,
    },
    openGraph: {
      type: "website",
      locale: "fr_TN",
      siteName: marketplaceName,
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
    verification: marketplaceSettings.search_console_verification
      ? { google: marketplaceSettings.search_console_verification }
      : undefined,
  };
}

function validGa4MeasurementId(value?: string) {
  const normalized = value?.trim();
  return normalized && /^G-[A-Z0-9]{4,20}$/.test(normalized) ? normalized : "";
}

function validGtmContainerId(value?: string) {
  const normalized = value?.trim();
  return normalized && /^GTM-[A-Z0-9]{4,20}$/.test(normalized) ? normalized : "";
}

function validMetaPixelId(value?: string) {
  const normalized = value?.trim();
  return normalized && /^\d{5,30}$/.test(normalized) ? normalized : "";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const marketplaceSettings = await getMarketplaceSettings();
  const ga4MeasurementId = marketplaceSettings.analytics_ga4_enabled
    ? validGa4MeasurementId(marketplaceSettings.analytics_ga4_measurement_id)
    : "";
  const gtmContainerId = marketplaceSettings.analytics_gtm_enabled
    ? validGtmContainerId(marketplaceSettings.analytics_gtm_container_id)
    : "";
  const metaPixelId = marketplaceSettings.analytics_meta_pixel_enabled
    ? validMetaPixelId(marketplaceSettings.analytics_meta_pixel_id)
    : "";

  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable} ${poppins.variable} ${montserrat.variable} ${lora.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {gtmContainerId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmContainerId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <Providers>{children}</Providers>
        {ga4MeasurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="pd-ga4" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga4MeasurementId}');`}
            </Script>
          </>
        )}
        {gtmContainerId && (
          <Script id="pd-gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmContainerId}');`}
          </Script>
        )}
        {metaPixelId && (
          <>
            <Script id="pd-meta-pixel" strategy="afterInteractive">
              {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');`}
            </Script>
            <noscript
              dangerouslySetInnerHTML={{
                __html: `<img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1" />`,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
