"use client";

import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { streamChat } from "@/lib/streamClient";
import { PROVIDERS, PROVIDER_LABEL, type ChatMessage, type Provider } from "@/lib/types";
import {
  comparePrompt,
  historyFor,
  sideChatMessages,
  titleFrom,
  type Conversation,
  type Reply,
  type SideChat,
  type Target,
  type Turn,
} from "./history";

export * from "./history";

/** In-flight requests, keyed by what they write to. Not persisted. */
const controllers = new Map<string, AbortController>();

interface State {
  conversations: Record<string, Conversation>;
  order: string[];
  activeId: string | null;
  target: Target;
  sideOpen: boolean;
  activeSideId: Record<string, string | undefined>;
  /** Text to drop into the side-chat composer (from "Ask in side chat"). */
  sideDraft: string;

  newConversation: () => string;
  selectConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
  setTarget: (t: Target) => void;
  setSideOpen: (open: boolean) => void;
  setSideDraft: (s: string) => void;

  send: (text: string, target?: Target) => void;
  ask: (turnId: string, p: Provider) => void;
  stop: (key?: string) => void;
  pick: (turnId: string, p: Provider) => void;
  share: (turnId: string, to: Provider) => void;
  compare: (turnId: string, mode: "compare" | "merge", judge: Provider) => void;
  clearCompare: (turnId: string) => void;

  newSideChat: (p: Provider, includeMain: boolean, draft?: string) => void;
  selectSideChat: (id: string) => void;
  deleteSideChat: (id: string) => void;
  sendSide: (sideId: string, text: string) => void;
}

const newConv = (): Conversation => ({
  id: nanoid(10),
  title: "New chat",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  turns: [],
  sideChats: [],
});

export const replyKey = (turnId: string, p: Provider) => `${turnId}:${p}`;
export const compareKey = (turnId: string) => `${turnId}:compare`;

