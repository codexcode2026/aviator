import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. " +
      "Copy .env.example to .env and fill in your Supabase service role key.",
  );
}

/**
 * Server-side Supabase client using the service_role key.
 * Bypasses RLS — NEVER expose this key to the browser/client.
 * All financial mutations go through this client via RPC calls.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
