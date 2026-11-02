export type Provider = "claude" | "gemini";

export const PROVIDERS: Provider[] = ["claude", "gemini"];

export const PROVIDER_LABEL: Record<Provider, string> = {
  claude: "Claude",
  gemini: "Gemini",
};

export function otherProvider(p: Provider): Provider {
  return p === "claude" ? "gemini" : "claude";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** One line of the NDJSON stream sent by /api/chat. */
export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ProviderStatus {
  provider: Provider;
  installed: boolean;
  version?: string;
  mock?: boolean;
  error?: string;
}
