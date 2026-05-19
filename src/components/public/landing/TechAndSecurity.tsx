import {
  Database,
  Server,
  Lock,
  ShieldCheck,
  FileCheck,
  Zap,
  Globe,
  HardDrive,
  Network,
  KeyRound,
  History,
  Cloud,
} from "lucide-react";

const STACK = [
  {
    icon: Server,
    title: "Next.js 14 · React 18",
    body: "Architecture moderne SSR + RSC, code splitting auto, Edge runtime sur les routes statiques.",
  },
  {
    icon: Database,
    title: "PostgreSQL · Prisma",
    body: "Base relationnelle ACID, 100+ tables métier, migrations versionnées, requêtes typées TypeScript.",
  },
  {
    icon: Cloud,
    title: "Hébergement Cameroun",
    body: "Réplication chiffrée, backup quotidien, RPO 1h / RTO 4h. Datacenter Yaoundé + miroir Europe.",
  },
  {
    icon: Zap,
    title: "PWA terrain offline",
    body: "Pointage chantier, signature digitale, sync auto à la reconnexion. Fonctionne sur 3G basique.",
  },
];

const SECURITY = [
  {
    icon: Lock,
    title: "Chiffrement bout-en-bout",
    body: "TLS 1.3 en transit, AES-256 au repos, secrets via secret manager (jamais en clair en DB).",
  },
  {
    icon: KeyRound,
    title: "MFA hardware",
    body: "TOTP standard pour tous, MFA hardware YubiKey FIDO2 pour les rôles critiques (DG, IT, DAF).",
  },
  {
    icon: ShieldCheck,
    title: "RBAC 16 niveaux",
    body: "Matrice d'accès centralisée FULL/READ/SCOPE/OWN/NONE par rôle × module. Audit trail immuable.",
  },
  {
    icon: History,
    title: "Audit & traçabilité",
    body: "Toutes les actions critiques tracées 7 ans (loi camerounaise). Hash chaîné anti-altération.",
  },
];

const COMPLIANCE = [
  {
    icon: FileCheck,
    title: "SYSCOHADA OHADA",
    body: "Plan comptable pré-paramétré, balance, grand livre, états financiers conformes.",
  },
  {
    icon: Globe,
    title: "Loi 2010/012 Cameroun",
    body: "Protection données personnelles, consentement éclairé, droit à l'effacement, DPO.",
  },
  {
    icon: HardDrive,
    title: "RGPD européen (clients EU)",
    body: "Portabilité des données, export GDPR sur demande, sous-traitance encadrée.",
  },
  {
    icon: Network,
    title: "ISO 27001 + SOC 2 (2027)",
    body: "Roadmap certification en cours, audits CIS Benchmark trimestriels et Mozilla Observatory continu.",
  },
];

const INTEGRATIONS = [
  { code: "CNPS", label: "DIPE + déclarations", status: "actif" },
  { code: "DGI", label: "TVA, IRPP, IS, NIU", status: "actif" },
  { code: "Afriland First Bank", label: "Virements, RIB, relevés", status: "actif" },
  { code: "SGBC", label: "Crédit, paiements", status: "actif" },
  { code: "WhatsApp Business", label: "Notifications, bulletins", status: "actif" },
  { code: "Cloudflare R2", label: "Storage documents", status: "actif" },
  { code: "Resend", label: "Emails transactionnels", status: "actif" },
  { code: "Sentry", label: "Monitoring erreurs", status: "actif" },
  { code: "Orange Money", label: "Paiements mobile", status: "bientôt" },
  { code: "MTN Mobile Money", label: "Paiements mobile", status: "bientôt" },
  { code: "Ecobank", label: "Virements multi-pays CEMAC", status: "bientôt" },
  { code: "DGD (Douanes)", label: "Imports matériaux", status: "bientôt" },
];

export function TechAndSecurity() {
  return (
    <section id="stack" className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Production-ready · Hébergement Cameroun
          </span>
          <h2 className="mt-3 text-2xl font-bold text-ink md:text-3xl">
            Tout ce qu&apos;il faut savoir, sans bla-bla
          </h2>
          <p className="mt-2 text-sm text-ink-3">
            On vous doit la vérité technique : voici la pile, la sécurité, la
            conformité légale et les intégrations actives.
          </p>
        </div>

        {/* Stack technique */}
        <div className="mt-12">
          <SectionTitle label="Stack technique" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STACK.map((s) => (
              <Tile
                key={s.title}
                icon={<s.icon className="h-5 w-5" />}
                title={s.title}
                body={s.body}
              />
            ))}
          </div>
        </div>

        {/* Sécurité */}
        <div className="mt-12">
          <SectionTitle label="Sécurité" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SECURITY.map((s) => (
              <Tile
                key={s.title}
                icon={<s.icon className="h-5 w-5" />}
                title={s.title}
                body={s.body}
              />
            ))}
          </div>
        </div>

        {/* Conformité légale */}
        <div className="mt-12">
          <SectionTitle label="Conformité légale" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {COMPLIANCE.map((s) => (
              <Tile
                key={s.title}
                icon={<s.icon className="h-5 w-5" />}
                title={s.title}
                body={s.body}
              />
            ))}
          </div>
        </div>

        {/* Intégrations */}
        <div className="mt-12">
          <SectionTitle label="Intégrations natives" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((it) => (
              <div
                key={it.code}
                className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-2"
              >
                <span
                  className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded font-bold ${
                    it.status === "actif"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {it.code.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">{it.code}</div>
                  <div className="truncate text-xs text-ink-3">{it.label}</div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    it.status === "actif"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {it.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chiffres clés */}
        <div className="mt-12 grid gap-4 rounded-2xl border border-line bg-brand-gradient-dark p-6 text-white sm:grid-cols-2 md:grid-cols-4">
          <Stat value="100+" label="tables Prisma" />
          <Stat value="14 + 1" label="profils métier" />
          <Stat value="< 200ms" label="p95 SSR" />
          <Stat value="99,9 %" label="SLA cible production" />
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[.2em] text-primary-700">
        {label}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function Tile({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-line p-4 transition-shadow hover:shadow-card">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary-700">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-xs leading-snug text-ink-2">{body}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wide text-white/70">{label}</div>
    </div>
  );
}
