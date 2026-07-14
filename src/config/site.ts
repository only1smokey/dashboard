import { z } from "zod";

const siteConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

export const siteConfig = siteConfigSchema.parse({
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Family Dashboard",
  description: "A private, modular household dashboard.",
});
