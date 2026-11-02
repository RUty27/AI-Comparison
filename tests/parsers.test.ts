import { describe, expect, it } from "vitest";
import { parseClaudeLine, parseGeminiLine } from "@/lib/providers/parsers";

describe("parseClaudeLine", () => {
  it("reads text deltas from partial messages", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hel" } },
    });
    expect(parseClaudeLine(line)).toEqual({ delta: "Hel" });
  });

  it("ignores system, assistant snapshot and non-text deltas", () => {
    expect(parseClaudeLine(JSON.stringify({ type: "system", subtype: "init" }))).toEqual({});
    expect(parseClaudeLine(JSON.stringify({ type: "assistant", message: { content: [] } }))).toEqual({});
    expect(
      parseClaudeLine(
        JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "thinking_delta" } } }),
      ),
    ).toEqual({});
    expect(parseClaudeLine("not json")).toEqual({});
  });

  it("returns final text on success and error otherwise", () => {
    expect(parseClaudeLine(JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "Hi" }))).toEqual({
      final: "Hi",
    });
    expect(
      parseClaudeLine(JSON.stringify({ type: "result", subtype: "success", is_error: true, result: "Not logged in" })),
    ).toEqual({ error: "Not logged in" });
  });
});

describe("parseGeminiLine", () => {
  it("reads assistant deltas and skips the echoed user message", () => {
    expect(parseGeminiLine(JSON.stringify({ type: "message", role: "assistant", content: "Yo", delta: true }))).toEqual({
      delta: "Yo",
    });
    expect(parseGeminiLine(JSON.stringify({ type: "message", role: "user", content: "q" }))).toEqual({});
    expect(parseGeminiLine(JSON.stringify({ type: "init", session_id: "x", model: "m" }))).toEqual({});
  });

  it("treats warnings as non-fatal and errors as fatal", () => {
    expect(parseGeminiLine(JSON.stringify({ type: "error", severity: "warning", message: "loop" }))).toEqual({});
    expect(parseGeminiLine(JSON.stringify({ type: "error", severity: "error", message: "boom" }))).toEqual({
      error: "boom",
    });
    expect(
      parseGeminiLine(JSON.stringify({ type: "result", status: "error", error: { type: "Auth", message: "login" } })),
    ).toEqual({ error: "login" });
    expect(parseGeminiLine(JSON.stringify({ type: "result", status: "success", stats: {} }))).toEqual({});
  });
});
