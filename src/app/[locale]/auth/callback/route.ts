import { type NextRequest, NextResponse } from "next/server";

import { getAppUrl } from "@/config/env";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import {
  getLoginPath,
  getSafeCallbackPath,
  isAppLocale,
} from "@/modules/auth/routing";

function getPublicOrigin(request: NextRequest) {
  return getAppUrl() ?? request.nextUrl.origin;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: localeCandidate } = await params;
  const locale = isAppLocale(localeCandidate)
    ? localeCandidate
    : routing.defaultLocale;
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeCallbackPath(
    locale,
    request.nextUrl.searchParams.get("next"),
  );
  const publicOrigin = getPublicOrigin(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, publicOrigin));
    }
  }

  const loginUrl = new URL(getLoginPath(locale), publicOrigin);
  loginUrl.searchParams.set("error", "invalid-callback");
  return NextResponse.redirect(loginUrl);
}
