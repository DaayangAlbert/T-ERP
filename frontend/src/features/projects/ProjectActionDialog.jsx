import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/cn";

export function ProjectActionDialog({
  triggerLabel,
  triggerId,
  title,
  description,
  closeLabel,
  children,
  compact = true,
  disabled = false,
  triggerClassName,
  dialogClassName,
  triggerContent,
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);
  const dialogNode = open ? (
    <div className="pointer-events-none fixed inset-0 z-50 px-3 py-4 sm:px-6 sm:py-8">
      <div className="flex h-full items-center justify-center">
        <div
          role="dialog"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            "pointer-events-auto relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_90px_-35px_rgba(15,23,42,0.7)] sm:max-h-[calc(100dvh-4rem)] sm:p-6",
            dialogClassName
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p id={titleId} className="text-lg font-semibold text-slate-950">
                {title}
              </p>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-slate-600">
                  {description}
                </p>
              ) : null}
            </div>
            <Button type="button" variant="ghost" className="shrink-0 rounded-full p-2 text-slate-500 hover:text-slate-900" onClick={close}>
              <X className="h-5 w-5" />
              <span className="sr-only">{closeLabel}</span>
            </Button>
          </div>
          <div className="pt-5">{typeof children === "function" ? children({ close }) : children}</div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {!open ? (
        <Button
          type="button"
          id={triggerId}
          aria-label={triggerLabel}
          title={triggerLabel}
          className={cn(compact ? "h-9 w-9 rounded-lg px-0 py-0 text-lg leading-none" : undefined, triggerClassName)}
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          {compact ? (triggerContent ?? <span aria-hidden="true">+</span>) : (triggerContent ?? triggerLabel)}
        </Button>
      ) : null}
      {dialogNode && typeof document !== "undefined" ? createPortal(dialogNode, document.body) : null}
    </>
  );
}
