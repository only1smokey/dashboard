import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  const tCommon = await getTranslations("Common");

  return (
    <Card className="mx-auto max-w-2xl text-center shadow-xs">
      <CardHeader className="items-center pt-10">
        <div className="bg-muted text-muted-foreground mb-2 flex size-12 items-center justify-center rounded-xl border">
          <SearchX className="size-5" aria-hidden="true" />
        </div>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription className="max-w-md leading-6">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-10">
        <Button asChild className="min-h-11">
          <Link href="/">{tCommon("backHome")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
