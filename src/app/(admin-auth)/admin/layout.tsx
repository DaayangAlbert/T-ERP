import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (getAdminSession()) redirect("/admin");
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "#0F172A" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-5 flex flex-col items-center text-center">
          <div
            className="grid h-12 w-12 place-items-center rounded-lg text-base font-bold"
            style={{ background: "#22D3EE", color: "#0F172A" }}
          >
            SA
          </div>
          <div className="mt-2 text-base font-bold text-white">T-ERP · Console SaaS</div>
          <div className="text-[10px] uppercase tracking-wider text-cyan-300/80">
            Anthropic · Production
          </div>
        </div>
        <div
          className="rounded-2xl border p-6 shadow-2xl"
          style={{ background: "#1E293B", borderColor: "#334155" }}
        >
          {children}
        </div>
        <p className="mt-3 text-center text-[10px] text-white/40">
          Accès réservé · IP whitelisting · MFA hardware
        </p>
      </div>
    </div>
  );
}
