"use client";

interface Props {
  whatsappUrl: string;
  label?: string;
  size?: "sm" | "md";
}

// Bouton vert WhatsApp réutilisable (deep link wa.me).
export function WhatsAppDeepLink({ whatsappUrl, label = "WhatsApp", size = "md" }: Props) {
  const heightCls = size === "sm" ? "min-h-[44px] text-[13px]" : "min-h-[56px] text-[14px]";
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 font-bold text-white shadow active:scale-[0.98] ${heightCls}`}
    >
      <WhatsAppIcon className="h-5 w-5" />
      {label}
    </a>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91s-4.45-9.91-9.91-9.91z" />
    </svg>
  );
}
