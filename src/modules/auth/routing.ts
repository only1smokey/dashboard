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
