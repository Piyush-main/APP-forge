import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PROTECTED_PATHS = ["/dashboard", "/apps", "/api/apps", "/api/notifications", "/api/analytics"];
const PUBLIC_PATHS    = ["/", "/builder", "/auth", "/api/generate", "/api/auth"];

const SUPPORTED_LOCALES = ["en", "es", "fr"];
const DEFAULT_LOCALE    = "en";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── i18n: detect locale from Accept-Language header ──────────────────
  // Injects x-locale header so layout/pages can render translated content
  const acceptLang = req.headers.get("accept-language") ?? "";
  const detectedLocale =
    SUPPORTED_LOCALES.find((l) => acceptLang.toLowerCase().startsWith(l)) ??
    DEFAULT_LOCALE;

  const res = NextResponse.next();
  res.headers.set("x-locale", detectedLocale);
  res.headers.set("x-pathname", pathname);

  // ── Auth guard ────────────────────────────────────────────────────────
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isPublic    = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !isPublic) {
    const session = await auth();
    if (!session) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Match everything except static files and Next internals
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)",
  ],
};
