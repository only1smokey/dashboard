import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  const t = await getTranslations("Loading");

  return (
    <div className="space-y-8" role="status" aria-label={t("label")}>
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <span className="sr-only">{t("label")}</span>
    </div>
  );
}
