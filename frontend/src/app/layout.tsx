import type { Metadata } from "next";
import { Inter, Playfair_Display, Poppins, Montserrat, Lora, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";

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

export const metadata: Metadata = {
  title: {
    default: "PandaMarket — La marketplace tunisienne #1",
    template: "%s | PandaMarket",
  },
  description:
    "Découvrez des milliers de produits uniques de vendeurs indépendants tunisiens. Créez votre boutique en ligne gratuitement.",
  keywords: ["marketplace", "tunisie", "e-commerce", "boutique en ligne", "pandamarket", "vente en ligne", "flouci", "konnect"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_HUB_URL || "https://pandamarket.tn"),
  openGraph: {
    type: "website",
    locale: "fr_TN",
    siteName: "PandaMarket",
    title: "PandaMarket — La marketplace tunisienne #1",
    description: "Découvrez des milliers de produits uniques de vendeurs indépendants tunisiens. Créez votre boutique en ligne gratuitement.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PandaMarket — La marketplace tunisienne",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PandaMarket — La marketplace tunisienne #1",
    description: "Découvrez des milliers de produits uniques de vendeurs indépendants tunisiens.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

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
