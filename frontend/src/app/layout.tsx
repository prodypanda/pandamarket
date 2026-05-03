import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PandaMarket — La marketplace tunisienne #1",
  description:
    "Découvrez des milliers de produits uniques de vendeurs indépendants tunisiens. Créez votre boutique en ligne gratuitement.",
  keywords: ["marketplace", "tunisie", "e-commerce", "boutique en ligne", "pandamarket"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
