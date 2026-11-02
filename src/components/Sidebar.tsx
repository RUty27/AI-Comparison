"use client";

import { useEffect, useState } from "react";
import { PROVIDER_LABEL, type ProviderStatus } from "@/lib/types";
import { useChat } from "@/store/chat";
import { PlusIcon, TrashIcon } from "./Icons";
import { ProviderDot } from "./ProviderBadge";

function StatusList() {
  const [status, setStatus] = useState<ProviderStatus[] | null>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus([]));
  }, []);

  return (
    <div className="space-y-1.5 border-t border-line p-3 text-xs">
      <div className="font-semibold text-muted">CLI logins</div>
      {!status && <div className="text-muted">Checking…</div>}
      {status?.map((s) => (
        <div key={s.provider} title={s.error}>
          <div className="flex items-center gap-2">
            <ProviderDot p={s.provider} />
            <span className="font-medium">{PROVIDER_LABEL[s.provider]}</span>
            <span className={`ml-auto ${s.installed ? "text-emerald-600" : "text-red-500"}`}>
              {s.mock ? "mock" : s.installed ? "found" : "missing"}
            </span>
          </div>
          {s.version && !s.mock && <div className="truncate pl-4.5 text-[11px] text-muted">{s.version}</div>}
          {!s.installed && <div className="pl-4.5 text-[11px] leading-snug text-muted">{s.error}</div>}
        </div>
      ))}
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const order = useChat((s) => s.order);
  const conversations = useChat((s) => s.conversations);
  const activeId = useChat((s) => s.activeId);
  const { newConversation, selectConversation, deleteConversation, renameConversation } = useChat.getState();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <nav className="flex h-full flex-col bg-panel" aria-label="Conversations">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <span className="inline-flex -space-x-1">
            <ProviderDot p="claude" className="size-3" />
            <ProviderDot p="gemini" className="size-3" />
          </span>
          DuoBot
        </div>
      </div>
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => {
            newConversation();
            onNavigate?.();
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-panel-2"
        >
          <PlusIcon /> New chat
        </button>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {order.length === 0 && <li className="px-2 py-3 text-xs text-muted">No chats yet.</li>}
        {order.map((id) => {
          const c = conversations[id];
          if (!c) return null;
          const active = id === activeId;
          return (
            <li key={id} className="group relative">
              {editing === id ? (
                <input
                  autoFocus
                  defaultValue={c.title}
                  aria-label="Chat title"
                  className="w-full rounded-md border border-line bg-panel px-2 py-1.5 text-sm outline-none"
                  onBlur={(e) => {
                    renameConversation(id, e.target.value);
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditing(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    selectConversation(id);
                    onNavigate?.();
                  }}
                  onDoubleClick={() => setEditing(id)}
                  className={`w-full truncate rounded-md px-2 py-1.5 pr-8 text-left text-sm ${
                    active ? "bg-panel-2 font-medium" : "text-muted hover:bg-panel-2 hover:text-fg"
                  }`}
                  title="Double-click to rename"
                >
                  {c.title}
                </button>
              )}
              {editing !== id && (
                <button
                  type="button"
                  aria-label={`Delete ${c.title}`}
                  onClick={() => {
                    if (confirm(`Delete "${c.title}"?`)) deleteConversation(id);
                  }}
                  className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-1 text-muted opacity-0 hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
                >
                  <TrashIcon width={14} height={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <StatusList />
    </nav>
  );
}
