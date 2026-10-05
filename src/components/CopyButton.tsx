"use client";

import { useClipboard } from "@/hooks/useClipboard";
import { CheckIcon, CopyIcon } from "./icons";

type CopyButtonProps = {
  value: string;
  /** Accessible name, e.g. "Kopiuj łączną liczbę dni" */
  label: string;
  disabled?: boolean;
  className?: string;
};

/** Small icon button that copies a plain value and briefly shows a checkmark. */
export function CopyButton({ value, label, disabled, className = "" }: CopyButtonProps) {
  const { copy, copied } = useClipboard();

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => void copy(value)}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-[0.92] disabled:pointer-events-none disabled:opacity-30 ${
          copied ? "text-success" : "text-secondary hover:bg-field hover:text-accent"
        }`}
      >
        {copied ? <CheckIcon size={16} className="animate-fade-in" /> : <CopyIcon size={16} />}
      </button>
      <span
        aria-live="polite"
        className={`pointer-events-none absolute bottom-full right-0 mb-1 whitespace-nowrap rounded-md bg-hud px-2 py-1 text-[11px] font-medium text-hud-text transition-[opacity,transform] duration-200 ${
          copied ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        {copied ? "Skopiowano" : ""}
      </span>
    </span>
  );
}
