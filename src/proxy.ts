import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  return updateSession(request, () => handleI18nRouting(request));
}

export const config = {
  // API routes (including /api/health), Next.js internals, and static assets
  // remain independent of Supabase and locale session refreshes.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
