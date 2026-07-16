<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project conventions

- Keep the application small, private, and household-oriented. Do not add unrelated modules, fake data, charts, authentication, or Supabase connectivity unless requested.
- Use Server Components by default. Add `"use client"` only for browser interaction, and never import server-only configuration into a Client Component graph.
- Each feature belongs in `src/modules/<name>` and may own components, schemas, types, server operations, data access, constants, and tests as needed. Avoid empty folders and speculative layers.
- Application navigation comes only from `src/modules/registry.ts`. Register finished routes and add every user-facing string to `de`, `en`, and `bg` messages.
- Every module registry entry must explicitly declare `availability`: use `scope: "global"` or `scope: "restricted"` with ISO 3166-1 alpha-2 `countries` and/or `AF | AN | AS | EU | NA | OC | SA` `continents`. Availability follows the user's independently selected viewing country, never their home location. Restricted routes must call `requireModuleAvailability` on the server as well as relying on filtered navigation.
- Reuse the installed shadcn/ui and Radix components plus Lucide icons. Do not invent replacement UI primitives. Use semantic tokens from `globals.css`, visible focus, 44px mobile targets, and reduced-motion-safe interactions.
- Prefer existing platform capabilities and dependencies. Add maintained stable dependencies only when the current stack cannot solve the requirement.
- Production uses `output: "standalone"`. The runtime image must stay multi-architecture, non-root, minimal, and independent of development dependencies. The Pine64 pulls images; it never builds the app.
- Before UI, accessibility, container, or framework work, inspect and actively apply the relevant installed skills. Finish changes with formatting, lint, type-check, build, and proportionate browser/container verification.

# Future module contract

- Every future dashboard module must define in `src/modules/registry.ts`: a stable module ID, route, translation keys, country/continent availability, whether it requires an active viewing location, whether it requires coordinates, a generic Presence fallback, its optional rich Presence details, its Presence privacy classification, whether titles/details are sensitive, and whether viewing-location context is relevant.
- Country-specific availability and active-location requirements always use the independently selected viewing location, never the user's home or physical location. Use shared registry metadata and availability helpers; do not scatter country checks through components.
- Every module must use the shared Presence provider/API. Publish a generic activity whenever the module is open, add richer activity only when useful optional information exists, update only when meaningful values change, and clear the module activity or restore route activity when leaving.
- Module Presence identifiers are stable untranslated IDs. Rich titles, details, and viewing-location context are optional. Modules must work when they only have a generic activity, must not assume a title exists, and must classify media titles or other sensitive values before publishing.
- Future modules must not create another online system, create arbitrary Realtime channels, poll for online status, store activity history, broadcast translated strings as identifiers, require optional rich details, broadcast media titles when disabled, expose hidden details through the admin-status channel, treat the selected viewing location as physical location, ignore registry availability, ignore active viewing-location requirements, or replace shared module metadata/helpers with local country logic.
