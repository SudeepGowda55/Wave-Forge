import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Upload", "Upload a video and choose MP3 or WAV and a sampling rate.", "/upload");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
