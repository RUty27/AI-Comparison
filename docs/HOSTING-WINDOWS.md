# Host DuoBot on your Windows PC

This sets DuoBot up to:

- start by itself whenever you log in to Windows,
- run only on your PC (`127.0.0.1`), so nobody on your Wi-Fi or the internet can reach it,
- be reachable from **your** phone and laptop anywhere, privately, through [Tailscale](https://tailscale.com) (free for personal use).

Your PC has to be on and logged in for DuoBot to work.

---

## 1. Install the basics (once)

1. **Node.js LTS** (version 20 or newer): https://nodejs.org. Use the Windows installer and accept the defaults.
2. **Git**: https://git-scm.com/download/win
3. Open a **new** PowerShell window and get the code:

   ```powershell
   cd $HOME
   git clone https://github.com/ruty27/ai-comparison.git DuoBot
   cd DuoBot
   git checkout claude/blissful-euler-05uga3
   ```

## 2. Sign in to Claude and Gemini (once)

```powershell
npm install -g @anthropic-ai/claude-code @google/gemini-cli
claude
```

Follow the login in the browser, then type `/exit`. Next:

```powershell
gemini
```

Choose **Login with Google**, finish in the browser, then press `Ctrl+C` twice.

## 3. Set up Tailscale (once)

1. Install Tailscale on the PC from https://tailscale.com/download and sign in.
2. Install the Tailscale app on your phone (App Store / Play Store) and sign in with the **same account**.
3. In the Tailscale admin console, open https://login.tailscale.com/admin/dns and turn on **MagicDNS** and **HTTPS Certificates**.

## 4. Install DuoBot as an auto-start app

In PowerShell, inside the `DuoBot` folder:

```powershell
npm run autostart:install
```

This builds DuoBot, adds a "DuoBot" task to Windows Task Scheduler that starts it at log on, starts it now, and shares it on Tailscale. At the end it prints your private address, something like:

```
https://my-pc.tail1234.ts.net
```

Open that address on your phone with Tailscale switched on. To make it feel like an app:
- **iPhone:** Safari → Share → **Add to Home Screen**
- **Android:** Chrome → ⋮ → **Add to Home screen** / **Install app**

On the PC itself you can also use http://127.0.0.1:3000.

## Everyday commands

Run these in PowerShell inside the `DuoBot` folder:

| What | Command |
|---|---|
| Stop it (until next log on) | `npm run stop:windows` |
| Start it now | `npm run start:windows` (keeps the window open; close it to stop) |
| Get the latest version | `npm run update:windows` |
| Re-share on Tailscale | `npm run share:windows` |
| Remove auto-start and sharing | `npm run autostart:remove` |
| See what went wrong | open `logs\duobot.log` |

## Optional: add a password

Tailscale already lets in only devices on your account. If you share your Tailscale network with other people, create a file named `.env.local` in the `DuoBot` folder:

```
DUOBOT_PASSWORD=pick-something-long
```

Then run `npm run stop:windows` and `npm run start:windows` (or log out and back in). The browser will ask for a username (type anything) and the password.

## Troubleshooting

- **The phone can't open the address.** Check that Tailscale is switched on on the phone and the PC is awake. Set Windows to never sleep while plugged in: Settings → System → Power → *Screen and sleep*.
- **"Claude CLI not found" / "Gemini CLI not found" in an answer.** Run the step 2 commands again, then `npm run stop:windows` and `npm run start:windows`.
- **An answer says you're not logged in or your login expired.** Run `claude` or `gemini` again in PowerShell and sign in.
- **`autostart:install` says it couldn't create the task.** Open PowerShell with **Run as administrator** and run it again.
- **"running scripts is disabled".** Use the `npm run …` commands above; they already bypass that setting for DuoBot's scripts only.
- **Port 3000 is taken by another app.** Use another port, e.g. `powershell -ExecutionPolicy Bypass -File scripts\windows\install-autostart.ps1 -Port 3123`.
