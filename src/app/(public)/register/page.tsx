import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getAdminSession } from "@/lib/admin-session";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Créer mon entreprise — T-ERP",
  description:
    "Créez votre espace T-ERP en moins de 2 minutes. 30 jours d'essai gratuit, sans engagement.",
  alternates: { canonical: "https://terp.cm/register" },
};

export default function RegisterPage() {
  if (getAdminSession()) redirect("/admin");
  const session = getCurrentSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <header className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-primary hover:underline">
            ← T-ERP
          </Link>
          <Link href="/login" className="text-sm text-ink-3 hover:text-ink">
            Déjà un compte ? <span className="font-semibold text-primary">Se connecter</span>
          </Link>
        </header>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Créez votre espace T-ERP
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            30 jours d'essai gratuit, sans carte bancaire requise. Vous serez
            connecté immédiatement après création.
          </p>

          <div className="mt-6">
            <RegisterForm />
          </div>
        </div>

        <p className="mt-6 text-center text-[12px] text-ink-3">
          En créant un compte, vous acceptez nos{" "}
          <Link href="/terms" className="text-primary hover:underline">
            CGU
          </Link>{" "}
          et notre{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
