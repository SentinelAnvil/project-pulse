import { PulseDashboard } from "@/components/pulse-dashboard";
import { requireChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireChatGPTUser("/dashboard");
  return <PulseDashboard userName={user.displayName} />;
}
