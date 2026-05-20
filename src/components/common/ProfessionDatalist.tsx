import { PROFESSION_SUGGESTIONS } from "@/lib/professions";

export const PROFESSION_DATALIST_ID = "profession-suggestions";

/**
 * `<datalist>` partagé de métiers (tous secteurs). À utiliser avec un
 * `<input list={PROFESSION_DATALIST_ID}>` : suggestions + saisie libre, pour
 * que tout candidat (quel que soit son métier) puisse renseigner son poste.
 */
export function ProfessionDatalist() {
  return (
    <datalist id={PROFESSION_DATALIST_ID}>
      {PROFESSION_SUGGESTIONS.map((job) => (
        <option key={job} value={job} />
      ))}
    </datalist>
  );
}
