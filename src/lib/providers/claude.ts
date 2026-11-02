import { buildPrompt, SYSTEM_PROMPT } from "../prompt";
import type { ChatMessage } from "../types";
import { spawnLines } from "./cli";
import { parseClaudeLine } from "./parsers";
import type { StreamOptions } from "./index";

export const CLAUDE_INSTALL_HINT =
  "Claude Code CLI not found. Install it with `npm install -g @anthropic-ai/claude-code`, " +
  "then run `claude` once in a terminal and sign in. Set CLAUDE_BIN if it isn't on your PATH.";

export async function* streamClaude(messages: ChatMessage[], opts: StreamOptions): AsyncGenerator<string> {
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--no-session-persistence",
    "--tools", "",
    "--setting-sources", "user",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--system-prompt", SYSTEM_PROMPT,
  ];
  const model = process.env.CLAUDE_MODEL;
  if (model) args.push("--model", model);

  let streamed = false;
  for await (const line of spawnLines({
    cmd: process.env.CLAUDE_BIN || "claude",
    args,
    stdin: buildPrompt(messages),
    signal: opts.signal,
    timeoutMs: opts.timeoutMs,
    installHint: CLAUDE_INSTALL_HINT,
  })) {
    const p = parseClaudeLine(line);
    if (p.error) throw new Error(p.error);
    if (p.delta) {
      streamed = true;
      yield p.delta;
    } else if (p.final && !streamed) {
      streamed = true;
      yield p.final;
    }
  }
}
