import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeading } from "@/components/shared/page-heading";
import { HomeEmptyState } from "@/modules/home/components/home-empty-state";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Home");
  return { title: t("title") };
}

export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <div className="space-y-8">
      <PageHeading title={t("title")} description={t("intro")} />
      <HomeEmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    </div>
  );
}
