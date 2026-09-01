import { createClient } from "@supabase/supabase-js";
import { env } from "./env";
import type { Database } from "../types/database.types";

// Service-role client: bypasses Row Level Security entirely, exactly the
// trusted-server pattern documented in the payments RLS migration
// (supabase/migrations/*_configure_payments_rls.sql). SUPABASE_SECRET_KEY
// must only ever be read here, on the server - see .env.example.
//
// This is the one place in the backend that talks to Supabase Postgres;
// user accounts/auth remain on the separate Prisma/SQLite database (see
// config/database.ts) - see the payments table migration's comment for why
// this feature's data genuinely needs to live in Supabase while the rest of
// the app does not.
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
