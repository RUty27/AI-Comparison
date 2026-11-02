"use client";

import { useState } from "react";
import { PROVIDER_LABEL, otherProvider, type Provider } from "@/lib/types";
import { replyKey, useChat, type Turn } from "@/store/chat";
import { ChatIcon, CopyIcon, RetryIcon, ShareIcon, StarIcon, StopIcon } from "./Icons";
import { IconButton } from "./IconButton";
import { Markdown } from "./Markdown";
import { ProviderBadge } from "./ProviderBadge";

export function AnswerCard({ turn, p }: { turn: Turn; p: Provider }) {
  const reply = turn.replies[p];
  const { ask, stop, pick, share, newSideChat } = useChat.getState();
  const [copied, setCopied] = useState(false);
  const picked = turn.picked === p;
  const other = otherProvider(p);
  const sharedToOther = turn.sharedTo?.includes(other) ?? false;
  const streaming = reply?.status === "streaming";
  const hasText = !!reply?.text.trim();

  if (!reply) {
    return (
      <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line p-4 text-sm text-muted">
        <span>Not sent to {PROVIDER_LABEL[p]}</span>
        <button
          type="button"
          onClick={() => ask(turn.id, p)}
          className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-fg hover:bg-panel-2"
        >
          Ask {PROVIDER_LABEL[p]} too
        </button>
      </div>
    );
  }

  const copy = async () => {
    await navigator.clipboard.writeText(reply.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const ring = picked ? (p === "claude" ? "ring-2 ring-claude" : "ring-2 ring-gemini") : "";

  return (
    <article
      className={`group flex min-w-0 flex-col rounded-xl border border-line bg-panel shadow-sm ${ring}`}
      aria-label={`${PROVIDER_LABEL[p]} answer`}
      data-provider={p}
    >
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <div className="flex items-center gap-2">
          <ProviderBadge p={p} />
          {picked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-pick/15 px-2 py-0.5 text-[11px] font-semibold text-pick">
              <StarIcon filled width={11} height={11} /> Picked
            </span>
          )}
          {reply.status === "stopped" && <span className="text-[11px] text-muted">stopped</span>}
        </div>
        {streaming ? (
          <IconButton label="Stop" showLabel onClick={() => stop(replyKey(turn.id, p))}>
            <StopIcon width={12} height={12} />
          </IconButton>
        ) : (
          <IconButton label={picked ? "Unpick" : "Pick this answer"} active={picked} onClick={() => pick(turn.id, p)} disabled={!hasText}>
            <StarIcon filled={picked} className={picked ? "text-pick" : ""} />
          </IconButton>
        )}
      </header>

      <div className="min-h-16 px-3 py-2.5">
        {reply.status === "error" ? (
          <div className="rounded-md border border-red-400/40 bg-red-500/10 p-2.5 text-sm text-red-500">
            <div className="font-medium">{PROVIDER_LABEL[p]} failed</div>
            <pre className="mt-1 whitespace-pre-wrap font-sans text-xs opacity-90">{reply.error}</pre>
          </div>
        ) : hasText ? (
          <Markdown text={reply.text} streaming={streaming} />
        ) : streaming ? (
          <div className="flex items-center gap-1.5 py-2 text-sm text-muted">
            <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted" />
            <span className="ml-1">{PROVIDER_LABEL[p]} is thinking…</span>
          </div>
        ) : (
          <div className="text-sm text-muted">(empty reply)</div>
        )}
      </div>

      {!streaming && (
        <footer className="flex flex-wrap items-center gap-0.5 border-t border-line px-1.5 py-1">
          <IconButton label={copied ? "Copied" : "Copy"} onClick={copy} disabled={!hasText}>
            <CopyIcon width={14} height={14} />
          </IconButton>
          <IconButton label="Retry" onClick={() => ask(turn.id, p)}>
            <RetryIcon width={14} height={14} />
          </IconButton>
          <IconButton
            label={sharedToOther ? `Shared with ${PROVIDER_LABEL[other]}` : `Share with ${PROVIDER_LABEL[other]}`}
            showLabel
            active={sharedToOther}
            className={sharedToOther ? "text-fg" : ""}
            disabled={!hasText}
            onClick={() => share(turn.id, other)}
          >
            <ShareIcon width={14} height={14} />
          </IconButton>
          <IconButton
            label="Side chat"
            showLabel
            disabled={!hasText}
            onClick={() => newSideChat(p, true, `About your answer to "${turn.userText.slice(0, 80)}": `)}
          >
            <ChatIcon width={14} height={14} />
          </IconButton>
        </footer>
      )}
    </article>
  );
}
