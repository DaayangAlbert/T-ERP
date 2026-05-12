import {
  Building,
  Smartphone,
  Plug,
  MessageCircle,
  Calculator,
  ShieldCheck,
} from "lucide-react";

const MODULES = [
  {
    icon: Building,
    title: "Multi-tenant",
    body: "Une plateforme, plusieurs sociétés / filiales. Consolidation groupe en temps réel.",
  },
  {
    icon: Smartphone,
    title: "PWA terrain",
    body: "Application installable, mode offline pour pointage chantier, sync auto.",
  },
  {
    icon: Plug,
    title: "Intégrations CM",
    body: "CNPS, DGI, Afriland, SGBC, Resend, Cloudflare R2, Sentry. Branché sur l'écosystème local.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Business",
    body: "Notifications bulletins, congés, entretiens. Vos employés sont déjà sur WhatsApp.",
  },
  {
    icon: Calculator,
    title: "SYSCOHADA natif",
    body: "Plan comptable, balance, grand livre, déclarations TVA/IS prêts à l'emploi.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité & RBAC",
    body: "2FA, audit trail, conformité loi 2010/012 protection données personnelles.",
  },
];

export function KeyModules() {
  return (
    <section id="modules" className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ink md:text-3xl">
            6 modules clés, intégrés nativement
          </h2>
          <p className="mt-2 text-sm text-ink-3">
            Pas d&apos;add-ons à acheter. Tout est là, dès le premier jour.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <div
              key={m.title}
              className="rounded-xl border border-line bg-white p-5"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-gradient text-white">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-ink">{m.title}</h3>
              <p className="mt-1 text-sm text-ink-2">{m.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
