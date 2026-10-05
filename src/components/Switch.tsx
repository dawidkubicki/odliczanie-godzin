"use client";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
  disabled?: boolean;
};

/** iOS-style toggle. Renders a native button with role="switch". */
export function Switch({ checked, onChange, label, id, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group relative inline-flex h-[28px] w-[46px] shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors duration-200 ease-(--ease-apple) disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-success" : "bg-track-off"
      }`}
    >
      <span
        aria-hidden="true"
        className={`block h-[24px] w-[24px] rounded-full bg-thumb shadow-[0_2px_6px_rgba(0,0,0,0.16),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-[transform,width] duration-[240ms] ease-(--ease-spring) group-active:w-[28px] ${
          checked ? "translate-x-[18px] group-active:translate-x-[14px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}
