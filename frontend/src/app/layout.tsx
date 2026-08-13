import type { Metadata } from "next";
import { Inter, Playfair_Display, Poppins, Montserrat, Lora, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";
import { getMarketplacePublicUrl, getMarketplaceSettings } from "../lib/marketplace-settings";
import { selectLogoForSurface } from "../lib/public-assets";
import { ConsentBanner } from "../components/store/ConsentBanner";
import { ConsentScriptGate } from "../components/store/ConsentScriptGate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
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

  const brandStyles = {
    ...(marketplaceSettings.marketplace_primary_color ? { '--brand-primary': marketplaceSettings.marketplace_primary_color } : {}),
    ...(marketplaceSettings.marketplace_secondary_color ? { '--brand-secondary': marketplaceSettings.marketplace_secondary_color } : {}),
  } as React.CSSProperties;

  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable} ${poppins.variable} ${montserrat.variable} ${lora.variable} ${spaceGrotesk.variable} h-full antialiased`} style={brandStyles}>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
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
        <ConsentScriptGate
          ga4MeasurementId={ga4MeasurementId}
          gtmContainerId={gtmContainerId}
          metaPixelId={metaPixelId}
        />
        <ConsentBanner />
      </body>
    </html>
  );
}
