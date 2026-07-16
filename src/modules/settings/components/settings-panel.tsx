import type { ReactNode } from "react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export function SettingsPanel({
  title,
  children,
  className,
  value,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  value: string;
}) {
  return (
    <AccordionItem value={value} className={cn("min-w-0", className)}>
      <AccordionTrigger className="min-h-14 w-full rounded-none px-3 py-2 sm:px-4">
        <span className="truncate text-base font-medium">{title}</span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="min-w-0 px-3 pb-3 sm:px-4 sm:pb-4">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}
