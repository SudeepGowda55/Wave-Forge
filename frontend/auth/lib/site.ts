export const SITE = {
  name: "WaveForge",
  url: "https://waveforge.sudeepgowda.tech",
  repo: "https://github.com/SudeepGowda55/Wave-Forge",
  pitch: "Upload a video, get back clean MP3 or WAV audio at the sampling rate you choose.",
};

export const OG_IMAGE = { url: "/og.png", width: 1200, height: 627 };

export const pageMeta = (title: string, description: string, path: string) => ({
  title,
  description,
  alternates: { canonical: path },
  openGraph: { title: `${title} · ${SITE.name}`, description, url: path, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image" as const, images: [OG_IMAGE.url] },
});

// shared mutable store: scroll timeline writes, the 3D render loop eases toward it
export const forge = { state: 0 };
