import { getCurrentUserAccess } from "@/modules/auth/server/access";
import { locationSearchSchema } from "@/modules/location/schemas";
import { searchLocations } from "@/modules/location/server/geocoding";

export async function GET(request: Request) {
  const user = await getCurrentUserAccess();
  if (!user?.isActive) {
    return Response.json({ error: "not_authorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const parsed = locationSearchSchema.safeParse({
    countryCode: searchParams.get("country"),
    language: searchParams.get("language"),
    query: searchParams.get("q"),
    type: searchParams.get("type"),
  });

  if (!parsed.success) {
    return Response.json({ error: "invalid_search" }, { status: 400 });
  }

  try {
    const results = await searchLocations(
      parsed.data.query,
      parsed.data.language,
      parsed.data.type,
      parsed.data.countryCode,
    );
    return Response.json(
      { results },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "search_unavailable" }, { status: 502 });
  }
}
