import type { ChatMessage, Provider } from "../types";
import type { StreamOptions } from "./index";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fake streaming replies for trying the UI without signed-in CLIs (DUOBOT_MOCK=1). */
export async function* streamMock(
  provider: Provider,
  messages: ChatMessage[],
  opts: StreamOptions,
): AsyncGenerator<string> {
  const last = messages[messages.length - 1]?.content ?? "";
  const name = provider === "claude" ? "Claude" : "Gemini";
  const priorTurns = messages.filter((m) => m.role === "user").length - 1;
  const reply =
    `**${name} (mock)** here. You asked:\n\n> ${last.slice(0, 200).replace(/\n/g, " ")}\n\n` +
    (provider === "claude"
      ? "Here's a careful, step-by-step take:\n\n1. Restate the problem.\n2. Weigh the options.\n3. Recommend one.\n\n```ts\nconst answer = 42;\n```\n"
      : "Quick answer first, then details:\n\n- **Short version:** it depends.\n- **Longer version:** see the table.\n\n| Option | Pro | Con |\n|---|---|---|\n| A | fast | rough |\n| B | solid | slow |\n") +
    `\n_This thread has ${priorTurns} earlier message(s) from you._`;

  const words = reply.split(/(\s+)/);
  for (const w of words) {
    if (opts.signal?.aborted) return;
    await sleep(provider === "claude" ? 12 : 8);
    yield w;
  }
}
