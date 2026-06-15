import type { Metadata } from "next";
import { Bebas_Neue, Montserrat } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Stone Gods Slots",
  description: "Pull for your daily chance to win a Stone God NFT",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${bebas.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" href="/assets/stone-gods-frame.png" as="image" />
        <link rel="preload" href="/assets/stone-gods-thumb.png" as="image" />
      </head>
      <body className="min-h-dvh overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
