import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Upload", "Upload a video, choose MP3 or WAV and a sampling rate of 22,400 Hz, 48,000 Hz or a custom value, and get an email when the audio is ready.", "/upload");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
