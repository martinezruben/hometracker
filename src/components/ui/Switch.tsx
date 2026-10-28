"use client";

/** Interruptor accesible (role="switch"). */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-brand" : "bg-border"}`}
    >
      <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${checked ? "left-[24px]" : "left-1"}`} />
    </button>
  );
}
