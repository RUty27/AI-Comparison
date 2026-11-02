import type { ChatMessage } from "./types";

export const SYSTEM_PROMPT =
  "You are a helpful assistant in a chat app. The user may compare your answers with another AI. " +
  "Answer the latest user message directly, using Markdown where it helps. " +
  "You have no tools and no file access; do not mention the transcript format.";

/**
 * The CLIs take one prompt per call, so the app owns the history and flattens
 * it into a single transcript. A single user message is passed through as-is.
 */
export function buildPrompt(messages: ChatMessage[]): string {
  if (messages.length === 0) throw new Error("No messages to send");
  const last = messages[messages.length - 1];
  if (last.role !== "user") throw new Error("The last message must be from the user");
  if (messages.length === 1) return last.content;

  const history = messages
    .slice(0, -1)
    .map((m) => `<${m.role}>\n${m.content}\n</${m.role}>`)
    .join("\n\n");

  return (
    "Here is our conversation so far:\n\n" +
    `<conversation>\n${history}\n</conversation>\n\n` +
    "Now reply to my next message:\n\n" +
    last.content
  );
}
