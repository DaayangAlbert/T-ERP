import { redirect } from "next/navigation";
import { getCandidateSession } from "@/lib/cand-session";
import { Logo } from "@/components/layout/Logo";

export default function CandidateAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (getCandidateSession()) redirect("/cand/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt p-4">
      <div className="w-full max-w-md">
        <div className="mb-5 flex flex-col items-center text-center">
          <Logo className="h-12 w-12" />
          <div className="mt-2 text-base font-bold text-ink">T-ERP</div>
          <div className="text-[10px] uppercase tracking-wider text-ink-3">
            Plateforme SaaS · BTP
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          {children}
        </div>
      </div>
    </div>
  );
}
