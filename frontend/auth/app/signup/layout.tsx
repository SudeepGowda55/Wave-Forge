import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Sign up", "Create a WaveForge account to start converting video to audio.", "/signup");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
