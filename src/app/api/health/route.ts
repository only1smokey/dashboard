import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      application: siteConfig.name,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
