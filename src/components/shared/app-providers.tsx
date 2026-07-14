"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
