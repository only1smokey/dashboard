import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getTranslations } from "next-intl/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Common");

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground fixed top-3 left-3 z-50 -translate-y-20 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        {t("skipContent")}
      </a>
      <AppSidebar />
      <SidebarInset id="main-content" className="min-w-0">
        <AppHeader />
        <div className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
