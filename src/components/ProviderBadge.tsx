import { PROVIDER_LABEL, type Provider } from "@/lib/types";

export function ProviderDot({ p, className = "" }: { p: Provider; className?: string }) {
  return (
    <span
      className={`inline-block size-2.5 rounded-full ${p === "claude" ? "bg-claude" : "bg-gemini"} ${className}`}
      aria-hidden
    />
  );
}

export function ProviderBadge({ p }: { p: Provider }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${p === "claude" ? "text-claude" : "text-gemini"}`}>
      <ProviderDot p={p} />
      {PROVIDER_LABEL[p]}
    </span>
  );
}
