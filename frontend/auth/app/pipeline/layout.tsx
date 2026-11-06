import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Pipeline", "How a video moves through the Go gateway, RabbitMQ, the Python converter, the AI service and the notifier, from upload to transcript, voice and email.", "/pipeline");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
