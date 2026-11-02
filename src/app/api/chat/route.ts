import { streamProvider } from "@/lib/providers";
import type { ChatMessage, Provider, StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValid(body: unknown): body is { provider: Provider; messages: ChatMessage[] } {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    (b.provider === "claude" || b.provider === "gemini") &&
    Array.isArray(b.messages) &&
    b.messages.length > 0 &&
    b.messages.every(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!isValid(body)) {
    return Response.json({ error: "Expected { provider, messages }" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const send = (c: ReadableStreamDefaultController, ev: StreamEvent) =>
    c.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of streamProvider(body.provider, body.messages, { signal: req.signal })) {
          send(controller, { type: "delta", text });
        }
        send(controller, { type: "done" });
      } catch (e) {
        send(controller, { type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        try {
          controller.close();
        } catch {
          // client already gone
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
