"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Picker emoji léger sans dépendance externe.
 * Palette curée (~150 emojis répartis en 6 catégories) — couvre les usages
 * de messagerie pro : émotions, gestes, objets, drapeaux, technique BTP.
 */

const CATEGORIES = [
  {
    name: "Smileys",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩",
      "😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐",
      "😐","😑","😶","😏","😒","🙄","😬","😮","😯","😲","😳","🥺","😦","😧","😨","😰",
      "😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","🤬","😈","💀",
    ],
  },
  {
    name: "Gestes",
    emojis: [
      "👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋",
      "🤚","🖐️","🖖","👋","🤝","🙏","💪","🫡","🫶","👏","🙌","👐","🤲",
    ],
  },
  {
    name: "Cœurs & symboles",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖",
      "💘","💝","✅","❌","⭕","🚫","💯","💢","💥","💫","⭐","🌟","✨","⚡","🔥","🎉",
    ],
  },
  {
    name: "Travail & BTP",
    emojis: [
      "🏗️","🏢","🏠","🏭","🏘️","🚧","🦺","⛑️","🔨","⛏️","🪓","🛠️","⚙️","🔧","🪛","🧰",
      "🧱","🪜","📐","📏","🗜️","⚖️","🪤","⏰","📅","📆","📋","📌","📎","🖇️","📁","📂",
      "📊","📈","📉","💼","🗂️","📑","📄","📝","✏️","🖊️","🖋️","📓","📔","📒","📕","📗",
    ],
  },
  {
    name: "Communication",
    emojis: [
      "📞","☎️","📱","💻","🖥️","⌨️","🖱️","🖨️","📷","📹","🎥","📺","📡","🛰️","📧","📨",
      "📩","📤","📥","📮","✉️","💬","💭","🗨️","🗯️","💡","🔔","🔕","🔊","🔇","🎤","🎧",
    ],
  },
  {
    name: "Drapeau & divers",
    emojis: [
      "🇨🇲","🇫🇷","🇨🇩","🇨🇮","🇸🇳","🇲🇦","🇩🇿","🇹🇳","🌍","🌎","🌏","☀️","🌧️","⛈️","🌪️","☁️",
      "💧","🌊","☕","🍵","🥤","🍕","🍔","🥗","🍎","🍌","🍞","🎂","🚗","✈️","🚆","🚢",
    ],
  },
] as const;

interface Props {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onPick, onClose }: Props) {
  const [active, setActive] = useState<string>(CATEGORIES[0].name);
  const ref = useRef<HTMLDivElement>(null);

  // Ferme au clic externe
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    // Petit timeout pour ne pas capter le click qui a ouvert le picker
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const cat = CATEGORIES.find((c) => c.name === active) ?? CATEGORIES[0];

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-50 mb-2 w-[320px] rounded-xl border border-line bg-white shadow-xl"
      role="dialog"
      aria-label="Choisir un emoji"
    >
      <div className="flex gap-0.5 border-b border-line p-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setActive(c.name)}
            className={`flex-1 rounded-md px-1.5 py-1 text-[10.5px] font-medium transition ${
              active === c.name
                ? "bg-primary-50 text-primary-700"
                : "text-ink-3 hover:bg-surface-alt"
            }`}
            title={c.name}
          >
            {c.emojis[0]}
          </button>
        ))}
      </div>
      <div className="max-h-[220px] overflow-y-auto p-2">
        <div className="grid grid-cols-8 gap-0.5">
          {cat.emojis.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onPick(e)}
              className="grid h-8 w-8 place-items-center rounded text-[18px] leading-none hover:bg-surface-alt"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
