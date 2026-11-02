import { NextResponse, type NextRequest } from "next/server";

/**
 * Optional password gate. When DUOBOT_PASSWORD is set, every page and API
 * call needs HTTP Basic auth (any username, that password). Off by default:
 * when hosted with Tailscale, only your own devices can reach the app anyway.
 */
export function proxy(req: NextRequest) {
  const password = process.env.DUOBOT_PASSWORD;
  if (!password) return NextResponse.next();

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const given = decoded.slice(decoded.indexOf(":") + 1);
      if (safeEqual(given, password)) return NextResponse.next();
    } catch {
      // malformed header: fall through to 401
    }
  }
  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="DuoBot", charset="UTF-8"' },
  });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const config = {
  // Skip Next's static files so the page can load its CSS/JS after login.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest).*)"],
};
