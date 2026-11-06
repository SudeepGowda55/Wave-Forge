import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Demo", "See WaveForge's AI on real uploads: transcripts with clickable chapters, summaries, lines spoken in a cloned voice, and videos dubbed into other languages.", "/demo");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
