# DuoBot

Ask **Claude** and **Gemini** the same question and see both answers side by side.

- **One question, two answers.** Send to *Both*, or to just one AI.
- **Independent histories.** Each AI only sees the questions it was asked and its own answers.
- **Pick (★) and continue.** Starring an answer switches the composer to that AI, so you carry on with it. Switch back to *Both* at any time.
- **Share.** "Share with Gemini/Claude" puts one AI's answer into the other's history, so it can build on it.
- **Side chat.** Give one AI a separate job (for example "write tests for this") without touching the main threads. It can see that AI's main conversation, or start fresh.
- **Compare / Merge.** Ask either model to compare the two answers or merge them into one.
- Chats are saved in your browser (localStorage). It works on phone-width screens and in dark mode.

## How it signs in: your CLI logins, no API keys

DuoBot runs on your computer and calls the official command-line tools you're already signed in to:

| AI | CLI | Sign in once |
|---|---|---|
| Claude | [Claude Code](https://docs.claude.com/en/docs/claude-code) | `npm install -g @anthropic-ai/claude-code`, then run `claude` and log in |
| Gemini | [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm install -g @google/gemini-cli`, then run `gemini` and choose **Login with Google** |

Usage counts against those accounts' plans and limits. The CLIs run in an empty temporary folder with their tools turned off, so they only chat. They can't read or change your files.

The sidebar's **CLI logins** panel shows whether the app found each CLI.

## Run it

Needs Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

To try the interface without either CLI, use fake streaming replies (macOS/Linux):

```bash
npm run dev:mock
```

On Windows, put `DUOBOT_MOCK=1` in `.env.local` and run `npm run dev`.

## Settings

Copy `.env.example` to `.env.local`:

| Variable | Meaning |
|---|---|
| `CLAUDE_BIN`, `GEMINI_BIN` | Path to each CLI if it isn't on your `PATH` |
| `CLAUDE_MODEL`, `GEMINI_MODEL` | Model override, e.g. `sonnet` or `gemini-2.5-pro` (empty = CLI default) |
| `CLI_TIMEOUT_MS` | Stop a reply after this long (default 5 min) |
| `DUOBOT_MOCK` | `1` = fake replies |

## How it works

- `src/lib/providers/`: runs `claude -p --output-format stream-json …` and `gemini --output-format stream-json …`, and turns their output into one text stream.
- `src/app/api/chat`: streams a reply as NDJSON. `src/app/api/status` checks which CLIs are installed.
- `src/store/`: conversations, turns, picks, shares and side chats (Zustand, saved to localStorage). `history.ts` builds each AI's own history.
- `src/components/`: the UI.

The app keeps the history itself and sends it to the CLI as a transcript on every call. That's how the two AIs keep separate threads, and how side chats work.

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`
