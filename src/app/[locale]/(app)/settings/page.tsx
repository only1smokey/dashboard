import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LanguageSelector } from "@/components/shared/language-selector";
import { PageHeading } from "@/components/shared/page-heading";
import { ThemeSelector } from "@/components/shared/theme-selector";
import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { mapPasskeyError } from "@/modules/auth/passkeys";
import { requireActiveUser } from "@/modules/auth/server/access";
import { PasskeyManager } from "@/modules/settings/components/passkey-manager";
import { SettingsPanel } from "@/modules/settings/components/settings-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const locale = (await getLocale()) as AppLocale;
  await requireActiveUser(locale);
  const [t, tPasskeys] = await Promise.all([
    getTranslations("Settings"),
    getTranslations("Passkeys"),
  ]);
  const supabase = await createClient();
  const { data: passkeys, error } = await supabase.auth.passkey.list();

  return (
    <div className="space-y-8">
      <PageHeading title={t("title")} description={t("intro")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsPanel
          title={t("appearanceTitle")}
          description={t("appearanceDescription")}
        >
          <ThemeSelector showLabel />
        </SettingsPanel>
        <SettingsPanel
          title={t("languageTitle")}
          description={t("languageDescription")}
        >
          <LanguageSelector />
        </SettingsPanel>
        <SettingsPanel
          className="lg:col-span-2"
          title={tPasskeys("security")}
          description={tPasskeys("securityDescription")}
        >
          <PasskeyManager
            initialPasskeys={passkeys ?? []}
            initialError={error ? mapPasskeyError(error) : null}
          />
        </SettingsPanel>
      </div>
    </div>
  );
}
