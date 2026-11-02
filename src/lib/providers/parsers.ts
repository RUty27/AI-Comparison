/**
 * Line parsers for the CLIs' stream-json output. Each returns the text to
 * append (if any) and, for terminal lines, an error or final text.
 */
export interface ParsedLine {
  delta?: string;
  /** Full text of the reply, used if no deltas were streamed. */
  final?: string;
  error?: string;
}

function safeJson(line: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(line);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Claude Code: `claude -p --output-format stream-json --verbose --include-partial-messages`. */
export function parseClaudeLine(line: string): ParsedLine {
  const ev = safeJson(line);
  if (!ev) return {};
  if (ev.type === "stream_event") {
    const inner = ev.event as Record<string, unknown> | undefined;
    const delta = inner?.delta as Record<string, unknown> | undefined;
    if (inner?.type === "content_block_delta" && delta?.type === "text_delta") {
      return { delta: String(delta.text ?? "") };
    }
    return {};
  }
  if (ev.type === "result") {
    if (ev.is_error || (typeof ev.subtype === "string" && ev.subtype !== "success")) {
      return { error: String(ev.result || ev.subtype || "Claude returned an error") };
    }
    return { final: typeof ev.result === "string" ? ev.result : undefined };
  }
  return {};
}

/** Gemini CLI: `gemini --output-format stream-json -p ...`. */
export function parseGeminiLine(line: string): ParsedLine {
  const ev = safeJson(line);
  if (!ev) return {};
  if (ev.type === "message" && ev.role === "assistant") {
    const text = String(ev.content ?? "");
    return ev.delta ? { delta: text } : { final: text };
  }
  if (ev.type === "error") {
    if (ev.severity === "warning") return {};
    return { error: String(ev.message ?? "Gemini returned an error") };
  }
  if (ev.type === "result" && ev.status === "error") {
    const err = ev.error as Record<string, unknown> | undefined;
    return { error: String(err?.message ?? "Gemini returned an error") };
  }
  return {};
}
