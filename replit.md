# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Affichages Hôtel — App Notes

### Auth Architecture
Clerk is Replit-managed. The Clerk instance does **not** have password auth enabled (OAuth-only). To work around this, we use a **ticket-based sign-in flow**:

1. User types username + password on the custom sign-in form.
2. Frontend POSTs to `POST /api/auth/login` (no Clerk dependency at this point).
3. Backend looks up the user in `hotel_users` table, validates the bcryptjs password hash.
4. Backend calls Clerk BAPI `POST /v1/sign_in_tokens` to create a one-time sign-in ticket for that user's Clerk ID.
5. Backend returns the token to the frontend.
6. Frontend calls `signIn.create({ strategy: 'ticket', ticket: token })` to complete the Clerk session.

This gives username-only login (no email shown to users) even though Clerk internally uses emails.

### Users Table
`hotel_users` (PostgreSQL via Drizzle):
- `clerk_user_id` (PK) — links to Clerk user
- `username` — what users type to sign in
- `password_hash` — bcryptjs hash
- `role` — "manager" or "utilisateur"

Manager seeded: username=`smarmet`, clerk_user_id=`user_3D3CSrDZyEo6YBClANGE5eWPko3`

### Roles
- **Manager** (`smarmet`): full features — font selector, custom arrow upload, banner PNG export, user management
- **Utilisateur**: PDF export only
