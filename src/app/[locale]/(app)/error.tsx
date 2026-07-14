"use client";

import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  const t = useTranslations("Error");

  return (
    <Card className="mx-auto max-w-2xl shadow-xs">
      <CardHeader>
        <div className="bg-destructive/10 text-destructive mb-2 flex size-10 items-center justify-center rounded-lg">
          <CircleAlert className="size-5" aria-hidden="true" />
        </div>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="min-h-11" onClick={reset}>
          {t("retry")}
        </Button>
      </CardContent>
    </Card>
  );
}
