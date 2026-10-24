import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Files", "Your converted audio files in one list, with each file's format, sampling rate and a download link once the converter has finished it.", "/dashboard");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
