"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(true);
    setProgress(20);
    requestAnimationFrame(() => setProgress(85));
    timer.current = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 220);
    }, 320);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pathname, search]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] h-0.5 w-full"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease" }}
    >
      <div
        className="h-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"
        style={{
          width: `${progress}%`,
          transition: "width 280ms cubic-bezier(.2,.8,.2,1)",
          boxShadow: "0 0 8px rgba(168,85,247,.6)",
        }}
      />
    </div>
  );
}
