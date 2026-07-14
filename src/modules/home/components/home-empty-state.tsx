import { LayoutDashboard } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function HomeEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed shadow-xs">
      <CardHeader className="items-center px-6 pt-10 text-center sm:px-10 sm:pt-14">
        <div className="bg-muted text-muted-foreground mb-2 flex size-12 items-center justify-center rounded-xl border">
          <LayoutDashboard className="size-5" aria-hidden="true" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="max-w-lg leading-6">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-10 sm:pb-14" />
    </Card>
  );
}
