@AGENTS.md

# WDCC Dashboard

Internal exec dashboard: task board, go-links, Fly.io monitoring, member admin.

## Stack

| Layer   | Choice                                                     |
| ------- | ---------------------------------------------------------- |
| Runtime | Next.js 16 (App Router, RSC), React 19, TypeScript strict  |
| Data    | PostgreSQL (Neon) via Drizzle ORM, `pg` Pool               |
| Auth    | Better Auth, Google OAuth only, DB-backed allowlist        |
| UI      | shadcn/ui (`radix-nova` style), Radix, Tailwind v4, lucide |
| Client  | TanStack Query, dnd-kit, sonner                            |
| Package | pnpm (`packageManager` pinned)                             |

## Commands

```bash
pnpm dev            # next dev
pnpm build          # next build
pnpm start          # next start
pnpm lint           # eslint (flat config, next + prettier)
pnpm format         # prettier --write .
pnpm db:generate    # drizzle-kit generate (writes server/db/drizzle/)
pnpm db:check       # validate the migration chain (no DB connection)
pnpm db:migrate     # apply migrations
pnpm db:push        # dev only
pnpm db:studio      # drizzle studio
pnpm db:seed        # tsx --env-file=.env server/db/seed.ts
```

No test runner is configured. Do not invent `pnpm test`.

CI (`.github/workflows/ci.yml`) runs `lint`, `format:check`, `build`, then
`tsc --noEmit` on every PR. The build step needs dummy `DATABASE_URL` /
`GOOGLE_CLIENT_*` because `server/env.ts` throws at import; `tsc` runs after the
build because `tsconfig.json` includes the `.next/types` the build generates.
Prettier skips `pnpm-lock.yaml`, `.next/` and `server/db/drizzle/` — generated
files would fail `format:check` after the next `db:generate`.

## Layout

