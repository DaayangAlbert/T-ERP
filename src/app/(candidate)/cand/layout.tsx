import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCandidateSession } from "@/lib/cand-session";
import { computeCandidateCompletion } from "@/lib/cand-profile";
import { CandidateShell } from "@/components/cand/layout/CandidateShell";

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = requireCandidateSession();

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      position: true,
      dateOfBirth: true,
      address: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status !== "ACTIVE" || user.role !== "CANDIDATE") {
    redirect("/cand/login");
  }

  const completionPct = computeCandidateCompletion(user);
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <CandidateShell
      fullName={fullName}
      email={user.email}
      initials={initials}
      completionPct={completionPct}
      tenantName="BatimCAM SA"
    >
      {children}
    </CandidateShell>
  );
}
