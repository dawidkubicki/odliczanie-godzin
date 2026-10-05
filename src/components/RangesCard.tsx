"use client";

import { Fragment } from "react";
import type { CalculationResult, TimeRange } from "@/lib/time";
import { RangeRow } from "./RangeRow";
import { Section, Separator } from "./Section";

type RangesCardProps = {
  ranges: TimeRange[];
  result: CalculationResult;
  onChange: (id: string, patch: Partial<TimeRange>) => void;
  onClear: (id: string) => void;
};

export function RangesCard({ ranges, result, onChange, onClear }: RangesCardProps) {
  const counted = result.countedRanges;

  return (
    <Section
      id="ranges-title"
      title="Przedziały czasu"
      accessory={
        <span className="text-[13px] tabular-nums text-secondary">
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
              onChange={onChange}
              onClear={onClear}
            />
          </Fragment>
        );
      })}
    </Section>
  );
}
