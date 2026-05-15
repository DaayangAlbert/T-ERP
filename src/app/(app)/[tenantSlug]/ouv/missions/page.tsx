"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useOuvDashboard } from "@/hooks/useOuvDashboard";
import {
  useMissions,
  useAcceptMission,
  useRaiseQuestions,
  useUpdateMissionProgress,
  type MissionItem,
} from "@/hooks/useOuvMissions";

import { ActiveMissionCard } from "@/components/ouv/missions/ActiveMissionCard";
import { NewMissionCard } from "@/components/ouv/missions/NewMissionCard";
import { CompletedMissionsList } from "@/components/ouv/missions/CompletedMissionsList";
import { MissionQuestionsModal } from "@/components/ouv/missions/MissionQuestionsModal";
import { MissionProgressUpdater } from "@/components/ouv/missions/MissionProgressUpdater";

// Page mirror screen-ouv-missions :
//  1. Section "📍 Mission en cours" (border violet 2px + progress bar + consigne)
//  2. Section "📬 Nouvelles missions" (border amber + boutons Accepter/Questions)
//  3. Section "Missions terminées" (liste compacte)
//
// Au tap sur la card active → ouvre MissionProgressUpdater (slider 0-100%).
// Au tap "Questions" sur une nouvelle → ouvre MissionQuestionsModal.
// Le clic "Accepter" appelle directement /accept (sans modal).
export default function OuvMissionsPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const dashboard = useOuvDashboard();
  const missions = useMissions();
  const acceptMut = useAcceptMission();
  const raiseQuestionsMut = useRaiseQuestions();
  const progressMut = useUpdateMissionProgress();

  const [questionsMission, setQuestionsMission] = useState<MissionItem | null>(null);
  const [progressMission, setProgressMission] = useState<MissionItem | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const initials = dashboard.data?.user.initials ?? "??";

  async function handleAccept(id: string) {
    setFeedback(null);
    try {
      const res = await acceptMut.mutateAsync({ id });
      setFeedback({ tone: "success", message: res.message });
    } catch (err: any) {
      setFeedback({ tone: "error", message: err?.message ?? "Acceptation refusée" });
    }
  }

  async function handleQuestions(id: string, questions: string) {
    await raiseQuestionsMut.mutateAsync({ id, questions });
  }

  async function handleProgress(id: string, percent: number, photo?: string, note?: string) {
    const res = await progressMut.mutateAsync({ id, percent, photo, note });
    return { completedAt: res.completedAt };
  }

  return (
    <>
      <header className="flex items-center gap-3 bg-[#2A1B3D] px-4 py-3 text-white">
        <Link
          href={`/${tenantSlug}/ouv/dashboard`}
          aria-label="Retour"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-[17px] font-bold leading-tight">Mes missions</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-purple-500 text-[13px] font-bold">
          {initials}
        </span>
      </header>

      <main className="page mx-auto w-full max-w-screen-md px-3 pt-3.5">
        {feedback && (
          <div
            className={`mb-3.5 rounded-xl px-4 py-3 text-[14px] font-semibold ${
              feedback.tone === "success"
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
            }`}
            role="status"
          >
            {feedback.message}
          </div>
        )}

        {missions.isLoading ? (
          <PageSkeleton />
        ) : (
          <>
            {missions.data?.active && (
              <>
                <h3 className="mb-2.5 mt-1 text-[16px] font-bold text-slate-900">
                  📍 Mission en cours
                </h3>
                <ActiveMissionCard
                  mission={missions.data.active}
                  onOpenProgress={(m) => setProgressMission(m)}
                />
              </>
            )}

            {missions.data?.pending && missions.data.pending.length > 0 && (
              <>
                <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">📬 Nouvelles missions</h3>
                {missions.data.pending.map((m) => (
                  <NewMissionCard
                    key={m.id}
                    mission={m}
                    onAccept={handleAccept}
                    onAskQuestions={(mission) => setQuestionsMission(mission)}
                    accepting={acceptMut.isPending}
                  />
                ))}
              </>
            )}

            {missions.data?.active == null &&
              (!missions.data?.pending || missions.data.pending.length === 0) &&
              (!missions.data?.history || missions.data.history.length === 0) && (
                <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 text-center">
                  <p className="text-[15px] font-semibold text-slate-700">
                    Aucune mission affectée pour le moment
                  </p>
                  <p className="mt-1 text-[12.5px] text-slate-500">
                    Ton chef de chantier (Jean KAMGA) t'enverra une notification dès qu'une mission t'est attribuée.
                  </p>
                </div>
              )}

            <CompletedMissionsList history={missions.data?.history ?? []} />
          </>
        )}
      </main>

      <MissionQuestionsModal
        isOpen={questionsMission != null}
        mission={questionsMission}
        onClose={() => setQuestionsMission(null)}
        onSubmit={handleQuestions}
      />

      <MissionProgressUpdater
        isOpen={progressMission != null}
        mission={progressMission}
        onClose={() => setProgressMission(null)}
        onSubmit={handleProgress}
      />
    </>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-3.5">
      <div className="h-[200px] animate-pulse rounded-2xl bg-white" />
      <div className="h-[180px] animate-pulse rounded-2xl bg-white" />
      <div className="h-[180px] animate-pulse rounded-2xl bg-white" />
    </div>
  );
}
