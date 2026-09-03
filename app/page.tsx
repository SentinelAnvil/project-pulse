import { PulseDashboard } from "@/components/pulse-dashboard";
import { requireChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <PulseDashboard userName={user.displayName} />;
}
