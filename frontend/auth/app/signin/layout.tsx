import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Sign in", "Sign in to WaveForge to see your converted audio, transcripts and summaries, ask questions about your videos, and make cloned-voice clips and dubs.", "/signin");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
