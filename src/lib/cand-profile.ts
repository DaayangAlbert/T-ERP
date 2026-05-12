interface ProfileSnapshot {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  dateOfBirth?: Date | null;
  address?: string | null;
  cvUrl?: string | null;
  desiredJob?: string | null;
  desiredLocation?: string | null;
  desiredSalaryMin?: bigint | null;
  candidateSkills?: string[] | null;
  candidateLanguages?: unknown;
  experiencesCount?: number;
  formationsCount?: number;
}

interface CompletionEntry {
  key: string;
  label: string;
  filled: boolean;
  weight: number;
}

function entries(p: ProfileSnapshot): CompletionEntry[] {
  return [
    { key: "firstName", label: "Prénom", filled: !!p.firstName, weight: 1 },
    { key: "lastName", label: "Nom", filled: !!p.lastName, weight: 1 },
    { key: "phone", label: "Téléphone", filled: !!p.phone, weight: 1 },
    {
      key: "dateOfBirth",
      label: "Date de naissance",
      filled: !!p.dateOfBirth,
      weight: 1,
    },
    { key: "address", label: "Adresse", filled: !!p.address, weight: 1 },
    {
      key: "desiredJob",
      label: "Poste recherché",
      filled: !!p.desiredJob,
      weight: 1,
    },
    {
      key: "desiredLocation",
      label: "Lieu souhaité",
      filled: !!p.desiredLocation,
      weight: 1,
    },
    {
      key: "desiredSalaryMin",
      label: "Salaire visé",
      filled: p.desiredSalaryMin !== null && p.desiredSalaryMin !== undefined,
      weight: 1,
    },
    {
      key: "skills",
      label: "Compétences",
      filled: (p.candidateSkills?.length ?? 0) >= 3,
      weight: 1,
    },
    {
      key: "languages",
      label: "Langues",
      filled: Array.isArray(p.candidateLanguages) && p.candidateLanguages.length > 0,
      weight: 1,
    },
    {
      key: "experiences",
      label: "Expériences",
      filled: (p.experiencesCount ?? 0) >= 1,
      weight: 1,
    },
    {
      key: "formations",
      label: "Formations",
      filled: (p.formationsCount ?? 0) >= 1,
      weight: 1,
    },
    { key: "cv", label: "CV PDF", filled: !!p.cvUrl, weight: 1 },
  ];
}

export function computeCandidateCompletion(snapshot: ProfileSnapshot): number {
  const list = entries(snapshot);
  const totalWeight = list.reduce((s, e) => s + e.weight, 0);
  const filledWeight = list
    .filter((e) => e.filled)
    .reduce((s, e) => s + e.weight, 0);
  return Math.round((filledWeight / totalWeight) * 100);
}

export interface ProfileCompletionDetail {
  pct: number;
  filledCount: number;
  totalCount: number;
  missing: { key: string; label: string }[];
}

export function computeCandidateCompletionDetail(
  snapshot: ProfileSnapshot,
): ProfileCompletionDetail {
  const list = entries(snapshot);
  const missing = list
    .filter((e) => !e.filled)
    .map((e) => ({ key: e.key, label: e.label }));
  return {
    pct: computeCandidateCompletion(snapshot),
    filledCount: list.length - missing.length,
    totalCount: list.length,
    missing,
  };
}
