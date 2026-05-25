"use client";

import { useState } from "react";
import { Send, MessageSquare, X, Check } from "lucide-react";

/**
 * Envoi d'un message in-app (notification) à un utilisateur depuis la
 * console plateforme.
 */
export function SendUserMessage({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 2) { setError("Objet requis"); return; }
    if (body.trim().length < 2) { setError("Message requis"); return; }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/platform-users/${userId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Erreur ${res.status}`);
      }
      setDone(true);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setDone(false); }}
        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/90 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-400"
      >
        <MessageSquare className="h-4 w-4" /> Envoyer un message
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-xl border p-5 text-white shadow-2xl"
            style={{ background: "#1E293B", borderColor: "#334155" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">Message à {userName}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-white/50 hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            {done ? (
              <div className="space-y-4 py-4 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
                  <Check className="h-6 w-6" />
                </div>
                <p className="text-sm text-white/80">Message envoyé. Il apparaîtra dans le centre de notifications de {userName}.</p>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15">Fermer</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <p className="text-[11px] text-white/50">
                  Le message arrive dans l&apos;espace de l&apos;utilisateur (cloche de notifications).
                </p>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-white/50">Objet</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Information importante"
                    className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm text-white placeholder:text-white/40"
                    style={{ borderColor: "#334155" }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-white/50">Message</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                    placeholder="Votre message…"
                    className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/40"
                    style={{ borderColor: "#334155" }}
                  />
                </div>
                {error && <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5">Annuler</button>
                  <button type="submit" disabled={sending} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-400 disabled:opacity-50">
                    <Send className="h-4 w-4" /> {sending ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
