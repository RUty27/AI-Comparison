import { describe, expect, it } from "vitest";
import { buildPrompt } from "@/lib/prompt";
import { comparePrompt, historyFor, sideChatMessages, type SideChat, type Turn } from "@/store/history";

const done = (text: string) => ({ text, status: "done" as const });

const turns: Turn[] = [
  { id: "1", userText: "Q1", replies: { claude: done("C1"), gemini: done("G1") } },
  { id: "2", userText: "Q2 for Claude only", replies: { claude: done("C2") } },
  { id: "3", userText: "Q3", replies: { claude: { text: "", status: "error", error: "x" }, gemini: done("G3") }, sharedTo: ["claude"] },
];

describe("historyFor", () => {
  it("keeps each AI's thread independent", () => {
    expect(historyFor(turns, "gemini")).toEqual([
      { role: "user", content: "Q1" },
      { role: "assistant", content: "G1" },
      { role: "user", content: "Q3" },
      { role: "assistant", content: "G3" },
    ]);
    const c = historyFor(turns, "claude");
    expect(c.slice(0, 4).map((m) => m.content)).toEqual(["Q1", "C1", "Q2 for Claude only", "C2"]);
  });

  it("adds a shared answer from the other AI", () => {
    const c = historyFor(turns, "claude");
    expect(c).toHaveLength(6);
    expect(c[4].content).toContain("Gemini answered");
    expect(c[4].content).toContain("G3");
    expect(c[5].role).toBe("assistant");
  });

  it("stops before the given turn index", () => {
    expect(historyFor(turns, "claude", 1)).toHaveLength(2);
    expect(historyFor(turns, "claude", 0)).toEqual([]);
  });
});

describe("sideChatMessages", () => {
  const chat: SideChat = {
    id: "s",
    provider: "gemini",
    title: "",
    includeMain: true,
    messages: [{ id: "a", role: "user", text: "Translate it" }],
  };
  it("prepends main history when asked", () => {
    expect(sideChatMessages(turns, chat).map((m) => m.content)).toEqual(["Q1", "G1", "Q3", "G3", "Translate it"]);
    expect(sideChatMessages(turns, { ...chat, includeMain: false })).toHaveLength(1);
  });
});

describe("prompts", () => {
  it("passes a single message through", () => {
    expect(buildPrompt([{ role: "user", content: "hi" }])).toBe("hi");
  });
  it("wraps history in a transcript", () => {
    const p = buildPrompt([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ]);
    expect(p).toContain("<user>\na\n</user>");
    expect(p).toContain("<assistant>\nb\n</assistant>");
    expect(p.endsWith("c")).toBe(true);
  });
  it("rejects a history that doesn't end with the user", () => {
    expect(() => buildPrompt([{ role: "assistant", content: "x" }])).toThrow();
  });
  it("includes both answers in the compare prompt", () => {
    const p = comparePrompt(turns[0], "merge");
    expect(p).toContain("C1");
    expect(p).toContain("G1");
    expect(p).toContain("Merge");
  });
});
