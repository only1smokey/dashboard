"use client";

import { startTransition } from "react";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function LanguageSelector() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Settings");

  function changeLocale(nextLocale: AppLocale) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <Select value={locale} onValueChange={changeLocale}>
      <SelectTrigger
        className="min-h-11 w-full sm:min-h-9 sm:w-64"
        aria-label={t("languageLabel")}
      >
        <Languages aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="de" className="min-h-11">
          {t("languageDe")}
        </SelectItem>
        <SelectItem value="en" className="min-h-11">
          {t("languageEn")}
        </SelectItem>
        <SelectItem value="bg" className="min-h-11">
          {t("languageBg")}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
