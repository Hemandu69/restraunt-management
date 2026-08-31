# Restaurant Management System — Frontend

Scope so far: **Authentication & Role Hierarchy** UI for a real dine-in
restaurant, with two roles — **Manager** (overview/management) and **Waiter**
(operational: tables, orders, billing). No tables/orders/billing/menu screens
exist yet; Waiters currently see a "Tables" placeholder.

## Stack

- React + TypeScript (Vite)
- React Router for protected, role-aware routing
- Axios for API calls (httpOnly-cookie session, `withCredentials: true`)

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # point VITE_API_URL at your backend
npm run dev                  # http://localhost:5173
```

The backend must be running (see `../backend/README.md`) and its `CORS_ORIGIN`
must include this app's origin.

## Structure

```
src/
  api/          axios client + typed calls (auth, waiters)
  components/   Navbar, ProtectedRoute, Modal, Alert, Badge, Avatar, EmptyState
  context/      AuthContext (current user, login/logout, session bootstrap)
  pages/        Login, Manager Dashboard, Waiters, Tables, Not Found
  lib/          role -> home-route mapping, denied-route notice hook
  types/        shared TS types
```

## Routing & role behaviour

| Route | Who can view it | Notes |
|---|---|---|
| `/login` | Anyone signed out | Redirects signed-in users to their home |
| `/dashboard` | Manager only | Overview placeholder (future KPIs: revenue, orders, table/waiter activity) |
| `/waiters` | Manager only | Create/edit waiter accounts (no deactivation — see below) |
| `/tables` | Waiter only | Placeholder for the future table/order/bill workspace |

Manager navigation: `Dashboard`, `Waiters`. Waiter navigation: `Tables`. Only
routes that exist today and that the signed-in role may use are ever shown —
navigation does not list disabled/future items (Menu, Sales, Reports, Orders,
...).

A role mismatch (e.g. a Waiter loading `/dashboard` directly) redirects
straight to that role's own home page with a brief explanatory notice — the
gated page is never rendered, not even momentarily.

**Important:** this route gating is a UX convenience only. Every action a
Waiter could reach by editing the frontend, or by calling the API directly
(curl/Postman), is independently rejected by the backend's authorization
middleware. See `../backend/README.md`.

## No deactivation UI

There is intentionally no Activate/Deactivate control anywhere in this app.
The backend's `status` field and login-time `ACTIVE` check still exist, but
account deactivation is not a current product feature — see
`../backend/README.md#account-status-no-deactivation-feature`.
