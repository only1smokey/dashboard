import type { ReactNode } from "react";

import { routing } from "@/i18n/routing";
import { isAppLocale } from "@/modules/auth/routing";
import { requireRole } from "@/modules/auth/server/access";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: candidate } = await params;
  const locale = isAppLocale(candidate) ? candidate : routing.defaultLocale;
  await requireRole(locale, "admin");
  return children;
}
