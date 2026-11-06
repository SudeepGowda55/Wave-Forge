import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/pipeline", "/signup", "/signin", "/demo", "/live", "/upload", "/dashboard"].map((p) => ({ url: `${SITE.url}${p}`, lastModified: new Date() }));
}
