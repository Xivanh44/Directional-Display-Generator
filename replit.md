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
No login required. The app opens directly to the editor. A "Manager" button in the header triggers a PIN dialog (hardcoded PIN: `1234` in `App.tsx` constant `MANAGER_PIN`). On success, `isManager` state is set to `true` for the session.

### Roles (local state, no server auth)
- **Default (everyone)**: format, arrow, text, logos, PDF export, bulk export, custom texts
- **Manager mode** (after PIN): font selector, custom arrow upload, arrow scale, banner PNG export

### Database / backend routes
The `hotel_users` table and `/api/auth/*` and `/api/admin/*` routes still exist in the codebase but are **no longer used by the frontend**. They can be removed in a future cleanup if desired.
