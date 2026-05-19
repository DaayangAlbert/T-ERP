import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { isCandidateSession } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-session";
import { LandingHeader } from "@/components/public/landing/LandingHeader";
import { LandingHero } from "@/components/public/landing/LandingHero";
import { ClientLogos } from "@/components/public/landing/ClientLogos";
import { ProblemsSolved } from "@/components/public/landing/ProblemsSolved";
import { ProfilesGrid } from "@/components/public/landing/ProfilesGrid";
import { KeyModules } from "@/components/public/landing/KeyModules";
import { Testimonials } from "@/components/public/landing/Testimonials";
import { TechAndSecurity } from "@/components/public/landing/TechAndSecurity";
import { ComparisonTable } from "@/components/public/landing/ComparisonTable";
import { FaqSection } from "@/components/public/landing/FaqSection";
import { DemoRequestForm } from "@/components/public/landing/DemoRequestForm";
import { LandingFooter } from "@/components/public/landing/LandingFooter";

export const metadata: Metadata = {
  title: "T-ERP — L'ERP BTP multi-tenant pour PME camerounaises",
  description:
    "Pilotez vos chantiers, vos équipes et votre comptabilité depuis une seule plateforme. SYSCOHADA natif, CNPS/DGI, WhatsApp Business, hébergement Cameroun.",
  openGraph: {
    title: "T-ERP — ERP BTP Cameroun",
    description:
      "L'ERP qui parle SYSCOHADA, CNPS et chantier. Démo gratuite 45 min.",
    url: "https://terp.cm",
    siteName: "T-ERP",
    locale: "fr_CM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "T-ERP — ERP BTP Cameroun",
    description: "L'ERP qui parle SYSCOHADA, CNPS et chantier.",
  },
  alternates: {
    canonical: "https://terp.cm",
  },
};

export default function LandingPage() {
  // Une session super-admin a priorité — l'utilisateur Anthropic doit
  // toujours être ramené vers la console plateforme, pas la landing.
  if (getAdminSession()) redirect("/admin");
  const session = getCurrentSession();
  if (session) {
    if (isCandidateSession(session)) redirect("/cand/dashboard");
    redirect("/dashboard");
  }
  return (
    <>
      <LandingHeader />
      <LandingHero />
      <ClientLogos />
      <ProblemsSolved />
      <KeyModules />
      <ProfilesGrid />
      <TechAndSecurity />
      <ComparisonTable />
      <Testimonials />
      <FaqSection />
      <DemoRequestForm />
      <LandingFooter />
    </>
  );
}
