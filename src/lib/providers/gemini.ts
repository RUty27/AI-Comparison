import { buildPrompt, SYSTEM_PROMPT } from "../prompt";
import type { ChatMessage } from "../types";
import { spawnLines } from "./cli";
import { parseGeminiLine } from "./parsers";
import type { StreamOptions } from "./index";

export const GEMINI_INSTALL_HINT =
  "Gemini CLI not found. Install it with `npm install -g @google/gemini-cli`, " +
  "then run `gemini` once in a terminal and choose \"Login with Google\". Set GEMINI_BIN if it isn't on your PATH.";

export async function* streamGemini(messages: ChatMessage[], opts: StreamOptions): AsyncGenerator<string> {
  // Gemini CLI puts stdin before the -p text, so the transcript goes on stdin
  // and -p carries the standing instructions.
  const args = [
    "--output-format", "stream-json",
    "--approval-mode", "plan",
    "--skip-trust",
    "-p", `(${SYSTEM_PROMPT})`,
  ];
  const model = process.env.GEMINI_MODEL;
  if (model) args.push("--model", model);

  let streamed = false;
  for await (const line of spawnLines({
    cmd: process.env.GEMINI_BIN || "gemini",
    args,
    stdin: buildPrompt(messages),
    signal: opts.signal,
    timeoutMs: opts.timeoutMs,
    installHint: GEMINI_INSTALL_HINT,
  })) {
    const p = parseGeminiLine(line);
    if (p.error) throw new Error(p.error);
    if (p.delta) {
      streamed = true;
      yield p.delta;
    } else if (p.final && !streamed) {
      streamed = true;
      yield p.final;
    } else if (!line.startsWith("{")) {
      // Older Gemini CLI versions without stream-json print plain text.
      streamed = true;
      yield line + "\n";
    }
  }
}
