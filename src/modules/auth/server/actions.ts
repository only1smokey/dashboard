"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAppUrl } from "@/config/env";
import { createClient } from "@/lib/supabase/server";
import { hasActiveRole } from "@/modules/auth/authorization";
import { getLoginPath, getPostAuthPathForAccess } from "@/modules/auth/routing";
import {
  forgotPasswordSchema,
  localeSchema,
  loginSchema,
  passkeySignInSchema,
  resetPasswordSchema,
} from "@/modules/auth/schemas";

export type AuthActionError =
  | "invalidFields"
  | "authenticationFailed"
  | "requestFailed"
  | "invalidResetLink"
  | "passwordUpdateFailed";

export type AuthActionResult =
  | { status: "success"; redirectTo?: string }
  | { status: "error"; error: AuthActionError };

function getValidOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

async function completeAuthenticatedSignIn({
  locale,
  nextPath,
  supabase,
  userId,
}: {
  locale: "de" | "en" | "bg";
  nextPath?: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}): Promise<AuthActionResult> {
  const [
    { data: authorization, error: authorizationError },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role, is_active")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("preferred_locale")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (authorizationError || !authorization) {
    await supabase.auth.signOut();
    return { status: "error", error: "authenticationFailed" };
  }

  const preferredLocale = profile?.preferred_locale ?? locale;
  return {
    status: "success",
    redirectTo: getPostAuthPathForAccess({
      isActive: hasActiveRole({
        role: authorization.role,
        isActive: authorization.is_active,
      }),
      locale,
      nextPath,
      preferredLocale,
    }),
  };
}

async function getRequestOrigin() {
  const configuredAppUrl = getAppUrl();

  if (configuredAppUrl) {
    return configuredAppUrl;
  }

  const requestHeaders = await headers();
  const origin = getValidOrigin(requestHeaders.get("origin"));

  if (origin) {
    return origin;
  }

  const host = requestHeaders.get("host");
  const protocol = host?.startsWith("localhost:") ? "http" : "https";

  return getValidOrigin(host ? `${protocol}://${host}` : null);
}

export async function loginAction(input: unknown): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "error", error: "invalidFields" };
  }

  const { email, password, locale, nextPath } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { status: "error", error: "authenticationFailed" };
  }

  return completeAuthenticatedSignIn({
    locale,
    nextPath,
    supabase,
    userId: data.user.id,
  });
}

export async function completePasskeySignInAction(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = passkeySignInSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "error", error: "invalidFields" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { status: "error", error: "authenticationFailed" };
  }

  return completeAuthenticatedSignIn({
    locale: parsed.data.locale,
    nextPath: parsed.data.nextPath,
    supabase,
    userId: data.user.id,
  });
}

export async function requestPasswordResetAction(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "error", error: "invalidFields" };
  }

  const origin = await getRequestOrigin();

  if (!origin) {
    return { status: "error", error: "requestFailed" };
  }

  const { email, locale } = parsed.data;
  const supabase = await createClient();

  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/${locale}/auth/callback?next=/${locale}/reset-password`,
    });
  } catch {
    return { status: "error", error: "requestFailed" };
  }

  // A generic success response prevents account enumeration, including when
  // Supabase declines a request for a provider-specific reason.
  return { status: "success" };
}

export async function resetPasswordAction(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "error", error: "invalidFields" };
  }

  const { password, locale } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { status: "error", error: "invalidResetLink" };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return { status: "error", error: "passwordUpdateFailed" };
  }

  await supabase.auth.signOut();
  redirect(`${getLoginPath(locale)}?status=password-updated`);
}

export async function logoutAction(localeInput: string) {
  const parsedLocale = localeSchema.safeParse(localeInput);
  const locale = parsedLocale.success ? parsedLocale.data : "de";
  const supabase = await createClient();

  await supabase.rpc("touch_own_presence_last_seen");
  await supabase.auth.signOut();
  redirect(getLoginPath(locale));
}
