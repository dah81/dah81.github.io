import type { Metadata } from "next";
const isProd = process.env.NODE_ENV === "production";
const siteUrl = isProd ? "https://dah81.github.io/zamboni-driver" : "http://localhost:3000";
import { Geist, Geist_Mono, VT323 } from "next/font/google";
import "./globals.css";
import ClientMount from "./ClientMount";
import OrientationGate from "@/components/UI/OrientationGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vt323 = VT323({
  weight: "400",
  variable: "--font-vt323",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zamboni: Clean Sheet",
  description: "An 8-bit Blades of Steel-inspired Zamboni game.",
  metadataBase: new URL(siteUrl),
  icons: [
    { rel: "icon", url: "/zamboni-icon.svg" },
    { rel: "apple-touch-icon", url: "/zamboni-icon.svg" },
    { rel: "shortcut icon", url: "/zamboni-icon.svg" },
  ],
  openGraph: {
    title: "Zamboni: Clean Sheet",
    description: "Drive a retro Zamboni and clean the sheet!",
    type: "website",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary",
    title: "Zamboni: Clean Sheet",
    description: "Drive a retro Zamboni and clean the sheet!",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${vt323.variable} antialiased retro-bg`}
      >
        <OrientationGate>{children}</OrientationGate>
        <ClientMount />
      </body>
    </html>
  );
}
