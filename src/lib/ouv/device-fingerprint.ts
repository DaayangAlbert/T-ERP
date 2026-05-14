"use client";

/**
 * Empreinte d'appareil légère et stable, sans dépendance externe.
 *
 * Combine User-Agent, langue, fuseau, résolution écran, ratio pixel et un
 * hash canvas (rendu d'une petite scène — connu pour produire des
 * empreintes stables et discriminantes même sans cookie). On hashe ensuite
 * en SHA-256 puis on tronque sur 16 hex chars.
 *
 * Persiste dans localStorage pour stabilité inter-sessions. Le serveur
 * lie l'empreinte à User.deviceFingerprints (max 3 enrôlés). Si l'ouvrier
 * tente un 4e appareil, l'API renvoie 403 + alerte WhatsApp au CC.
 *
 * Note : pas de "anti-VM detection" ni de fingerprint avancé. Pour fn 1.2
 * c'est suffisant pour détecter les changements d'appareil grossiers.
 * Un upgrade vers FingerprintJS sera proposé en V2 si fraude observée.
 */

const STORAGE_KEY = "terp-ouv-device-id";

export async function getOrCreateDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "ssr";
  const cached = window.localStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  const components = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${window.screen.width}x${window.screen.height}`,
    String(window.devicePixelRatio ?? 1),
    canvasFingerprint(),
  ].join("|");

  const hash = await sha256Hex(components);
  const truncated = hash.slice(0, 24);
  window.localStorage.setItem(STORAGE_KEY, truncated);
  return truncated;
}

function canvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-ctx";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#A855F7";
    ctx.fillRect(0, 0, 60, 30);
    ctx.fillStyle = "#0F0014";
    ctx.fillText("T-ERP OUV 🚧", 4, 12);
    ctx.strokeStyle = "rgba(168,85,247,0.4)";
    ctx.beginPath();
    ctx.arc(120, 30, 20, 0, Math.PI * 2);
    ctx.stroke();
    return canvas.toDataURL().slice(-100);
  } catch {
    return "no-canvas";
  }
}

async function sha256Hex(input: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // Fallback non cryptographique pour environnements sans subtle.crypto
    let h = 0;
    for (let i = 0; i < input.length; i++) h = ((h << 5) - h + input.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(8, "0").repeat(4);
  }
}
