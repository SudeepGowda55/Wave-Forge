import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Files", "Your converted audio files with live status from upload to transcript, AI transcripts with clickable timestamps, and answers to questions about your videos.", "/dashboard");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
