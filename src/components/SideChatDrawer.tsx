"use client";

import { useEffect, useRef, useState } from "react";
import { PROVIDERS, PROVIDER_LABEL, type Provider } from "@/lib/types";
import { useChat } from "@/store/chat";
import { Composer } from "./Composer";
import { CloseIcon, PlusIcon, TrashIcon } from "./Icons";
import { IconButton } from "./IconButton";
import { Markdown } from "./Markdown";
import { ProviderBadge, ProviderDot } from "./ProviderBadge";

function NewSideChat() {
  const [p, setP] = useState<Provider>("claude");
  const [includeMain, setIncludeMain] = useState(true);
  const { newSideChat } = useChat.getState();
  return (
    <div className="space-y-3 p-4 text-sm">
      <p className="text-muted">
        Give one AI a separate job. A side chat doesn&apos;t change the main threads.
      </p>
      <div className="flex gap-2">
        {PROVIDERS.map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => setP(x)}
            aria-pressed={p === x}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 font-medium ${
              p === x ? (x === "claude" ? "border-claude bg-claude-soft" : "border-gemini bg-gemini-soft") : "border-line hover:bg-panel-2"
            }`}
          >
            <ProviderDot p={x} /> {PROVIDER_LABEL[x]}
          </button>
        ))}
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" checked={includeMain} onChange={(e) => setIncludeMain(e.target.checked)} className="mt-0.5" />
        <span>Give it {PROVIDER_LABEL[p]}&apos;s main conversation as context</span>
      </label>
      <button
        type="button"
        onClick={() => newSideChat(p, includeMain)}
        className="w-full rounded-lg bg-accent px-3 py-2 font-medium text-bg"
      >
        Start side chat with {PROVIDER_LABEL[p]}
      </button>
    </div>
  );
}

export function SideChatDrawer() {
  const activeId = useChat((s) => s.activeId);
  const conv = useChat((s) => (s.activeId ? s.conversations[s.activeId] : undefined));
  const activeSide = useChat((s) => (activeId ? s.activeSideId[activeId] : undefined));
  const sideDraft = useChat((s) => s.sideDraft);
  const { setSideOpen, selectSideChat, deleteSideChat, sendSide, stop, setSideDraft } = useChat.getState();
  // "New side chat" form is shown until another side chat becomes active.
  const [creatingAt, setCreatingAt] = useState<string | null>(null);
  const creating = creatingAt !== null && creatingAt === (activeSide ?? "");
  const scroller = useRef<HTMLDivElement>(null);

  const chats = conv?.sideChats ?? [];
  const chat = creating ? undefined : (chats.find((c) => c.id === activeSide) ?? chats[chats.length - 1]);
  const last = chat?.messages[chat.messages.length - 1];

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [last?.text, chat?.id]);

  return (
    <aside className="flex h-full flex-col bg-panel" aria-label="Side chat">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-sm font-semibold">Side chat</span>
        <IconButton label="Close side chat" onClick={() => setSideOpen(false)}>
          <CloseIcon />
        </IconButton>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-line px-2 py-1.5">
        {chats.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCreatingAt(null);
              selectSideChat(c.id);
            }}
            className={`inline-flex max-w-40 shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
              chat?.id === c.id ? "bg-panel-2 font-medium" : "text-muted hover:bg-panel-2"
            }`}
            title={c.title}
          >
            <ProviderDot p={c.provider} />
            <span className="truncate">{c.title}</span>
          </button>
        ))}
        <IconButton label="New side chat" onClick={() => setCreatingAt(activeSide ?? "")} className="shrink-0">
          <PlusIcon width={14} height={14} />
        </IconButton>
      </div>

      {!chat ? (
        <div className="flex-1 overflow-y-auto">
          <NewSideChat />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-muted">
            <span className="flex items-center gap-2">
              <ProviderBadge p={chat.provider} />
              {chat.includeMain ? "· sees main chat" : "· fresh context"}
            </span>
            <IconButton label="Delete side chat" onClick={() => deleteSideChat(chat.id)}>
              <TrashIcon width={13} height={13} />
            </IconButton>
          </div>
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
            {chat.messages.length === 0 && (
              <p className="pt-6 text-center text-xs text-muted">Ask {PROVIDER_LABEL[chat.provider]} to do something else.</p>
            )}
            {chat.messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-3 py-1.5 text-sm text-bg">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="rounded-xl border border-line px-3 py-2">
                  {m.status === "error" ? (
                    <div className="text-sm text-red-500">{m.error}</div>
                  ) : m.text ? (
                    <Markdown text={m.text} streaming={m.status === "streaming"} />
                  ) : (
                    <div className="text-sm text-muted">Thinking…</div>
                  )}
                </div>
              ),
            )}
          </div>
          <div className="border-t border-line p-2">
            <Composer
              key={chat.id + sideDraft}
              placeholder={`Message ${PROVIDER_LABEL[chat.provider]} (side chat)`}
              initial={sideDraft}
              busy={last?.status === "streaming"}
              onStop={() => stop(`side:${chat.id}`)}
              onSend={(t) => {
                sendSide(chat.id, t);
                if (sideDraft) setSideDraft("");
              }}
            />
          </div>
        </>
      )}
    </aside>
  );
}
