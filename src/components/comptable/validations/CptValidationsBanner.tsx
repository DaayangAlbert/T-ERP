import { Shield } from "lucide-react";

interface Props {
  isDirection: boolean;
  siteCount?: number;
}

export function CptValidationsBanner({ isDirection, siteCount }: Props) {
  return (
    <section className="flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 p-3 text-[12.5px] text-primary-700">
      <Shield className="h-4 w-4" />
      <strong>
        {isDirection
          ? "Validations N1 comptables · vue globale"
          : `Validations N1 comptables · ${siteCount ?? 0} chantier${(siteCount ?? 0) > 1 ? "s" : ""}`}
      </strong>
    </section>
  );
}
