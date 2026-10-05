"use client";

import { memo } from "react";
import { rangeMinutes, type RangeStatus, type TimeRange } from "@/lib/time";
import { formatDurationShort } from "@/lib/display";
import { Switch } from "./Switch";
import { AlertIcon, XmarkIcon } from "./icons";

type RangeRowProps = {
  index: number;
  range: TimeRange;
  status: RangeStatus;
  minutes: number;
  onChange: (id: string, patch: Partial<TimeRange>) => void;
  onClear: (id: string) => void;
};

function StatusText({
  range,
  status,
  minutes,
}: Pick<RangeRowProps, "range" | "status" | "minutes">) {
  switch (status) {
    case "ok":
      return (
        <span key={minutes} className="inline-block animate-num-in font-medium text-label">
          {formatDurationShort(minutes)}
        </span>
      );
    case "reversed":
      return (
        <span className="inline-flex items-center gap-1 text-danger">
          <AlertIcon size={14} />
          Koniec przed początkiem
        </span>
      );
    case "incomplete":
      return (
        <span className="text-tertiary">
          {range.start ? "Uzupełnij koniec" : "Uzupełnij początek"}
        </span>
      );
    case "inactive": {
      const would = rangeMinutes({ ...range, active: true });
      return (
        <span className="text-tertiary">
          Nie wliczany
          {would.status === "ok" && (
            <span className="hidden sm:inline"> · {formatDurationShort(would.minutes)}</span>
          )}
        </span>
      );
    }
    default:
      return <span className="text-tertiary">Pusty</span>;
  }
}

function DateTimeField({
  id,
  label,
  value,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className={`flex min-w-0 items-center rounded-[10px] bg-field transition-[background-color,box-shadow] duration-150 focus-within:shadow-[0_0_0_3px_var(--focus)] hover:bg-field-hover ${
        invalid ? "shadow-[inset_0_0_0_1px_var(--danger)]" : ""
      }`}
    >
      <label htmlFor={id} className="w-[72px] shrink-0 select-none pl-3 text-[13px] text-secondary">
        {label}
      </label>
      <input
        id={id}
        type="datetime-local"
        value={value}
        max="9999-12-31T23:59"
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className="field min-w-0 flex-1 bg-transparent pl-1 text-[15px] shadow-none hover:bg-transparent focus-visible:shadow-none"
      />
    </div>
  );
}

export const RangeRow = memo(function RangeRow({
  index,
  range,
  status,
  minutes,
  onChange,
  onClear,
}: RangeRowProps) {
  const n = index + 1;
  const hasValues = range.start !== "" || range.end !== "";
  const reversed = status === "reversed";

  return (
    <div className="px-4 py-4 sm:px-5" role="group" aria-labelledby={`${range.id}-title`}>
      <div className="flex min-h-[28px] items-center gap-3">
        <h3
          id={`${range.id}-title`}
          className={`shrink-0 text-[15px] font-semibold tracking-[-0.01em] transition-colors ${
            range.active ? "text-label" : "text-tertiary"
          }`}
        >
          Przedział {n}
        </h3>
        <p className="min-w-0 flex-1 truncate text-right text-[13px] tabular-nums">
          <StatusText range={range} status={status} minutes={minutes} />
        </p>
        <button
          type="button"
          onClick={() => onClear(range.id)}
          aria-label={`Wyczyść przedział ${n}`}
          title="Wyczyść"
          tabIndex={hasValues ? 0 : -1}
          aria-hidden={!hasValues || undefined}
          className={`inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-field text-secondary transition-[opacity,transform,background-color,color] duration-200 hover:bg-field-hover hover:text-label active:scale-90 ${
            hasValues ? "opacity-100" : "pointer-events-none scale-75 opacity-0"
          }`}
        >
          <XmarkIcon size={12} strokeWidth={2.25} />
        </button>
        <Switch
          checked={range.active}
          onChange={(active) => onChange(range.id, { active })}
          label={`Przedział ${n} aktywny`}
        />
      </div>
      <div
        className={`mt-3 grid grid-cols-1 gap-2 transition-opacity duration-200 sm:grid-cols-2 ${
          range.active ? "" : "opacity-50"
        }`}
      >
        <DateTimeField
          id={`${range.id}-start`}
          label="Początek"
          value={range.start}
          onChange={(start) => onChange(range.id, { start })}
        />
        <DateTimeField
          id={`${range.id}-end`}
          label="Koniec"
          value={range.end}
          invalid={reversed}
          onChange={(end) => onChange(range.id, { end })}
        />
      </div>
    </div>
  );
});
