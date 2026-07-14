import "server-only";

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "@/config/env";

type ResponseFactory = () => NextResponse;

export async function updateSession(
  request: NextRequest,
  createResponse: ResponseFactory = () => NextResponse.next({ request }),
) {
  let supabaseResponse = createResponse();
  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = createResponse();

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          supabaseResponse.headers.set(name, value);
        });
      },
    },
  });

  // Validates a cookie-backed session and refreshes it when necessary.
  // Authorization must still be enforced at each protected operation.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
