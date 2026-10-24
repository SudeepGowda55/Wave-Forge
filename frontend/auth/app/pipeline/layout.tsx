import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Pipeline", "How a video moves through the Go gateway, RabbitMQ, the Python converter and the notification service before the audio link lands in your inbox.", "/pipeline");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
