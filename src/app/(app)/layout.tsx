import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const session = getCurrentSession();
  if (!session) redirect("/");
  return <>{children}</>;
}
