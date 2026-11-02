"use client";

import { useEffect, useRef, useState } from "react";
import { PROVIDERS, PROVIDER_LABEL, type Provider } from "@/lib/types";
import { useChat } from "@/store/chat";
import { Composer } from "./Composer";
import { ChatIcon, MenuIcon } from "./Icons";
import { IconButton } from "./IconButton";
import { ProviderDot } from "./ProviderBadge";
import { SideChatDrawer } from "./SideChatDrawer";
import { Sidebar } from "./Sidebar";
import { TargetSwitch } from "./TargetSwitch";
import { TurnRow } from "./TurnRow";

function useMediaQuery(q: string) {
  const [match, setMatch] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setMatch(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return match;
}

const EXAMPLES = [
  "Explain the difference between a process and a thread.",
  "Write a regex that matches ISO dates, and explain it.",
  "Plan a 3-day trip to Kyoto on a budget.",
];

function Empty() {
  const { send } = useChat.getState();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 pt-[12vh] text-center">
      <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <span className="inline-flex -space-x-1.5">
          <ProviderDot p="claude" className="size-4" />
          <ProviderDot p="gemini" className="size-4" />
        </span>
        DuoBot
      </div>
      <p className="text-sm text-muted">
        Ask once and get answers from Claude and Gemini side by side. Each one keeps its own history. Star the answer you
        prefer to carry on with that AI, or open a side chat to give one of them a separate job.
      </p>
      <div className="flex w-full flex-col gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => send(e, "both")}
            className="rounded-lg border border-line bg-panel px-3 py-2 text-left text-sm hover:bg-panel-2"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export function App() {
  const conv = useChat((s) => (s.activeId ? s.conversations[s.activeId] : undefined));
  const target = useChat((s) => s.target);
  const sideOpen = useChat((s) => s.sideOpen);
  const { send, setTarget, setSideOpen, stop } = useChat.getState();
  const [navOpen, setNavOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<Provider>("claude");
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const wide = useMediaQuery("(min-width: 1280px)");

  const turns = conv?.turns ?? [];
  const lastTurn = turns[turns.length - 1];
  const busy = turns.some(
    (t) => PROVIDERS.some((p) => t.replies[p]?.status === "streaming") || t.compare?.reply.status === "streaming",
  );
  const sig = lastTurn
    ? PROVIDERS.map((p) => lastTurn.replies[p]?.text.length ?? 0).join() + (lastTurn.compare?.reply.text.length ?? 0)
    : "";

  useEffect(() => {
    stickToBottom.current = true;
  }, [turns.length, conv?.id]);

  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTo({ top: el.scrollHeight });
  }, [sig, turns.length, conv?.id]);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Conversations */}
      <div className="hidden w-64 shrink-0 border-r border-line lg:block">
        <Sidebar />
      </div>
      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line shadow-xl">
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2">
          <IconButton label="Open chats" onClick={() => setNavOpen(true)} className="lg:hidden">
            <MenuIcon />
          </IconButton>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{conv?.title ?? "DuoBot"}</h1>
          <button
            type="button"
            onClick={() => setSideOpen(!sideOpen)}
            aria-pressed={sideOpen}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
              sideOpen ? "border-fg bg-panel-2" : "border-line hover:bg-panel-2"
            }`}
          >
            <ChatIcon width={14} height={14} /> Side chat
            {!!conv?.sideChats.length && (
              <span className="rounded-full bg-panel-2 px-1.5 text-[10px]">{conv.sideChats.length}</span>
            )}
          </button>
        </header>

        {/* Narrow screens: one AI column at a time */}
        {turns.length > 0 && (
          <div className="flex gap-1 border-b border-line bg-panel px-3 py-1.5 md:hidden" role="tablist">
            {PROVIDERS.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={mobileTab === p}
                onClick={() => setMobileTab(p)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-xs font-semibold ${
                  mobileTab === p
                    ? p === "claude"
                      ? "bg-claude-soft text-claude"
                      : "bg-gemini-soft text-gemini"
                    : "text-muted"
                }`}
              >
                <ProviderDot p={p} /> {PROVIDER_LABEL[p]}
              </button>
            ))}
          </div>
        )}

        <div
          ref={scroller}
          className="flex-1 overflow-y-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {turns.length === 0 ? (
            <Empty />
          ) : (
            <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
              {turns.map((t) => (
                <TurnRow key={t.id} turn={t} mobileTab={mobileTab} />
              ))}
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pt-2 pb-4">
          <Composer
            placeholder={target === "both" ? "Ask Claude and Gemini…" : `Continue with ${PROVIDER_LABEL[target]}…`}
            onSend={(t) => {
              stickToBottom.current = true;
              send(t);
              if (target !== "both") setMobileTab(target);
            }}
            busy={busy}
            onStop={() => stop()}
            left={<TargetSwitch value={target} onChange={setTarget} />}
            autoFocus
          />
          <p className="mt-1.5 text-center text-[11px] text-muted">
            Enter to send · Shift+Enter for a new line · ★ picks an answer and continues with that AI
          </p>
        </div>
      </main>

      {/* Side chat */}
      {sideOpen &&
        (wide ? (
          <div className="w-[380px] shrink-0 border-l border-line">
            <SideChatDrawer />
          </div>
        ) : (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSideOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 h-[85dvh] overflow-hidden rounded-t-2xl border-t border-line shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:h-auto sm:w-[400px] sm:rounded-none sm:border-t-0 sm:border-l">
              <SideChatDrawer />
            </div>
          </div>
        ))}
    </div>
  );
}
