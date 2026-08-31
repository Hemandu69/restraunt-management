#!/usr/bin/env node
// Controlled first-Manager provisioning for Supabase Auth.
//
// This is a local/admin CLI script - NOT an HTTP endpoint, and never wired
// into the frontend. It is the only sanctioned way to create a Manager:
// the `handle_new_auth_user` trigger (see
// supabase/migrations/*_create_profile_trigger.sql and
// *_rename_staff_to_waiter.sql) always assigns WAITER to every new signup,
// regardless of what the signup request claims, precisely so that
// promotion to MANAGER can only happen through a deliberate, server-side
// action like this one.
//
// Usage:
//   1. Create the user through Supabase Auth (sign up via the app, the
//      Supabase dashboard, or the admin API) - this gives them a WAITER
//      profile automatically.
//   2. Find that user's UUID: Supabase Dashboard > Authentication > Users.
//   3. Run this script with the server-side secret key:
//
//        SUPABASE_URL="https://<ref>.supabase.co" \
//        SUPABASE_SECRET_KEY="sb_secret_..." \
//        node supabase/scripts/promote-to-manager.mjs <user-uuid>
//
// SUPABASE_SECRET_KEY must be the secret/service-role key. It bypasses Row
// Level Security - which is exactly what lets this script do what a normal
// authenticated profile update is deliberately blocked from doing. Never
// put this key in frontend code, never commit it, never log it.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const userId = process.argv[2];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  fail("Set SUPABASE_URL and SUPABASE_SECRET_KEY in the environment first (never hardcode them).");
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!userId || !uuidPattern.test(userId)) {
  fail("Usage: node supabase/scripts/promote-to-manager.mjs <user-uuid>\n\nPass the auth.users UUID of the account to promote (see step 2 above).");
}

const headers = {
  apikey: SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?role=eq.MANAGER&select=id,name`, { headers });
if (!existingRes.ok) {
  fail(`Could not check existing Managers (${existingRes.status}): ${await existingRes.text()}`);
}
const otherManagers = (await existingRes.json()).filter((m) => m.id !== userId);
if (otherManagers.length > 0) {
  console.warn(`Note: ${otherManagers.length} other Manager account(s) already exist: ${otherManagers.map((m) => m.name).join(", ")}`);
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ role: "MANAGER" }),
});

if (!res.ok) {
  fail(`Failed to promote user (${res.status}): ${await res.text()}`);
}

const [updated] = await res.json();
if (!updated) {
  fail(`No profile found for id ${userId}. Create the user via Supabase Auth first, then retry.`);
}

console.log(`${updated.name} (${updated.id}) is now a MANAGER.`);
