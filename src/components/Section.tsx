import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  title: string;
  /** Optional element on the right side of the header (e.g. a count) */
  accessory?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Grouped "inset list" card in the style of iOS / macOS Settings. */
export function Section({ id, title, accessory, footer, children, className = "" }: SectionProps) {
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3 px-4">
        <h2 id={id} className="text-[13px] font-medium tracking-[-0.005em] text-secondary">
          {title}
        </h2>
        {accessory}
      </div>
      <div className="rounded-[20px] bg-surface shadow-card">{children}</div>
      {footer && (
        <div className="mt-2 space-y-0.5 px-4 text-[12px] leading-[1.45] text-secondary">
          {footer}
        </div>
      )}
    </section>
  );
}

/** Hairline separator inset from the left, like UITableView. */
export function Separator({ className = "ml-4 sm:ml-5" }: { className?: string }) {
  return <div aria-hidden="true" className={`h-px bg-separator ${className}`} />;
}

/** Label-on-the-left, control-on-the-right list row. */
export function Row({
  label,
  htmlFor,
  children,
  className = "",
}: {
  label: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-[52px] items-center justify-between gap-4 px-4 py-2 sm:px-5 ${className}`}
    >
      {htmlFor ? (
        <label htmlFor={htmlFor} className="shrink-0 text-[15px] text-label">
          {label}
        </label>
      ) : (
        <span className="shrink-0 text-[15px] text-label">{label}</span>
      )}
      <div className="flex min-w-0 items-center justify-end gap-2">{children}</div>
    </div>
  );
}
