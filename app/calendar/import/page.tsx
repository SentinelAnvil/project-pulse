import { AuthGate } from "@/components/auth-gate";

export default function CalendarImportPage() {
  return <AuthGate view="calendar-import" />;
}
