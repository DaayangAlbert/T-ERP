/**
 * Algo de matching candidat ↔ JobOffer (CAND fn 1.5).
 *
 * Score 0-100 pondéré sur 5 critères :
 *   - 40% skills overlap (% des compétences attendues présentes dans le profil)
 *   - 25% expérience (années cumulées >= experienceMin attendu)
 *   - 15% location match (desiredLocation == offer.region — fuzzy)
 *   - 10% contract type match (desiredContractType == offer.contractType)
 *   - 10% salary overlap (desiredSalaryMin..Max ∩ offer.salaryMin..Max)
 *
 * Renvoie aussi matchedSkills (intersection) et missingRequirements (manques
 * affichés à l'utilisateur).
 */

interface CandidateInputs {
  skills: string[];
  experienceYears: number;
  desiredLocation: string | null;
  desiredContractType: string | null;
  desiredSalaryMin: bigint | number | null;
  desiredSalaryMax: bigint | number | null;
}

interface OfferInputs {
  title: string;
  region: string | null;
  contractType: string;
  category: string | null;
  description: string;
  requirements: string;
  salaryMin: bigint | number | null;
  salaryMax: bigint | number | null;
}

export interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingRequirements: string[];
  breakdown: {
    skills: number;
    experience: number;
    location: number;
    contract: number;
    salary: number;
  };
}

function toNum(v: bigint | number | null): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === "bigint" ? Number(v) : v;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Extrait des "tokens compétences" depuis la description et les exigences. */
function extractOfferSkills(offer: OfferInputs): string[] {
  const text = `${offer.title} ${offer.description} ${offer.requirements}`;
  const tokens = text
    .toLowerCase()
    .split(/[\s,;.()\/-]+/)
    .filter((t) => t.length >= 4);
  return Array.from(new Set(tokens));
}

function skillsScore(candidate: CandidateInputs, offer: OfferInputs): {
  score: number;
  matched: string[];
  missing: string[];
} {
  const candSkillsNorm = candidate.skills.map(normalize);
  const offerTokens = extractOfferSkills(offer);
  const matched = candidate.skills.filter((s) =>
    offerTokens.some((t) => t.includes(normalize(s)) || normalize(s).includes(t)),
  );
  // Heuristique : on attend ~5 "concepts clés" par offre.
  const ratio = Math.min(1, matched.length / 5);
  const missing: string[] = [];
  // Détection manques : mots fréquents dans les requirements absents du profil
  const requirementsLower = offer.requirements.toLowerCase();
  const KEY_TERMS = [
    "autocad",
    "ms project",
    "syscohada",
    "anglais",
    "permis",
    "encadrement",
    "btp",
    "génie civil",
  ];
  for (const term of KEY_TERMS) {
    if (
      requirementsLower.includes(term) &&
      !candSkillsNorm.some((s) => s.includes(normalize(term)))
    ) {
      missing.push(term);
    }
  }
  return { score: ratio * 40, matched: matched.slice(0, 6), missing: missing.slice(0, 3) };
}

function experienceScore(candidate: CandidateInputs, offer: OfferInputs): number {
  // Si l'offre demande "X ans" dans requirements
  const m = offer.requirements.match(/(\d+)\s*(?:ans?|annees?|years?)/i);
  if (!m) return 25 * 0.8; // 80% par défaut si pas spécifié
  const required = parseInt(m[1], 10);
  if (candidate.experienceYears >= required) return 25;
  if (candidate.experienceYears === 0) return 0;
  return Math.round((candidate.experienceYears / required) * 25);
}

function locationScore(candidate: CandidateInputs, offer: OfferInputs): number {
  if (!candidate.desiredLocation || !offer.region) return 15 * 0.5;
  const a = normalize(candidate.desiredLocation);
  const b = normalize(offer.region);
  if (a === b) return 15;
  if (a.includes(b) || b.includes(a)) return 15 * 0.7;
  return 0;
}

function contractScore(candidate: CandidateInputs, offer: OfferInputs): number {
  if (!candidate.desiredContractType) return 10 * 0.5;
  if (candidate.desiredContractType === offer.contractType) return 10;
  return 0;
}

function salaryScore(candidate: CandidateInputs, offer: OfferInputs): number {
  const cMin = toNum(candidate.desiredSalaryMin);
  const cMax = toNum(candidate.desiredSalaryMax);
  const oMin = toNum(offer.salaryMin);
  const oMax = toNum(offer.salaryMax);
  if (cMin === null && cMax === null) return 10 * 0.5;
  if (oMin === null && oMax === null) return 10 * 0.5;
  const candidateMin = cMin ?? 0;
  const candidateMax = cMax ?? Number.MAX_SAFE_INTEGER;
  const offerMin = oMin ?? 0;
  const offerMax = oMax ?? Number.MAX_SAFE_INTEGER;
  // Chevauchement strict
  if (offerMax < candidateMin || offerMin > candidateMax) return 0;
  return 10;
}

export function computeMatch(
  candidate: CandidateInputs,
  offer: OfferInputs,
): MatchResult {
  const skills = skillsScore(candidate, offer);
  const exp = experienceScore(candidate, offer);
  const loc = locationScore(candidate, offer);
  const con = contractScore(candidate, offer);
  const sal = salaryScore(candidate, offer);
  const total = Math.round(skills.score + exp + loc + con + sal);
  return {
    score: Math.max(0, Math.min(100, total)),
    matchedSkills: skills.matched,
    missingRequirements: skills.missing,
    breakdown: {
      skills: Math.round(skills.score),
      experience: Math.round(exp),
      location: Math.round(loc),
      contract: Math.round(con),
      salary: Math.round(sal),
    },
  };
}
