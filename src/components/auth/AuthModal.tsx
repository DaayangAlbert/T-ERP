"use client";

import { useEffect, useState } from "react";
import { X, User, Building2 } from "lucide-react";
import { clsx } from "clsx";
import { LoginForm } from "./LoginForm";
import { RegisterCandidateForm } from "./RegisterCandidateForm";
import { RegisterCompanyForm } from "./RegisterCompanyForm";

export type AuthTab = "login" | "signup";
export type SignupPick = "candidate" | "company";

interface Props {
  open: boolean;
  defaultTab?: AuthTab;
  defaultPick?: SignupPick;
  onClose: () => void;
}

export function AuthModal({ open, defaultTab = "login", defaultPick = "candidate", onClose }: Props) {
  const [tab, setTab] = useState<AuthTab>(defaultTab);
  const [pick, setPick] = useState<SignupPick>(defaultPick);

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setPick(defaultPick);
    }
  }, [open, defaultTab, defaultPick]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const title = tab === "login" ? "Se connecter" : "Créer un compte";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-[500px] animate-modal-slide-up overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ background: "linear-gradient(135deg,#2A1B3D 0%,#7E22CE 100%)" }}
        >
          <h3 id="auth-modal-title" className="text-base font-semibold">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-surface-alt p-1">
            <TabButton active={tab === "login"} onClick={() => setTab("login")}>
              Connexion
            </TabButton>
            <TabButton active={tab === "signup"} onClick={() => setTab("signup")}>
              Inscription
            </TabButton>
          </div>

          {tab === "login" ? (
            <LoginForm onSuccess={onClose} />
          ) : (
            <>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                Je suis :
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <PickCard
                  active={pick === "candidate"}
                  onClick={() => setPick("candidate")}
                  icon={<User className="h-5 w-5 text-primary-600" />}
                  title="Chercheur d'emploi"
                  desc="Je cherche une mission BTP"
                />
                <PickCard
                  active={pick === "company"}
                  onClick={() => setPick("company")}
                  icon={<Building2 className="h-5 w-5 text-primary-600" />}
                  title="Informaticien d'entreprise"
                  desc={"Inscrire mon entreprise\n(droits admin du tenant)"}
                />
              </div>

              {pick === "candidate" ? (
                <RegisterCandidateForm onSuccess={onClose} />
              ) : (
                <RegisterCompanyForm onSuccess={onClose} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded text-[12.5px] font-medium transition",
        "h-8",
        active
          ? "bg-white text-ink shadow-card"
          : "bg-transparent text-ink-3 hover:text-ink-2"
      )}
    >
      {children}
    </button>
  );
}

function PickCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex flex-col items-start rounded-lg border p-3 text-left transition",
        active
          ? "border-primary-500 bg-primary-50 ring-1 ring-primary-200"
          : "border-line bg-white hover:border-primary-300"
      )}
    >
      <div className="mb-1.5">{icon}</div>
      <div className="text-[13px] font-semibold text-ink">{title}</div>
      <div className="whitespace-pre-line text-[11px] text-ink-3">{desc}</div>
    </button>
  );
}
