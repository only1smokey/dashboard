"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { hasActiveRole } from "@/modules/auth/authorization";
import { getDisabledAccountPath, getLoginPath } from "@/modules/auth/routing";
import {
  forgotPasswordSchema,
  localeSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/modules/auth/schemas";

export type AuthActionError =
  | "invalidFields"
  | "authenticationFailed"
  | "requestFailed"
  | "invalidResetLink"
  | "passwordUpdateFailed";

export type AuthActionResult =
  { status: "success" } | { status: "error"; error: AuthActionError };

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

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const origin = getValidOrigin(requestHeaders.get("origin"));

  if (origin) {
    return origin;
  }

  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" ? "http" : "https";

  return getValidOrigin(host ? `${protocol}://${host}` : null);
}

export async function loginAction(input: unknown): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "error", error: "invalidFields" };
  }

  const { email, password, locale } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { status: "error", error: "authenticationFailed" };
  }

  const [
    { data: authorization, error: authorizationError },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role, is_active")
      .eq("user_id", data.user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("preferred_locale")
      .eq("id", data.user.id)
      .maybeSingle(),
  ]);

  if (authorizationError || !authorization) {
    await supabase.auth.signOut();
    return { status: "error", error: "authenticationFailed" };
  }

  if (
    !hasActiveRole({
      role: authorization.role,
      isActive: authorization.is_active,
    })
  ) {
    redirect(getDisabledAccountPath(profile?.preferred_locale ?? locale));
  }

  redirect(`/${profile?.preferred_locale ?? locale}`);
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

  await supabase.auth.signOut();
  redirect(getLoginPath(locale));
}
