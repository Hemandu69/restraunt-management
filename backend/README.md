# Restaurant Management System — Backend

Scope so far: **Authentication & Role Hierarchy** for a real dine-in restaurant.
Two roles: **Manager** (overview/management) and **Waiter** (operational: tables,
orders, billing — none of that is built yet). No menu, tables, orders, billing,
payments, or other operational modules are implemented yet. There is no
Deactivate-Waiter feature by design — see "Account status" below.

## Stack

- Node.js + Express + TypeScript
- Prisma ORM + SQLite (dev/test file database — swap `provider`/`DATABASE_URL` for
  PostgreSQL in production, no application code changes needed)
- JWT authentication delivered via an `httpOnly` cookie (also echoed in the login
  response body so non-browser clients can use it as a Bearer token)
- bcrypt (`bcryptjs`) password hashing
- Zod for request validation
- Vitest + Supertest for tests

> **Note:** this backend is a self-contained Express/Prisma/SQLite service; it does
> not call Supabase. A parallel Supabase-based database foundation also exists in
> `../supabase/` (Postgres, `auth.users` → `public.profiles`, RLS) for a possible
> future migration, but the two are not currently wired together. See the root
> [README](../README.md) for the full picture.

## Project layout

```
src/
  auth/            password hashing, JWT sign/verify
  authorization/   permission catalog + role -> permission map
  config/          env loading, Prisma client
  controllers/     thin HTTP handlers
  middleware/      authenticate, authorize (permission gate), error handler
  routes/          Express routers
  scripts/         seed:manager provisioning script
  services/        business logic (DB access via Prisma)
  utils/           ApiError, asyncHandler, response serializers
  validation/      Zod schemas
  app.ts           Express app factory (used by both server.ts and tests)
  server.ts        process entry point
prisma/
  schema.prisma    User model (role/status are TEXT + CHECK, see migrations)
  migrations/      generated SQL migrations
tests/             Vitest + Supertest suites
```

## Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set JWT_SECRET and INITIAL_MANAGER_* values
npm run prisma:migrate      # creates prisma/dev.db and applies the schema
npm run seed:manager        # provisions the first Manager from env vars
npm run dev                 # starts the API on http://localhost:4000
```

`npm run seed:manager` is idempotent: if a Manager already exists it does nothing, so
it is safe to run again. It is a local script, not an HTTP endpoint.

## Environment variables

See [`.env.example`](.env.example). Key ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma datasource connection string |
| `JWT_SECRET` | Signing secret for auth tokens — set a long random value |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins |
| `AUTH_COOKIE_NAME` | Name of the httpOnly cookie carrying the JWT |
| `INITIAL_MANAGER_*` | Used only by `npm run seed:manager` |

## Roles & permissions

| Role | Permissions | Responsibility |
|---|---|---|
| `MANAGER` | `VIEW_WAITERS`, `CREATE_WAITER`, `UPDATE_WAITER` | Overview/management: "how is my restaurant doing?" |
| `WAITER` | *(none yet)* | Operational: tables, orders, billing — "what do I need to handle?" (not built yet) |

Permissions are only defined for functionality that actually exists and is
enforced by a real route — see `src/authorization/permissions.ts`. Tables,
orders, billing, and menu permissions will be added when those modules are
built, not speculatively now.

## API endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | none | Sets the auth cookie, returns the user + token |
| GET | `/api/auth/me` | any authenticated user | Returns safe user profile |
| POST | `/api/auth/logout` | none | Clears the auth cookie |
| GET | `/api/waiters` | Manager (`VIEW_WAITERS`) | List all accounts (Waiters + the Manager's own row) |
| POST | `/api/waiters` | Manager (`CREATE_WAITER`) | Create a Waiter account (role is server-forced to `WAITER`) |
| GET | `/api/waiters/:id` | Manager (`VIEW_WAITERS`) | Get one account |
| PATCH | `/api/waiters/:id` | Manager (`UPDATE_WAITER`) | Update name/email/role |

All error responses use:

```json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "..." } }
```

### Account status (no deactivation feature)

`User.status` (`ACTIVE`/`INACTIVE`) still exists in the schema and still gates
login (`INACTIVE` → `401` on `/api/auth/login`), but there is deliberately **no**
route to change it — `PATCH /api/waiters/:id/status` was removed, along with its
permission and UI. The column is kept only because it may be useful for a future,
explicit account-administration feature; nothing in the current application
writes to it.

## Tests

```bash
npm test
```

Runs `prisma migrate deploy` against a dedicated SQLite test database
(`prisma/test.db`, via `.env.test`) and then the Vitest suite, covering login,
`/me`, RBAC enforcement, privilege-escalation attempts (Waiter trying to create
accounts, self-promote, or change another user's role), and confirming the
deactivation route no longer exists.
