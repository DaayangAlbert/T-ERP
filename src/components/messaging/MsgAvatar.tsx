"use client";

import { useState } from "react";
import { clsx } from "clsx";

/**
 * Avatar de messagerie : affiche la photo de profil (`url`) si disponible,
 * sinon retombe sur les initiales colorées. Si l'image 404 (fichier non servi),
 * l'`onError` bascule automatiquement sur les initiales.
 */
export function MsgAvatar({
  url,
  initials,
  color,
  sizeClass = "h-10 w-10",
  textClass = "text-[12px]",
  square = false,
  ring,
}: {
  url?: string | null;
  initials: string;
  color: string;
  sizeClass?: string;
  textClass?: string;
  square?: boolean;
  ring?: string;
}) {
  const [errored, setErrored] = useState(false);
  const shape = square ? "rounded-md" : "rounded-full";

  if (url && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        onError={() => setErrored(true)}
        className={clsx(sizeClass, "flex-shrink-0 object-cover", shape, ring)}
      />
    );
  }

  return (
    <div
      className={clsx(
        sizeClass,
        textClass,
        "grid flex-shrink-0 place-items-center font-semibold text-white",
        shape,
        ring,
      )}
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}
