import { House } from "lucide-react";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthCard({
  appName,
  title,
  description,
  children,
}: {
  appName: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="space-y-3 text-center">
        <div className="bg-primary text-primary-foreground mx-auto flex size-11 items-center justify-center rounded-xl">
          <House className="size-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {appName}
          </p>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="mx-auto max-w-sm leading-6">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
