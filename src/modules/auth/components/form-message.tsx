import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FormMessage({
  children,
  variant = "error",
}: {
  children: ReactNode;
  variant?: "error" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm leading-5",
        variant === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-primary/25 bg-primary/10 text-foreground",
      )}
      role={variant === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
