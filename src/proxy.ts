import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";
import {
  getLocalizedRoute,
  getLoginPath,
  isPublicAuthRoute,
} from "@/modules/auth/routing";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  return updateSession(request, ({ userId }) => {
    const localizedRoute = getLocalizedRoute(request.nextUrl.pathname);

    if (
      localizedRoute &&
      !isPublicAuthRoute(localizedRoute.pathname) &&
      !userId
    ) {
      return NextResponse.redirect(
        new URL(getLoginPath(localizedRoute.locale), request.url),
      );
    }

    return handleI18nRouting(request);
  });
}

export const config = {
  // API routes (including /api/health), Next.js internals, and static assets
  // remain independent of Supabase and locale session refreshes.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