| Path                     | Contents                                                                                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(dashboard)/`       | Authed pages: `/`, `/admin`, `/tasks`, `/linktree`, `/tech`, `/projects`. Layout calls `requireUser()`.                                                                                                    |
| `app/(auth)/sign-in/`    | Server Component; reads `?error=` / `?from=` and renders `components/auth/`                                                                                                                                |
| `app/api/auth/[...all]/` | Better Auth handler via `toNextJsHandler`                                                                                                                                                                  |
| `proxy.ts`               | Next 16 proxy (NOT `middleware.ts`) — cookie-presence redirect, negative matcher; not enforcement                                                                                                          |
| `server/`                | Server-only; every file starts `import "server-only"`. `env`, `cloudflare`, `db/`, `auth/` (`index`, `access`), `profile/` (`queries`, `mutations`), and the domains `admin`, `tasks`, `linktree`, `flyio` |
| `lib/`                   | Browser-safe: `auth-client`, `auth-errors`, `profile` (`normalizeEmail` only), `date`, `form-parser`, `types`, `utils`, `tasks/`, `home/`, `flyio/` (types, utils)                                         |
| `components/`            | `ui/` is shadcn-generated; feature dirs `auth/`, `admin/`, `tasks/`, `tech/`                                                                                                                               |
| `hooks/`                 | `use-mobile`, `use-task-drag-drop`, `use-task-form`                                                                                                                                                        |

Import alias: `@/*` -> repo root.

## Auth model

- Sign-in is Google OAuth only; account linking disabled.
- The allowlist is the `profile` table, keyed by lowercase email. `isAllowed()` = row exists. A `databaseHooks.user.create.before` hook throws `NotAllowedError` for unknown emails, so non-allowlisted users never get a user row.
- Auth failures surface as `/sign-in?error=<code>` (`onAPIError.errorURL`). **`APIError.message` IS the error code** — `NotAllowedError` / `AllowlistLookupError` pass a key from `AUTH_ERROR_CODES`, and Better Auth forwards that message verbatim as the query param. Giving them a human-readable message instead silently degrades every rejection to the generic "Sign-in failed" panel. Copy lives in `lib/auth-errors.ts`; never render provider-supplied `error_description` (phishing vector).
- **All signed-in users are admins.** `requireUser` (`server/auth/access.ts`) is the intended and sufficient gate — including on `/admin` actions. Do not add `requireAdmin` or role checks unless explicitly asked.
- `requireUser()` (via the internal `resolveSession()` in `server/auth/access.ts`) re-checks the allowlist on every request and signs the user out if their profile was removed; it fails closed on DB errors.
- `proxy.ts` only checks that a session cookie exists — it never validates it. Its matcher is a negative pattern covering everything except `/sign-in`, `/api/auth`, and static assets, so new routes are gated by default. It saves an RSC render on signed-out requests; it is never enforcement.
- Call `requireUser()` at **every** entry point: every exported server action, and every page that fetches data or schedules `after()` work. The layout gate is not sufficient on its own — layout and page render concurrently, so the layout's redirect cannot stop the page's fetches from running. Keep the layout call anyway: it supplies the session for `UserMenu` and is the only gate on pages that fetch nothing.
- Redundant `requireUser()` calls are free. `resolveSession()` is wrapped in React `cache()`, so it resolves once per request no matter how many actions call it.
- Better Auth is configured with `session.cookieCache` (5 min), so `getSession()` usually reads a signed cookie instead of hitting the database. Session revocation can lag by the TTL; the allowlist check in `resolveSession()` is always live, so removing a profile revokes access immediately.
- Server actions are the trust boundary: every exported action starts with `await requireUser()`.

## Data layer

- Schema: `server/db/schema/{auth,profile,golinks,tasks,enums}.ts`, re-exported from `index.ts`; `drizzle.config.ts` points at the directory.
- Migrations are committed SQL in `server/db/drizzle/` with `meta/_journal.json`. Change schema -> `pnpm db:generate` -> commit the generated SQL. Never hand-edit applied migrations.
- History was rebaselined to a single `0000_baseline.sql` (generated from the schema, verified against the live DB by introspection). `meta/` snapshots are the generator's state, not decoration: hand-writing SQL is fine, but the snapshot must still come from `db:generate`, which is the step that mints the `id`/`prevId` chain. Copying a previous snapshot forward breaks `generate` and nothing else, so it surfaces long after the fact.
- CI runs `pnpm db:check` (chain validation) and re-runs `db:generate`, failing if it writes anything — a schema change without a migration, or a hand-written migration with a stale snapshot, both surface as an uncommitted file.
- `db:*` scripts pass `--conditions=react-server` because drizzle-kit and `db:seed` load `server/` modules outside Next's bundler, where `import "server-only"` otherwise throws.
- Emails are lowercase everywhere, enforced by `check` constraints on `user.email`, `profile.email`, `tag.name`. Always route through `normalizeEmail()`.
- `profile.email` is the primary key and the FK target for `task_assignee` (`onUpdate: cascade`). `profile.kind` is `personal` | `shared`; shared mailboxes can be task assignees but are excluded from Cloudflare access sync.
- Enums come from `lib/types.ts` const arrays (`TASK_STATUSES`, `TASK_PRIORITIES`, `TEAMS`, `PROFILE_KINDS`); add values there, then regenerate.

## Task board semantics

Column identity is derived, not stored (`lib/tasks/utils.ts`, `lib/tasks/types.ts`):

- `backlog` = status `backlog`, zero assignees (invariant).
- per-user column = status `active` and that email in `task_assignee`.
- `done` = status `done`; `completedAt` set on entry, cleared on exit; `listTasks` drops done tasks older than 30 days and any `deletedAt` row.
- Ordering: `task.position` for backlog/done; `task_assignee.position` for user columns. Active rows have `task.position` zeroed. Positions are fractional midpoints; `moveTask` takes `pg_advisory_xact_lock` on both columns and rebalances when the gap falls under `1e-6`.
- Mutations flow through TanStack Query hooks in `lib/tasks/queries.ts` with optimistic updates plus a snapshot rollback; server actions revalidate `/tasks`.

## Conventions

- Server actions validate input with zod (`server/tasks/actions.ts`) or the `lib/form-parser.ts` helpers for `FormData`; they throw plain `Error` with a readable message.
- Reads stay side-effect free. Deferred work uses `after()` from `next/server` (expired go-links hidden after render, Cloudflare sync after admin writes). Exception: `removeProfileAction` syncs Cloudflare inline because revoking access must complete before returning.
- "Today" is always `getTodayIso()` from `lib/date.ts` (Pacific/Auckland) and is passed into queries rather than using `CURRENT_DATE`.
- Prettier: double quotes, semicolons, 2 spaces, width 80. Several files were committed with tabs; run `pnpm format` on files you touch.

## Gotchas

- Next 16: the request-interception file is `proxy.ts` exporting `proxy()`, not `middleware.ts`. Read `node_modules/next/dist/docs/` before using any Next API.
- `server/env.ts` validates only `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and throws at import. `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` are read by Better Auth itself; `CLOUDFLARE_*` are read lazily in `server/cloudflare.ts`.
- `ALLOWED_EMAILS` appears in `.env.example` but no code reads it. The allowlist is the `profile` table.
- `server/flyio/config.ts` uses `fs` at module load: server-only. Tokens come from `FLY_TOKENS` (JSON object of `org-slug -> token`) or a gitignored `fly-tokens.json`. With neither, `/tech` renders an empty state.
- `syncDocsAccessGroup()` refuses to push an empty allowlist and serializes writes in-process; failures are surfaced through the Resync button on `/admin`.
- `/projects` is a placeholder page.
