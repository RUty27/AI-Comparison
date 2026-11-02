import { describe, expect, it } from "vitest";
import { exitMessage } from "@/lib/providers/cli";
import { SYSTEM_PROMPT } from "@/lib/prompt";

describe("exitMessage", () => {
  const hint = "install it";
  it("maps a missing command (cmd.exe or sh) to the install hint", () => {
    const win = "'claude' is not recognized as an internal or external command,\r\noperable program or batch file.";
    expect(exitMessage(win, 1, "claude", hint)).toBe(hint);
    expect(exitMessage("sh: 1: gemini: command not found", 127, "gemini", hint)).toBe(hint);
  });
  it("keeps the last stderr lines otherwise", () => {
    expect(exitMessage("a\nb\nPlease log in", 1, "claude", hint)).toBe("a\nb\nPlease log in");
    expect(exitMessage("", 2, "claude", hint)).toBe("claude exited with code 2");
  });
});

describe("SYSTEM_PROMPT", () => {
  it("has no double quotes or newlines, so it survives Windows cmd.exe quoting", () => {
    expect(SYSTEM_PROMPT).not.toMatch(/["\r\n]/);
  });
});
