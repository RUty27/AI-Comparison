"use client";

import { PROVIDER_LABEL } from "@/lib/types";
import type { Target } from "@/store/chat";
import { ProviderDot } from "./ProviderBadge";

const OPTIONS: Target[] = ["both", "claude", "gemini"];

export function TargetSwitch({ value, onChange }: { value: Target; onChange: (t: Target) => void }) {
  return (
    <div role="radiogroup" aria-label="Send to" className="inline-flex rounded-full bg-panel-2 p-0.5 text-xs">
      {OPTIONS.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition ${
            value === t ? "bg-panel text-fg shadow-sm" : "text-muted hover:text-fg"
          }`}
        >
          {t === "both" ? (
            <span className="inline-flex -space-x-1">
              <ProviderDot p="claude" />
              <ProviderDot p="gemini" />
            </span>
          ) : (
            <ProviderDot p={t} />
          )}
          {t === "both" ? "Both" : PROVIDER_LABEL[t]}
        </button>
      ))}
    </div>
  );
}
