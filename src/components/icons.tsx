import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** doc.on.doc */
export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="8.5" y="8.5" width="11" height="12" rx="2.5" />
      <path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H7A2.5 2.5 0 0 0 4.5 6v8A2.5 2.5 0 0 0 7 16.5h1.5" />
    </Svg>
  );
}

/** checkmark */
export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

/** xmark */
export function XmarkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 7l10 10M17 7L7 17" />
    </Svg>
  );
}

/** plus */
export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

/** chevron.up.chevron.down */
export function ChevronUpDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 9.5l4-4 4 4M8 14.5l4 4 4-4" />
    </Svg>
  );
}

/** arrow.clockwise */
export function RefreshIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </Svg>
  );
}

/** arrow.uturn.backward */
export function UndoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 14L4.5 9.5 9 5" />
      <path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" />
    </Svg>
  );
}

/** exclamationmark.circle */
export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.75v5" />
      <path d="M12 16.1v.1" strokeWidth={2.25} />
    </Svg>
  );
}

/** Apple-style activity indicator (8 fading spokes). */
export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`spinner relative inline-block ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-0 rounded-full bg-current"
          style={{
            width: Math.max(1.5, size * 0.11),
            height: size * 0.28,
            marginLeft: -Math.max(1.5, size * 0.11) / 2,
            transformOrigin: `50% ${size / 2}px`,
            transform: `rotate(${i * 45}deg)`,
            animationDelay: `${-((8 - i) * 100)}ms`,
          }}
        />
      ))}
    </span>
  );
}
