import { PersonnelCoutsPanel } from "@/components/daf/hr/PersonnelCoutsPanel";

/**
 * Vue DG du module "Personnel & coûts salariaux" — réplique de la vue
 * DAF (/direction-financiere/rh, onglet Personnel & coûts), accessible
 * via la sidebar Espace DG. Le DG a access READ sur DAF (matrice RBAC)
 * donc l'API /api/daf/personnel-couts l'autorise nativement.
 */
export default function DgPersonnelPage() {
  return (
    <>
      <header className="mb-4 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Personnel & coûts salariaux
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Vue consolidée de l'effectif du groupe avec ventilation des coûts
          salariaux entre frais de structure (direction) et coûts directs
          imputables aux marchés (chantier).
        </p>
      </header>

      <PersonnelCoutsPanel />
    </>
  );
}
