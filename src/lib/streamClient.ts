import type { ChatMessage, Provider, StreamEvent } from "./types";

/** Calls /api/chat and reports streamed text. Resolves with the full text. */
export async function streamChat(
  provider: Provider,
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      const ev = JSON.parse(line) as StreamEvent;
      if (ev.type === "delta") {
        full += ev.text;
        onDelta(ev.text);
      } else if (ev.type === "error") {
        throw new Error(ev.message);
      }
    }
  }
  return full;
}
