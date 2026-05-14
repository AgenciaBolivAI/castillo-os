import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client scoped to the `brain` schema.
 *
 * Uses the service role key — safe because every call site is a server
 * component / server action behind the password gate. NEVER import this
 * into a client component.
 *
 * Requires the `brain` schema to be exposed to PostgREST:
 *   Supabase dashboard → Settings → API → Exposed schemas → add `brain`
 */
export function brainClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "brain" },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
