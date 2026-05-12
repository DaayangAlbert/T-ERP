import { cookies } from "next/headers";
import { requireCandidateSession } from "@/lib/cand-session";
import { ProfileCompletionBar } from "@/components/cand/profil/ProfileCompletionBar";
import {
  IdentitySection,
  type IdentityData,
} from "@/components/cand/profil/IdentitySection";
import {
  SearchPreferencesSection,
  type SearchPrefsData,
} from "@/components/cand/profil/SearchPreferencesSection";
import {
  ExperiencesEditor,
  type ExperienceItem,
} from "@/components/cand/profil/ExperiencesEditor";
import {
  FormationsEditor,
  type FormationItem,
} from "@/components/cand/profil/FormationsEditor";
import { SkillsEditor } from "@/components/cand/profil/SkillsEditor";
import {
  LanguagesEditor,
  type LanguageItem,
} from "@/components/cand/profil/LanguagesEditor";
import { CvUploadDropzone } from "@/components/cand/profil/CvUploadDropzone";

export const dynamic = "force-dynamic";

interface ProfilePayload {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    dateOfBirth: string | null;
    address: string | null;
    position: string | null;
    cvUrl: string | null;
    desiredJob: string | null;
    desiredContractType: string | null;
    desiredLocation: string | null;
    desiredSalaryMin: number | null;
    desiredSalaryMax: number | null;
    availability: string | null;
    mobilityDailyTravel: boolean;
    mobilityMissions: boolean;
    mobilityExpatriation: boolean;
    candidateSkills: string[];
    candidateLanguages: unknown;
  };
  experiences: ExperienceItem[];
  formations: FormationItem[];
  completion: {
    pct: number;
    filledCount: number;
    totalCount: number;
    missing: { key: string; label: string }[];
  };
}

async function fetchProfile(): Promise<ProfilePayload> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/cand/profile`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) {
    throw new Error(`Profile API ${res.status}`);
  }
  return res.json();
}

function parseLanguages(raw: unknown): LanguageItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (l): l is LanguageItem =>
      typeof l === "object" &&
      l !== null &&
      "name" in l &&
      "level" in l &&
      ["natif", "courant", "intermediaire", "notions"].includes(
        (l as { level: string }).level,
      ),
  );
}

export default async function CandidateProfilPage() {
  requireCandidateSession();
  const data = await fetchProfile();

  const identity: IdentityData = {
    firstName: data.user.firstName,
    lastName: data.user.lastName,
    email: data.user.email,
    phone: data.user.phone,
    dateOfBirth: data.user.dateOfBirth,
    address: data.user.address,
    avatarInitials: `${data.user.firstName.charAt(0)}${data.user.lastName.charAt(0)}`.toUpperCase(),
  };

  const searchPrefs: SearchPrefsData = {
    desiredJob: data.user.desiredJob,
    desiredContractType: data.user.desiredContractType,
    desiredLocation: data.user.desiredLocation,
    desiredSalaryMin: data.user.desiredSalaryMin,
    desiredSalaryMax: data.user.desiredSalaryMax,
    availability: data.user.availability,
    mobilityDailyTravel: data.user.mobilityDailyTravel,
    mobilityMissions: data.user.mobilityMissions,
    mobilityExpatriation: data.user.mobilityExpatriation,
  };

  return (
    <div className="space-y-4">
      <ProfileCompletionBar
        pct={data.completion.pct}
        filledCount={data.completion.filledCount}
        totalCount={data.completion.totalCount}
        missing={data.completion.missing}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <IdentitySection initial={identity} />
        <SearchPreferencesSection initial={searchPrefs} />
        <ExperiencesEditor initialExperiences={data.experiences} />
        <FormationsEditor initialFormations={data.formations} />
        <SkillsEditor initialSkills={data.user.candidateSkills} />
        <LanguagesEditor initialLanguages={parseLanguages(data.user.candidateLanguages)} />
        <div className="lg:col-span-2">
          <CvUploadDropzone initialCvUrl={data.user.cvUrl} />
        </div>
      </div>
    </div>
  );
}
