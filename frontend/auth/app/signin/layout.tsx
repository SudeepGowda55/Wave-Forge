import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Sign in", "Sign in to your WaveForge account to see your converted audio files and upload new videos.", "/signin");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
