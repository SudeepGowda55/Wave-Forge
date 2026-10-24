import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Files", "Your converted audio files.", "/dashboard");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
