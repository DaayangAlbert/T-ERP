"use client";

interface Props {
  chiefFullName: string;
  whatsappUrl: string;
}

// Bouton vert WhatsApp 56px-68px pour contacter le Chef Chantier.
// Deep link wa.me/<phone> : ouvre WhatsApp natif sur Android avec le numéro
// pré-rempli. Si l'app n'est pas installée, fallback navigateur WhatsApp Web.
export function OuvWhatsAppButton({ chiefFullName, whatsappUrl }: Props) {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-3.5 flex h-[68px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-4 text-[18px] font-bold text-white shadow-[0_4px_12px_rgba(37,211,102,0.3)] transition active:scale-[0.98]"
    >
      <WhatsAppIcon className="h-[26px] w-[26px]" />
      Contacter {chiefFullName}
    </a>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91s-4.45-9.91-9.91-9.91M12.04 20.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.83c.02 4.54-3.68 8.23-8.22 8.23M16.56 14.45c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.21-.49-.42-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.76 2.67 4.27 3.74.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.3z" />
    </svg>
  );
}
