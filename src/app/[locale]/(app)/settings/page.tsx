import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LanguageSelector } from "@/components/shared/language-selector";
import { PageHeading } from "@/components/shared/page-heading";
import { ThemeSelector } from "@/components/shared/theme-selector";
import { Accordion } from "@/components/ui/accordion";
import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { mapPasskeyError } from "@/modules/auth/passkeys";
import { requireActiveUser } from "@/modules/auth/server/access";
import { LocationSettingsForm } from "@/modules/location/components/location-settings-form";
import { getUserLocations } from "@/modules/location/server/data";
import { PasskeyManager } from "@/modules/settings/components/passkey-manager";
import { SettingsPanel } from "@/modules/settings/components/settings-panel";
import { PresenceSettingsForm } from "@/modules/presence/components/presence-settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const locale = (await getLocale()) as AppLocale;
  const user = await requireActiveUser(locale);
  const supabase = await createClient();
  const [t, tLocation, tPasskeys, tPresence, locations, passkeyResult] =
    await Promise.all([
      getTranslations("Settings"),
      getTranslations("Location"),
      getTranslations("Passkeys"),
      getTranslations("Presence"),
      getUserLocations(user.userId),
      supabase.auth.passkey.list(),
    ]);
  const homeLocation =
    locations.find((location) => location.kind === "home") ?? null;
  const viewingLocation =
    locations.find((location) => location.kind === "viewing") ?? null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeading title={t("title")} />
      <Accordion
        type="multiple"
        defaultValue={["location"]}
        className="bg-card text-card-foreground ring-foreground/10 min-w-0 rounded-xl shadow-xs ring-1"
      >
        <SettingsPanel value="appearance" title={t("appearanceTitle")}>
          <ThemeSelector showLabel />
        </SettingsPanel>
        <SettingsPanel value="language" title={t("languageTitle")}>
          <LanguageSelector />
        </SettingsPanel>
        <SettingsPanel value="presence" title={tPresence("preferencesTitle")}>
          <PresenceSettingsForm />
        </SettingsPanel>
        <SettingsPanel
          value="location"
          className="overflow-visible"
          title={tLocation("title")}
        >
          <LocationSettingsForm
            initialHomeLocation={homeLocation}
            initialViewingLocation={viewingLocation}
          />
        </SettingsPanel>
        <SettingsPanel value="security" title={tPasskeys("security")}>
          <PasskeyManager
            initialPasskeys={passkeyResult.data ?? []}
            initialError={
              passkeyResult.error ? mapPasskeyError(passkeyResult.error) : null
            }
          />
        </SettingsPanel>
      </Accordion>
    </div>
  );
}
