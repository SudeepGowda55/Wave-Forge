import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Live", "Record your voice once, then type and hear yourself, speak and hear yourself in another language, or hold a spoken conversation with the machine.", "/live");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
