import Link from "next/link";

export function PortalFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-8 text-sm text-ink-3 sm:flex sm:items-center sm:justify-between">
        <div>
          <span className="font-semibold text-ink">T-ERP</span> — Plateforme SaaS BTP Cameroun
        </div>
        <nav className="mt-3 flex flex-wrap gap-4 sm:mt-0">
          <Link href="/about" className="hover:text-primary-700">À propos</Link>
          <Link href="/jobs" className="hover:text-primary-700">Offres d'emploi</Link>
          <a href="mailto:contact@terp.cm" className="hover:text-primary-700">Contact</a>
          <span className="text-ink-4">© {year}</span>
        </nav>
      </div>
    </footer>
  );
}
