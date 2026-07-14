import { z } from "zod";

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .url()
    .refine((value) => new URL(value).protocol === "https:", {
      message: "must use HTTPS",
    }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .regex(/^sb_publishable_[A-Za-z0-9_-]+$/),
});

type SupabaseEnvInput = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export class SupabaseConfigurationError extends Error {
  constructor(variableNames: string[]) {
    super(
      `Supabase configuration is missing or invalid. Set valid values for: ${variableNames.join(", ")}.`,
    );
    this.name = "SupabaseConfigurationError";
  }
}

/**
 * Validates public Supabase configuration only when a Supabase client is used.
 * The direct process.env reads are required for Next.js to inline public values.
 */
export function getSupabaseConfig(
  input: SupabaseEnvInput = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
) {
  const result = supabaseEnvSchema.safeParse(input);

  if (!result.success) {
    const variableNames = [
      ...new Set(
        result.error.issues
          .map((issue) => issue.path[0])
          .filter((name): name is string => typeof name === "string"),
      ),
    ];

    throw new SupabaseConfigurationError(variableNames);
  }

  return {
    url: result.data.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
