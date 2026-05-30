import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/apps"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // i18n: detect locale
  const acceptLang = req.headers.get("accept-language") ?? "";
  const locale = ["en", "es", "fr"].find((l) => acceptLang.toLowerCase().startsWith(l)) ?? "en";

  const res = NextResponse.next();
  res.headers.set("x-locale", locale);

  // Auth guard — redirect to login if no session cookie
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const token =
      req.cookies.get("__Secure-authjs.session-token") ??
      req.cookies.get("authjs.session-token");
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|api).*)"],
};