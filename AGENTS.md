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
