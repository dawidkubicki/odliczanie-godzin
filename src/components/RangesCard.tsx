"use client";

import { Fragment } from "react";
import { MAX_RANGES, MIN_RANGES, type CalculationResult, type TimeRange } from "@/lib/time";
import { RangeRow } from "./RangeRow";
import { Section, Separator } from "./Section";
import { PlusIcon } from "./icons";

type RangesCardProps = {
  ranges: TimeRange[];
  result: CalculationResult;
  /** Ids of rows added in this session, animated in on mount */
  newIds: ReadonlySet<string>;
  onChange: (id: string, patch: Partial<TimeRange>) => void;
  onClear: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
};

export function RangesCard({
  ranges,
  result,
  newIds,
  onChange,
  onClear,
  onRemove,
  onAdd,
}: RangesCardProps) {
  const counted = result.countedRanges;
  const canRemove = ranges.length > MIN_RANGES;
  const canAdd = ranges.length < MAX_RANGES;

  return (
    <Section
      id="ranges-title"
      title="Przedziały czasu"
      accessory={
        <span className="text-[13px] tabular-nums text-secondary" aria-live="polite">
          Wliczane: {counted} z {ranges.length}
        </span>
      }
      footer={
        <>
          <p>
            Puste przedziały są pomijane. Wyłącz przełącznik, aby tymczasowo nie wliczać przedziału.
          </p>
          <p>
            Czas liczony jest według wskazań zegara — zmiana czasu letniego nie dodaje ani nie
            odejmuje godziny.
          </p>
        </>
      }
    >
      {ranges.map((r, i) => {
        const res = result.perRange[r.id] ?? { minutes: 0, status: "empty" as const };
        return (
          <Fragment key={r.id}>
            {i > 0 && <Separator />}
            <RangeRow
              index={i}
              range={r}
              status={res.status}
              minutes={res.minutes}
              canRemove={canRemove}
              isNew={newIds.has(r.id)}
              onChange={onChange}
              onClear={onClear}
              onRemove={onRemove}
            />
          </Fragment>
        );
      })}
      <Separator className="mx-0" />
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className="group flex min-h-[52px] w-full items-center gap-2.5 rounded-b-[20px] px-4 text-left text-[15px] font-medium text-accent transition-[background-color,opacity] duration-150 hover:bg-accent-soft active:bg-accent-soft disabled:cursor-default disabled:text-tertiary disabled:hover:bg-transparent sm:px-5"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent text-white transition-colors group-disabled:bg-field group-disabled:text-tertiary"
        >
          <PlusIcon size={14} strokeWidth={2.25} />
        </span>
        {canAdd ? "Dodaj przedział" : `Osiągnięto limit ${MAX_RANGES} przedziałów`}
      </button>
    </Section>
  );
}
