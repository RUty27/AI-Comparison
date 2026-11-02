import { PROVIDER_LABEL, otherProvider, type ChatMessage, type Provider } from "@/lib/types";

export type ReplyStatus = "streaming" | "done" | "error" | "stopped";

export interface Reply {
  text: string;
  status: ReplyStatus;
  error?: string;
}

export type Target = "both" | Provider;

export interface CompareResult {
  mode: "compare" | "merge";
  judge: Provider;
  reply: Reply;
}

export interface Turn {
  id: string;
  userText: string;
  replies: Partial<Record<Provider, Reply>>;
  /** The answer the user preferred for this turn. */
  picked?: Provider;
  /** Providers that were shown the *other* AI's answer to this turn. */
  sharedTo?: Provider[];
  compare?: CompareResult;
}

export interface SideMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: ReplyStatus;
  error?: string;
}

export interface SideChat {
  id: string;
  provider: Provider;
  title: string;
  /** Prepend the provider's main-thread history when sending. */
  includeMain: boolean;
  messages: SideMessage[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: Turn[];
  sideChats: SideChat[];
}

const usable = (r?: Reply) => !!r && (r.status === "done" || r.status === "stopped") && r.text.trim() !== "";

/**
 * The message history one provider has seen, built from the turns before
 * `uptoIndex`. Each AI only sees the questions it was asked and its own
 * answers, plus any answers the user explicitly shared with it.
 */
export function historyFor(turns: Turn[], p: Provider, uptoIndex = turns.length): ChatMessage[] {
  const out: ChatMessage[] = [];
  const other = otherProvider(p);
  for (const t of turns.slice(0, uptoIndex)) {
    const mine = t.replies[p];
    if (usable(mine)) {
      out.push({ role: "user", content: t.userText }, { role: "assistant", content: mine!.text });
    }
    const theirs = t.replies[other];
    if (t.sharedTo?.includes(p) && usable(theirs)) {
      out.push(
        {
          role: "user",
          content:
            `For context, I also asked ${PROVIDER_LABEL[other]}: "${t.userText}"\n\n` +
            `${PROVIDER_LABEL[other]} answered:\n\n${theirs!.text}\n\nKeep this in mind for what follows.`,
        },
        { role: "assistant", content: `Got it. I'll take ${PROVIDER_LABEL[other]}'s answer into account.` },
      );
    }
  }
  return out;
}

export function comparePrompt(turn: Turn, mode: "compare" | "merge"): string {
  const a = turn.replies.claude?.text ?? "";
  const b = turn.replies.gemini?.text ?? "";
  const task =
    mode === "compare"
      ? "Compare the two answers below. Say where they agree, where they differ, what each gets wrong or misses, and which is better for the question and why. Be concise; use a short table if it helps."
      : "Merge the two answers below into one best answer to the question. Keep what is correct and useful from each, fix mistakes, and drop repetition. Reply with the merged answer only.";
  return `${task}\n\n<question>\n${turn.userText}\n</question>\n\n<answer from="Claude">\n${a}\n</answer>\n\n<answer from="Gemini">\n${b}\n</answer>`;
}

export function sideChatMessages(turns: Turn[], chat: SideChat): ChatMessage[] {
  const base = chat.includeMain ? historyFor(turns, chat.provider) : [];
  const side = chat.messages
    .filter((m) => m.role === "user" || (m.status !== "error" && m.text.trim() !== ""))
    .map((m) => ({ role: m.role, content: m.text }) as ChatMessage);
  return [...base, ...side];
}

export function titleFrom(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 48 ? t.slice(0, 47) + "…" : t || "New chat";
}
