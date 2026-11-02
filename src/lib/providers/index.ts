import type { ChatMessage, Provider } from "../types";
import { streamClaude } from "./claude";
import { streamGemini } from "./gemini";
import { streamMock } from "./mock";

export interface StreamOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export const isMock = () => process.env.DUOBOT_MOCK === "1" || process.env.DUOBOT_MOCK === "true";

export function streamProvider(
  provider: Provider,
  messages: ChatMessage[],
  opts: StreamOptions = {},
): AsyncGenerator<string> {
  const timeoutMs = opts.timeoutMs ?? (Number(process.env.CLI_TIMEOUT_MS) || 300_000);
  const o = { ...opts, timeoutMs };
  if (isMock()) return streamMock(provider, messages, o);
  return provider === "claude" ? streamClaude(messages, o) : streamGemini(messages, o);
}
