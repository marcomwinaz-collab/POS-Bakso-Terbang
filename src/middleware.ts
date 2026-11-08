import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_PATHS, SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL(session.role === "ADMIN" ? "/dashboard" : "/kasir", req.url));
    return NextResponse.next();
  }

  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  if (session.role !== "ADMIN" && ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL("/kasir", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.svg|api/health).*)"],
};
