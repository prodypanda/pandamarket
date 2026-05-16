import type { Metadata } from "next";
import { Inter, Playfair_Display, Poppins, Montserrat, Lora, Space_Grotesk } from "next/font/google";
import "grapesjs/dist/css/grapes.min.css";
import "./globals.css";
import { Providers } from "../components/Providers";
import { getMarketplacePublicUrl, getMarketplaceSettings } from "../lib/marketplace-settings";

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
  const ogImageUrl = marketplaceSettings.marketplace_og_image_url || "/og-image.png";
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
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable} ${poppins.variable} ${montserrat.variable} ${lora.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
