export const SITE = {
  name: "WaveForge",
  url: "https://waveforge.sudeepgowda.tech",
  api: process.env.NEXT_PUBLIC_API_URL,
  repo: "https://github.com/SudeepGowda55/Wave-Forge",
  pitch: "Upload a video and get back clean MP3 or WAV audio at the sampling rate you choose, converted and transcribed by five microservices in Docker and emailed to you.",
};

// languages the dubbing feature offers; Hindi and Kannada sound accented with non-native reference voices
export const DUB_LANGS: [string, string][] = [
  ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['ja', 'Japanese'],
  ['zh', 'Chinese'], ['en', 'English'], ['hi', 'Hindi (beta)'], ['kn', 'Kannada (beta)'],
];


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
