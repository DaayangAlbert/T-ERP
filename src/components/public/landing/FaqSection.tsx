"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "T-ERP est-il vraiment conforme SYSCOHADA et fiscalité camerounaise ?",
    a: "Oui. Plan comptable SYSCOHADA OHADA pré-paramétré, calcul automatique IRPP, CNPS (4,2% employé + 11,2% patron), TVA 19,25%, retenue à la source 2,2%, et déclarations DGI mensuelles/annuelles prêtes à l'emploi.",
  },
  {
    q: "Combien de temps prend la mise en route ?",
    a: "5 à 10 jours selon votre taille. Import de votre plan comptable, paramétrage des chantiers, formation 2 demi-journées en visio. Migration de votre paie existante incluse.",
  },
  {
    q: "Mes données sont-elles hébergées au Cameroun ?",
    a: "Oui, infrastructure principale au Cameroun (Yaoundé) avec réplication chiffrée. Conforme à la loi 2010/012 sur la protection des données personnelles.",
  },
  {
    q: "Puis-je résilier à tout moment ?",
    a: "Oui, aucun engagement de durée. Préavis 30 jours pour Essentiel/Pro. Export complet de vos données au format CSV/SQL avant départ.",
  },
  {
    q: "Mes ouvriers sans smartphone, comment font-ils ?",
    a: "Le pointage chef de chantier est multi-personnes : un seul appareil suffit pour pointer toute son équipe. Notifications WhatsApp pour les bulletins, accessibles depuis n'importe quel téléphone.",
  },
  {
    q: "Comment se passe la migration depuis Sage ou Excel ?",
    a: "Nous prenons en charge l'import : balance des comptes, fichier paie, fiches employés, chantiers en cours. 3 jours en moyenne pour une PME de 50 collaborateurs. Garantie de bascule en parallèle pendant 30 jours.",
  },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ink md:text-3xl">
            Questions fréquentes
          </h2>
          <p className="mt-2 text-sm text-ink-3">
            Tout ce que vous devez savoir avant de démarrer.
          </p>
        </div>
        <div className="mt-8 space-y-2">
          {FAQS.map((faq, idx) => {
            const open = openIdx === idx;
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-lg border border-line bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : idx)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-surface-alt"
                  aria-expanded={open}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 flex-shrink-0 transition-transform ${
                      open ? "rotate-180 text-primary" : "text-ink-3"
                    }`}
                  />
                </button>
                {open ? (
                  <div className="border-t border-line bg-surface-alt px-4 py-3 text-sm text-ink-2">
                    {faq.a}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
