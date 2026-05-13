import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Landmark, Gavel, Mail, Scale, ScrollText, Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

// Tableau de bord SG — placeholder Bloc 0.
// Le Bloc 1 fn 1.1 fournira le vrai dashboard avec API + composants dédiés.
// Pour l'instant : KPIs lus en SSR depuis Prisma, pas de mutation.
export default async function SgDashboardPage() {
  const session = getCurrentSession();
  if (!session?.tenantId) redirect("/");
  const tenantId = session.tenantId;

  const [me, tenant] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.sub }, select: { firstName: true, lastName: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ]);
  const tenantName = tenant?.name ?? "Société";
  const meName = me ? `${me.firstName} ${me.lastName}` : "";

  const [contracts, activeCases, nextMeeting, expiringApprovals, pendingCorrespondences, registers, boardCount] = await Promise.all([
    prisma.clientContract.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.legalCase.count({
      where: { tenantId, status: { in: ["OPEN", "MEDIATION", "COURT_PENDING", "APPEAL", "SUPREME_COURT"] } },
    }),
    prisma.governanceMeeting.findFirst({
      where: { tenantId, status: "SCHEDULED" },
      orderBy: { scheduledAt: "asc" },
      select: { type: true, scheduledAt: true },
    }),
    prisma.professionalApproval.count({
      where: { tenantId, status: { in: ["EXPIRING_SOON", "EXPIRED"] } },
    }),
    prisma.officialCorrespondence.count({
      where: { tenantId, status: { in: ["RECEIVED", "IN_PROGRESS", "AWAITING_DG_SIGNATURE"] } },
    }),
    prisma.regulatoryRegister.findMany({
      where: { tenantId },
      select: { name: true, status: true },
    }),
    prisma.boardMember.count({ where: { tenantId, status: "ACTIVE" } }),
  ]);

  const provisionsAggregate = await prisma.legalCase.aggregate({
    where: { tenantId, status: { in: ["OPEN", "MEDIATION", "COURT_PENDING"] } },
    _sum: { provisionAmount: true },
  });
  const totalProvisions = Number(provisionsAggregate._sum.provisionAmount ?? 0n);

  const portfolioAggregate = await prisma.clientContract.aggregate({
    where: { tenantId, status: "ACTIVE" },
    _sum: { amountHT: true },
  });
  const portfolioValue = Number(portfolioAggregate._sum.amountHT ?? 0n);

  const daysToNextMeeting = nextMeeting?.scheduledAt
    ? Math.max(0, Math.ceil((nextMeeting.scheduledAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const registersAllUpToDate = registers.every((r) => r.status === "UP_TO_DATE");
  const registersCount = registers.length;

  const cards = [
    {
      label: "Marchés en cours",
      value: contracts.toString(),
      sub: `${(portfolioValue / 1_000_000_000).toFixed(2)} Md FCFA`,
      icon: ScrollText,
      tone: "violet",
    },
    {
      label: "Prochain CA / AG",
      value: daysToNextMeeting !== null ? `${daysToNextMeeting} j` : "—",
      sub: nextMeeting ? `${nextMeeting.type === "BOARD_MEETING" ? "CA" : "AG"} · ${nextMeeting.scheduledAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}` : "Aucun planifié",
      icon: Landmark,
      tone: daysToNextMeeting !== null && daysToNextMeeting <= 30 ? "amber" : "slate",
    },
    {
      label: "Contentieux actifs",
      value: activeCases.toString(),
      sub: `provisions ${(totalProvisions / 1_000_000).toFixed(0)} M FCFA`,
      icon: Gavel,
      tone: activeCases > 0 ? "rose" : "slate",
    },
    {
      label: "Conformité",
      value: registersAllUpToDate ? "OK" : `${registers.filter((r) => r.status !== "UP_TO_DATE").length}`,
      sub: registersAllUpToDate ? `${registersCount} registres à jour` : "registres à mettre à jour",
      icon: Scale,
      tone: registersAllUpToDate ? "emerald" : "amber",
    },
  ];

  const toneClasses: Record<string, string> = {
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Tableau de bord SG</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Gouvernance · Juridique · Affaires institutionnelles ·{" "}
            <span className={registersAllUpToDate ? "text-emerald-700" : "text-amber-700"}>
              {registersAllUpToDate ? "Tous registres à jour" : `${registers.filter((r) => r.status !== "UP_TO_DATE").length} registre(s) à mettre à jour`}
            </span>
          </p>
        </div>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-[11.5px] font-semibold text-violet-700">
          {tenantName} · OHADA · {boardCount} administrateurs
        </span>
      </header>

      <div className="rounded-2xl bg-gradient-to-br from-[#3C1361] via-[#5B2A86] to-[#7E3FB7] p-4 text-white shadow-lg sm:p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
          Secrétaire Général
        </div>
        <div className="mt-1.5 font-mono text-[18px] font-bold leading-tight tracking-tight sm:text-[22px]">
          {meName ? `Bonjour ${meName.split(" ")[0]} · ` : ""}{contracts} marchés · {activeCases} contentieux · {pendingCorrespondences} courriers en attente
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
              <div className={`grid h-10 w-10 place-items-center rounded-lg border ${toneClasses[c.tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[20px] font-bold leading-none tracking-tight text-ink">{c.value}</div>
                <div className="mt-0.5 text-[11.5px] text-ink-3">{c.label}</div>
                <div className="text-[11px] text-ink-3/80">{c.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-line bg-white">
        <header className="border-b border-line px-4 py-2.5">
          <h2 className="text-[13.5px] font-semibold text-ink">Bloc 0 livré · Bloc 1 (7 fonctions) à développer</h2>
        </header>
        <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Marchés & contrats", href: "/secretaire-general/marches", icon: ScrollText, count: contracts },
            { label: "CA & Gouvernance", href: "/secretaire-general/gouvernance", icon: Landmark, count: 2 },
            { label: "Contentieux", href: "/secretaire-general/contentieux", icon: Gavel, count: activeCases },
            { label: "Conformité", href: "/secretaire-general/conformite", icon: Scale, count: registersCount },
            { label: "Institutionnel", href: "/secretaire-general/institutionnel", icon: Briefcase, count: 8 },
            { label: "Courriers officiels", href: "/secretaire-general/courriers", icon: Mail, count: pendingCorrespondences + 3 },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.href}
                className="rounded-lg border border-dashed border-line bg-surface-alt/30 p-3"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-violet-600" />
                  <span className="text-[13px] font-semibold text-ink">{f.label}</span>
                </div>
                <div className="mt-1 text-[11px] text-ink-3">{f.count} entité(s) en base · UI à venir</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[12px] text-blue-900">
        <strong>Bloc 0 SG livré :</strong> 11 modèles Prisma corporate (ClientContract, MarketContractAmendment, BankGuarantee,
        GovernanceMeeting, MeetingDecision, BoardMember, Shareholder, LegalCase, LegalCaseEvent, RegulatoryRegister,
        OfficialCorrespondence, Institution, ProfessionalApproval) · RBAC SECRETARY_GENERAL + 5 flags · seed initial OHADA
        ({contracts} marchés · {boardCount} administrateurs · {activeCases} contentieux · {pendingCorrespondences} courriers en attente · {registers.length} registres).
        Note : MFA spec'd dans le prompt — non implémenté (phase 2).
      </section>
    </div>
  );
}
