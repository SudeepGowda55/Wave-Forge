import type { Metadata } from "next";
import localFont from "next/font/local";
import Shell from "@/components/Shell";
import { OG_IMAGE, SITE } from "@/lib/site";
import "./globals.css";

// self-hosted (SIL OFL, latin subset) so builds never depend on fetching fonts from Google at build time
const title = localFont({ src: "./fonts/michroma.woff2", variable: "--font-title", weight: "400", display: "swap" });
const body = localFont({ src: "./fonts/manrope.woff2", variable: "--font-body", weight: "200 800", display: "swap" });
const read = localFont({ src: "./fonts/kode-mono.woff2", variable: "--font-read", weight: "400 700", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} · The machine that listens`, template: `%s · ${SITE.name}` },
  description: SITE.pitch,
  alternates: { canonical: "/" },
  openGraph: { title: `${SITE.name} · The machine that listens`, description: SITE.pitch, url: "/", siteName: SITE.name, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${title.variable} ${body.variable} ${read.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
