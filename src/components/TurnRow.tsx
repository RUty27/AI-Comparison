"use client";

import { useState } from "react";
import { PROVIDERS, PROVIDER_LABEL, type Provider } from "@/lib/types";
import { compareKey, useChat, type Turn } from "@/store/chat";
import { AnswerCard } from "./AnswerCard";
import { CloseIcon, MergeIcon, ScaleIcon, StopIcon } from "./Icons";
import { IconButton } from "./IconButton";
import { Markdown } from "./Markdown";

export function TurnRow({ turn, mobileTab }: { turn: Turn; mobileTab: Provider }) {
  const { compare, clearCompare, stop } = useChat.getState();
  const [judge, setJudge] = useState<Provider>("claude");
  const bothDone = PROVIDERS.every((p) => {
    const r = turn.replies[p];
    return r && r.status !== "streaming" && r.status !== "error" && r.text.trim();
  });
  const cmp = turn.compare;

  return (
    <section className="space-y-3" data-turn={turn.id}>
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-sm text-bg">
          {turn.userText}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {PROVIDERS.map((p) => (
          <div key={p} className={`min-w-0 ${p === mobileTab ? "" : "hidden md:block"}`}>
            <AnswerCard turn={turn} p={p} />
          </div>
        ))}
      </div>

      {bothDone && !cmp && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => compare(turn.id, "compare", judge)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1 font-medium hover:bg-panel-2"
          >
            <ScaleIcon width={13} height={13} /> Compare
          </button>
          <button
            type="button"
            onClick={() => compare(turn.id, "merge", judge)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1 font-medium hover:bg-panel-2"
          >
            <MergeIcon width={13} height={13} /> Merge
          </button>
          <label className="inline-flex items-center gap-1 text-muted">
            using
            <select
              value={judge}
              onChange={(e) => setJudge(e.target.value as Provider)}
              className="rounded-md border border-line bg-panel px-1.5 py-0.5 text-fg"
              aria-label="Model that compares or merges"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {cmp && (
        <div className="rounded-xl border border-line bg-panel-2 shadow-sm" aria-label="Comparison">
          <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
              {cmp.mode === "compare" ? <ScaleIcon width={13} height={13} /> : <MergeIcon width={13} height={13} />}
              {cmp.mode === "compare" ? "Comparison" : "Merged answer"}
              <span className="font-normal text-muted">by {PROVIDER_LABEL[cmp.judge]}</span>
            </span>
            {cmp.reply.status === "streaming" ? (
              <IconButton label="Stop" showLabel onClick={() => stop(compareKey(turn.id))}>
                <StopIcon width={12} height={12} />
              </IconButton>
            ) : (
              <IconButton label="Close" onClick={() => clearCompare(turn.id)}>
                <CloseIcon width={14} height={14} />
              </IconButton>
            )}
          </div>
          <div className="px-3 py-2.5">
            {cmp.reply.status === "error" ? (
              <div className="text-sm text-red-500">{cmp.reply.error}</div>
            ) : cmp.reply.text ? (
              <Markdown text={cmp.reply.text} streaming={cmp.reply.status === "streaming"} />
            ) : (
              <div className="text-sm text-muted">Working…</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
