"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastMessage = {
  id: number;
  message: string;
  action?: { label: string; onAction: () => void };
  /** ms, default 2200 (5000 with an action) */
  duration?: number;
};

/** Holds a single transient HUD message. */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((t: Omit<ToastMessage, "id">) => {
    if (timer.current) clearTimeout(timer.current);
    seq.current += 1;
    setToast({ ...t, id: seq.current });
    timer.current = setTimeout(() => setToast(null), t.duration ?? (t.action ? 5000 : 2200));
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { toast, show, dismiss };
}

/** macOS-like HUD pill, bottom centre. */
export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {toast && (
        <div
          key={toast.id}
          className="fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 animate-hud-in items-center gap-3 rounded-full bg-hud py-2.5 pl-5 pr-2.5 text-[14px] font-medium text-hud-text shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl"
        >
          <span className="truncate">{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onAction();
                onDismiss();
              }}
              className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-white/25 active:scale-[0.96]"
            >
              {toast.action.label}
            </button>
          ) : (
            <span className="w-2.5" />
          )}
        </div>
      )}
    </div>
  );
}
