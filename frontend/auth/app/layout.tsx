import type { Metadata } from "next";
import { Kode_Mono, Manrope, Michroma } from "next/font/google";
import Shell from "@/components/Shell";
import { OG_IMAGE, SITE } from "@/lib/site";
import "./globals.css";

const title = Michroma({ subsets: ["latin"], variable: "--font-title", weight: "400" });
const body = Manrope({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "700"] });
const read = Kode_Mono({ subsets: ["latin"], variable: "--font-read", weight: ["400", "500"] });

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
