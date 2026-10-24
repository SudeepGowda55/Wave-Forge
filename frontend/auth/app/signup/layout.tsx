import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Sign up", "Create a WaveForge account to convert video to MP3 or WAV audio. The download link for every converted file is emailed to the address you sign up with.", "/signup");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
