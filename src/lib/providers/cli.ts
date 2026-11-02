import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

let sandboxDir: string | null = null;

/** An empty folder to run the CLIs in, so they never read or touch the user's projects. */
export function sandbox(): string {
  if (!sandboxDir) sandboxDir = mkdtempSync(path.join(os.tmpdir(), "duobot-"));
  return sandboxDir;
}

/** Quotes an argument for cmd.exe, which runs the CLIs' .cmd shims on Windows. */
function winQuote(arg: string): string {
  if (/^[\w.\-=/:]+$/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`;
}

export class CliError extends Error {}

export interface SpawnOptions {
  cmd: string;
  args: string[];
  stdin?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Shown when the binary is missing. */
  installHint: string;
}

/** Runs a CLI and yields its stdout line by line. Throws CliError on failure. */
export async function* spawnLines(opts: SpawnOptions): AsyncGenerator<string> {
  const isWin = process.platform === "win32";
  const child = spawn(opts.cmd, isWin ? opts.args.map(winQuote) : opts.args, {
    cwd: sandbox(),
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    stdio: ["pipe", "pipe", "pipe"],
    // On Windows the CLIs are .cmd shims, which need a shell.
    shell: isWin,
  });

  let stderr = "";
  let spawnError: NodeJS.ErrnoException | null = null;
  child.on("error", (e) => (spawnError = e));
  child.stderr.on("data", (d) => (stderr += d.toString()));

  const kill = () => {
    if (child.exitCode === null) child.kill("SIGTERM");
  };
  opts.signal?.addEventListener("abort", kill, { once: true });
  const timer = setTimeout(kill, opts.timeoutMs ?? 300_000);

  const exited = new Promise<number | null>((resolve) => child.on("close", (code) => resolve(code)));

  child.stdin.on("error", () => {});
  child.stdin.end(opts.stdin ?? "");

  try {
    let buf = "";
    for await (const chunk of child.stdout) {
      buf += chunk.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) yield line;
      }
    }
    if (buf.trim()) yield buf.trim();

    const code = await exited;
    if (spawnError) {
      const err = spawnError as NodeJS.ErrnoException;
      throw new CliError(err.code === "ENOENT" ? opts.installHint : err.message);
    }
    if (opts.signal?.aborted) return;
    if (code !== 0) {
      const msg = stderr.trim().split("\n").slice(-6).join("\n");
      throw new CliError(msg || `${opts.cmd} exited with code ${code}`);
    }
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", kill);
    kill();
  }
}

/** Runs `cmd --version`; resolves to the version string or null if not installed. */
export function cliVersion(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(cmd, ["--version"], { shell: process.platform === "win32" });
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.on("error", () => resolve(null));
    child.on("close", (code) => resolve(code === 0 ? out.trim().split("\n")[0] : null));
    setTimeout(() => {
      child.kill();
      resolve(null);
    }, 15_000);
  });
}