export const useChat = create<State>()(
  persist(
    (set, get) => {
      /** Immutably update one conversation. */
      const patchConv = (id: string, fn: (c: Conversation) => Conversation) =>
        set((s) => {
          const c = s.conversations[id];
          if (!c) return s;
          return { conversations: { ...s.conversations, [id]: { ...fn(c), updatedAt: Date.now() } } };
        });

      const patchTurn = (convId: string, turnId: string, fn: (t: Turn) => Turn) =>
        patchConv(convId, (c) => ({ ...c, turns: c.turns.map((t) => (t.id === turnId ? fn(t) : t)) }));

      const patchSide = (convId: string, sideId: string, fn: (sc: SideChat) => SideChat) =>
        patchConv(convId, (c) => ({ ...c, sideChats: c.sideChats.map((sc) => (sc.id === sideId ? fn(sc) : sc)) }));

      /** Streams one request, writing progress through `write`. */
      const run = async (key: string, messages: ChatMessage[], p: Provider, write: (r: Reply) => void) => {
        controllers.get(key)?.abort();
        const ctrl = new AbortController();
        controllers.set(key, ctrl);
        let text = "";
        write({ text, status: "streaming" });
        try {
          await streamChat(
            p,
            messages,
            (d) => {
              text += d;
              write({ text, status: "streaming" });
            },
            ctrl.signal,
          );
          write({ text, status: "done" });
        } catch (e) {
          if (ctrl.signal.aborted) write({ text, status: "stopped" });
          else write({ text, status: "error", error: e instanceof Error ? e.message : String(e) });
        } finally {
          if (controllers.get(key) === ctrl) controllers.delete(key);
        }
      };

      const ensureConv = (): string => get().activeId ?? get().newConversation();

      const askTurn = (convId: string, turnId: string, p: Provider) => {
        const c = get().conversations[convId];
        const idx = c?.turns.findIndex((t) => t.id === turnId) ?? -1;
        if (!c || idx < 0) return;
        const turn = c.turns[idx];
        const messages = [...historyFor(c.turns, p, idx), { role: "user" as const, content: turn.userText }];
        void run(replyKey(turnId, p), messages, p, (r) =>
          patchTurn(convId, turnId, (t) => ({ ...t, replies: { ...t.replies, [p]: r } })),
        );
      };

      return {
        conversations: {},
        order: [],
        activeId: null,
        target: "both",
        sideOpen: false,
        activeSideId: {},
        sideDraft: "",

        newConversation: () => {
          const c = newConv();
          set((s) => ({
            conversations: { ...s.conversations, [c.id]: c },
            order: [c.id, ...s.order],
            activeId: c.id,
            target: "both",
          }));
          return c.id;
        },
        selectConversation: (id) => set({ activeId: id }),
        renameConversation: (id, title) => patchConv(id, (c) => ({ ...c, title: title.trim() || c.title })),
        deleteConversation: (id) =>
          set((s) => {
            const conversations = { ...s.conversations };
            delete conversations[id];
            const order = s.order.filter((x) => x !== id);
            return { conversations, order, activeId: s.activeId === id ? (order[0] ?? null) : s.activeId };
          }),
        setTarget: (target) => set({ target }),
        setSideOpen: (sideOpen) => set({ sideOpen }),
        setSideDraft: (sideDraft) => set({ sideDraft }),

        send: (text, target = get().target) => {
          const userText = text.trim();
          if (!userText) return;
          const convId = ensureConv();
          const turn: Turn = { id: nanoid(10), userText, replies: {} };
          patchConv(convId, (c) => ({
            ...c,
            title: c.turns.length === 0 && c.title === "New chat" ? titleFrom(userText) : c.title,
            turns: [...c.turns, turn],
          }));
          const targets = target === "both" ? PROVIDERS : [target];
          for (const p of targets) askTurn(convId, turn.id, p);
        },

        ask: (turnId, p) => {
          const convId = get().activeId;
          if (convId) askTurn(convId, turnId, p);
        },

        stop: (key) => {
          if (key) controllers.get(key)?.abort();
          else for (const c of controllers.values()) c.abort();
        },

        pick: (turnId, p) => {
          const convId = get().activeId;
          if (!convId) return;
          let nowPicked: Provider | undefined;
          patchTurn(convId, turnId, (t) => {
            nowPicked = t.picked === p ? undefined : p;
            return { ...t, picked: nowPicked };
          });
          // Picking an answer means "carry on with this AI".
          set({ target: nowPicked ?? "both" });
        },

        share: (turnId, to) => {
          const convId = get().activeId;
          if (!convId) return;
          patchTurn(convId, turnId, (t) => ({
            ...t,
            sharedTo: t.sharedTo?.includes(to) ? t.sharedTo.filter((x) => x !== to) : [...(t.sharedTo ?? []), to],
          }));
        },

        compare: (turnId, mode, judge) => {
          const convId = get().activeId;
          const turn = convId ? get().conversations[convId]?.turns.find((t) => t.id === turnId) : undefined;
          if (!convId || !turn) return;
          void run(compareKey(turnId), [{ role: "user", content: comparePrompt(turn, mode) }], judge, (reply) =>
            patchTurn(convId, turnId, (t) => ({ ...t, compare: { mode, judge, reply } })),
          );
        },
        clearCompare: (turnId) => {
          const convId = get().activeId;
          if (!convId) return;
          controllers.get(compareKey(turnId))?.abort();
          patchTurn(convId, turnId, (t) => ({ ...t, compare: undefined }));
        },

        newSideChat: (p, includeMain, draft = "") => {
          const convId = ensureConv();
          const c = get().conversations[convId];
          const n = c.sideChats.filter((x) => x.provider === p).length + 1;
          const sc: SideChat = {
            id: nanoid(10),
            provider: p,
            title: `${PROVIDER_LABEL[p]} #${n}`,
            includeMain,
            messages: [],
          };
          patchConv(convId, (cc) => ({ ...cc, sideChats: [...cc.sideChats, sc] }));
          set((s) => ({ activeSideId: { ...s.activeSideId, [convId]: sc.id }, sideOpen: true, sideDraft: draft }));
        },
        selectSideChat: (id) => {
          const convId = get().activeId;
          if (convId) set((s) => ({ activeSideId: { ...s.activeSideId, [convId]: id } }));
        },
        deleteSideChat: (id) => {
          const convId = get().activeId;
          if (!convId) return;
          controllers.get(`side:${id}`)?.abort();
          patchConv(convId, (c) => ({ ...c, sideChats: c.sideChats.filter((x) => x.id !== id) }));
          set((s) => ({ activeSideId: { ...s.activeSideId, [convId]: undefined } }));
        },
        sendSide: (sideId, text) => {
          const userText = text.trim();
          const convId = get().activeId;
          if (!userText || !convId) return;
          const asstId = nanoid(10);
          patchSide(convId, sideId, (sc) => ({
            ...sc,
            title: sc.messages.length === 0 ? titleFrom(userText) : sc.title,
            messages: [
              ...sc.messages,
              { id: nanoid(10), role: "user", text: userText },
              { id: asstId, role: "assistant", text: "", status: "streaming" },
            ],
          }));
          const c = get().conversations[convId];
          const sc = c.sideChats.find((x) => x.id === sideId)!;
          const messages = sideChatMessages(
            c.turns,
            { ...sc, messages: sc.messages.filter((m) => m.id !== asstId) },
          );
          void run(`side:${sideId}`, messages, sc.provider, (r) =>
            patchSide(convId, sideId, (s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.id === asstId ? { ...m, text: r.text, status: r.status, error: r.error } : m,
              ),
            })),
          );
        },
      };
    },
    {
      name: "duobot-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        conversations: s.conversations,
        order: s.order,
        activeId: s.activeId,
        target: s.target,
        activeSideId: s.activeSideId,
      }),
      // Anything still "streaming" after a reload was cut off.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        for (const c of Object.values(state.conversations)) {
          for (const t of c.turns) {
            for (const p of PROVIDERS) {
              const r = t.replies[p];
              if (r?.status === "streaming") t.replies[p] = { ...r, status: "stopped" };
            }
            if (t.compare?.reply.status === "streaming") t.compare.reply.status = "stopped";
          }
          for (const sc of c.sideChats) {
            for (const m of sc.messages) if (m.status === "streaming") m.status = "stopped";
          }
        }
      },
    },
  ),
);

export function isBusy(key: string): boolean {
  return controllers.has(key);
}
