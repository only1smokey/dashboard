import type { AppLocale } from "../../i18n/routing.ts";
import { routing } from "../../i18n/routing.ts";

const publicAuthRoutes = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
]);

export interface LocalizedRoute {
  locale: AppLocale;
  pathname: string;
}

export function isAppLocale(value: string): value is AppLocale {
  return routing.locales.some((locale) => locale === value);
}

export function getLocalizedRoute(pathname: string): LocalizedRoute | null {
  const [, localeCandidate, ...rest] = pathname.split("/");

  if (!isAppLocale(localeCandidate)) {
    return null;
  }

  return {
    locale: localeCandidate,
    pathname: `/${rest.join("/")}`.replace(/\/$/, "") || "/",
  };
}

export function isPublicAuthRoute(pathname: string) {
  return publicAuthRoutes.has(pathname);
}

export function getLoginPath(locale: AppLocale) {
  return `/${locale}/login`;
}

export function getDisabledAccountPath(locale: AppLocale) {
  return `/${locale}/account-disabled`;
}

export function getSafeCallbackPath(
  locale: AppLocale,
  candidate: string | null,
) {
  const resetPasswordPath = `/${locale}/reset-password`;
  return candidate === resetPasswordPath ? candidate : getLoginPath(locale);
}

export function getSafePostAuthPath(
  locale: AppLocale,
  candidate: string | null | undefined,
) {
  const fallback = `/${locale}`;

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const base = new URL("https://family-dashboard.invalid");
    const target = new URL(candidate, base);
    const localizedRoute = getLocalizedRoute(target.pathname);

    if (
      target.origin !== base.origin ||
      !localizedRoute ||
      localizedRoute.locale !== locale ||
      isPublicAuthRoute(localizedRoute.pathname) ||
      localizedRoute.pathname === "/account-disabled"
    ) {
      return fallback;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

export function getPostAuthPathForAccess({
  isActive,
  locale,
  nextPath,
  preferredLocale,
}: {
  isActive: boolean;
  locale: AppLocale;
  nextPath?: string | null;
  preferredLocale: AppLocale;
}) {
  if (!isActive) {
    return getDisabledAccountPath(preferredLocale);
  }

  return nextPath
    ? getSafePostAuthPath(locale, nextPath)
    : `/${preferredLocale}`;
}
