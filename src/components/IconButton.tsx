import type { ButtonHTMLAttributes, ReactNode } from "react";

export function IconButton({
  label,
  children,
  active,
  className = "",
  showLabel,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode; active?: boolean; showLabel?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted transition hover:bg-panel-2 hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent ${className}`}
      {...rest}
    >
      {children}
      {showLabel && <span>{label}</span>}
    </button>
  );
}
