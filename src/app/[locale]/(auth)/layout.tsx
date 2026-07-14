import type { ReactNode } from "react";

import { LanguageSelector } from "@/components/shared/language-selector";
import { ThemeSelector } from "@/components/shared/theme-selector";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-svh items-center justify-center px-4 py-20 sm:px-6">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="w-40 sm:w-auto">
          <LanguageSelector />
        </div>
        <ThemeSelector />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
