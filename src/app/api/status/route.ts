import { cliVersion } from "@/lib/providers/cli";
import { isMock } from "@/lib/providers";
import { CLAUDE_INSTALL_HINT } from "@/lib/providers/claude";
import { GEMINI_INSTALL_HINT } from "@/lib/providers/gemini";
import type { ProviderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (isMock()) {
    const s: ProviderStatus[] = [
      { provider: "claude", installed: true, version: "mock", mock: true },
      { provider: "gemini", installed: true, version: "mock", mock: true },
    ];
    return Response.json(s);
  }
  const [c, g] = await Promise.all([
    cliVersion(process.env.CLAUDE_BIN || "claude"),
    cliVersion(process.env.GEMINI_BIN || "gemini"),
  ]);
  const s: ProviderStatus[] = [
    { provider: "claude", installed: !!c, version: c ?? undefined, error: c ? undefined : CLAUDE_INSTALL_HINT },
    { provider: "gemini", installed: !!g, version: g ?? undefined, error: g ? undefined : GEMINI_INSTALL_HINT },
  ];
  return Response.json(s);
}
