import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "@/config/env";
import type { Database } from "@/lib/supabase/database.types";

interface VerifiedAuth {
  userId: string | null;
}

type ResponseFactory = (auth: VerifiedAuth) => NextResponse;

export async function updateSession(
  request: NextRequest,
  createResponse: ResponseFactory = () => NextResponse.next({ request }),
) {
  const { url, publishableKey } = getSupabaseConfig();
  let cookiesToApply: Array<{
    name: string;
    value: string;
    options: CookieOptions;
  }> = [];
  let headersToApply: Record<string, string> = {};

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        cookiesToApply = cookiesToSet;
        headersToApply = headers;
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const userId = error ? null : (data?.claims.sub ?? null);
  const supabaseResponse = createResponse({ userId });

  cookiesToApply.forEach(({ name, value, options }) => {
    supabaseResponse.cookies.set(name, value, options);
  });
  Object.entries(headersToApply).forEach(([name, value]) => {
    supabaseResponse.headers.set(name, value);
  });

  return supabaseResponse;
}
