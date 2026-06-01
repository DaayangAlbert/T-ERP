"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { clsx } from "clsx";

/**
 * Bouton « Aide » à placer dans l'en-tête d'une page. Au clic, ouvre un
 * tiroir latéral (drawer) qui affiche le contenu du tutoriel (children).
 *
 * Usage :
 *   <PageHelp title="Aide — Saisie d'écritures">
 *     <EcrituresTutorial />
 *   </PageHelp>
 *
 * Le bouton est sobre (icône + libellé court) pour ne pas concurrencer
 * les actions principales de la page.
 */
export function PageHelp({
  title = "Aide",
  label = "Aide",
  children,
}: {
  title?: string;
  label?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Fermeture sur Échap
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ouvrir le tutoriel"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300 hover:text-primary-700"
      >
        <HelpCircle className="h-3.5 w-3.5" /> {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className={clsx(
              "h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl",
              "sm:rounded-l-xl"
            )}
          >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary-600" />
                <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-md p-1 text-ink-3 hover:bg-surface-alt hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="prose-help px-4 py-4 text-[13px] leading-relaxed text-ink-2">
              {children}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

/* ─── Sous-composants typographiques pour les tutoriels ─── */

export function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-primary-700">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function HelpSteps({ children }: { children: React.ReactNode }) {
  return <ol className="ml-5 list-decimal space-y-1.5 marker:font-semibold marker:text-primary-700">{children}</ol>;
}

export function HelpTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-[12.5px] text-primary-800">
      💡 {children}
    </div>
  );
}

export function HelpWarn({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
      ⚠️ {children}
    </div>
  );
}

export function HelpKbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-line bg-surface-alt px-1.5 py-0.5 font-mono text-[11px] text-ink">{children}</kbd>;
}
