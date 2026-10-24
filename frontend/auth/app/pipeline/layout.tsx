import { pageMeta } from "@/lib/site";

export const metadata = pageMeta("Pipeline", "How a video moves through the gateway, RabbitMQ, the converter and the notification service.", "/pipeline");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
