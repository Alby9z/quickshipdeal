import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Filtre rapide : les zones /compte et /admin exigent un cookie de session.
 * La vérification réelle (session valide, rôle, permission) est faite côté serveur
 * dans chaque page et chaque action — ce middleware n'est qu'une première barrière.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/compte")) {
    if (!getSessionCookie(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/connexion";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/compte/:path*"] };
