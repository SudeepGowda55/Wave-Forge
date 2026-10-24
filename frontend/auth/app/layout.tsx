import type { Metadata } from "next";
import { Azeret_Mono, Big_Shoulders_Display, Schibsted_Grotesk } from "next/font/google";
import Shell from "@/components/Shell";
import { OG_IMAGE, SITE } from "@/lib/site";
import "./globals.css";

const title = Big_Shoulders_Display({ subsets: ["latin"], variable: "--font-title", weight: ["700", "800", "900"] });
const body = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "700"] });
const read = Azeret_Mono({ subsets: ["latin"], variable: "--font-read", weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} · Lift the sound off the picture`, template: `%s · ${SITE.name}` },
  description: SITE.pitch,
  alternates: { canonical: "/" },
  openGraph: { title: `${SITE.name} · Lift the sound off the picture`, description: SITE.pitch, url: "/", siteName: SITE.name, images: [OG_IMAGE] },
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
