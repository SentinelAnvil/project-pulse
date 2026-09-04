import { AuthGate } from "@/components/auth-gate";

export default function CalendarPage() {
  return <AuthGate view="calendar" />;
}
