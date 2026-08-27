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

| Path                     | Contents                                                                                                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(dashboard)/`       | Authed pages: `/`, `/admin`, `/tasks`, `/linktree`, `/tech`, `/projects`. Layout calls `requireUser()`.                                                                                                                                                                    |
| `app/(auth)/sign-in/`    | Server Component; reads `?error=` / `?from=` and renders `components/auth/`                                                                                                                                                                                                |
| `app/api/auth/[...all]/` | Better Auth handler via `toNextJsHandler`                                                                                                                                                                                                                                  |
| `proxy.ts`               | Next 16 proxy (NOT `middleware.ts`) — cookie-presence redirect, negative matcher; not enforcement                                                                                                                                                                          |
| `server/`                | Server-only; every file starts `import "server-only"`. `env`, `cloudflare`, `db/`, `auth/` (`index`, `access`), `profile/` (`queries`, `mutations`), and the domains `admin`, `tasks`, `tags`, `linktree`, `flyio`; `go` (outbound cache purge)                            |
| `lib/`                   | Browser-safe, pure: `auth-client`, `auth-errors`, `profile` (`normalizeEmail` only), `date`, `form-parser`, `types`, `utils`, `tasks/`, `tags/`, `home/`, `linktree/` (types), `flyio/` (types, utils). No value imports from `@/server/` (eslint `no-restricted-imports`) |
| `components/`            | `ui/` is shadcn-generated; feature dirs `auth/`, `admin/`, `tasks/`, `tech/`, `linktree/`                                                                                                                                                                                  |
| `hooks/`                 | `use-mobile`; `tasks/` (`query-options`, `use-tasks`, `use-board-sync`, `use-task-drag-drop`, `use-task-form`, `use-view-mode`); `flyio/` (`query-options`, `use-fly-queries`)                                                                                             |

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
- Migrations are committed SQL in `server/db/drizzle/` with `meta/_journal.json`. Change schema -> `pnpm db:generate` -> commit the generated SQL. **Never hand-create a migration file, and never hand-edit an applied one.** Always let drizzle-kit mint the file: `pnpm db:generate` for schema changes, `pnpm db:generate --custom` for a data-only migration (empty file, correct journal entry). It is the mint step that writes the `id`/`prevId` chain and the `meta/` snapshot.
- History was rebaselined to a single `0000_baseline.sql` (generated from the schema, verified against the live DB by introspection). `meta/` snapshots are the generator's state, not decoration: the snapshot must always come from `db:generate`. Adding statements to a freshly generated, **unapplied** file is allowed and is sometimes the only option — `db:generate` diffs the schema and emits DDL only, so a data backfill, a `setval`, or a backfill-then-`SET NOT NULL` sequence can never be generated. CI's drift guard re-runs `db:generate` and fails if it writes anything, which enforces that the snapshot matches the schema — not that the SQL was untouched. Copying a previous snapshot forward breaks `generate` and nothing else, so it surfaces long after the fact.
- CI runs `pnpm db:check` (chain validation) and re-runs `db:generate`, failing if it writes anything — a schema change without a migration, or a hand-written migration with a stale snapshot, both surface as an uncommitted file.
- `db:*` scripts pass `--conditions=react-server` because drizzle-kit and `db:seed` load `server/` modules outside Next's bundler, where `import "server-only"` otherwise throws.
- Emails are lowercase everywhere, enforced by `check` constraints on `user.email`, `profile.email`, `tag.name`. Always route through `normalizeEmail()`.
- `profile.email` is the primary key and the FK target for `task_assignee` (`onUpdate: cascade`). `profile.kind` is `personal` | `shared`. Both kinds sign in, reach every page, and sync to the Cloudflare access group; `shared` differs only on the task board, where `listUsers` and `assertProfilesExist` both filter to `personal` so role accounts get no column and cannot be assigned.
- Enums come from `lib/types.ts` const arrays (`TASK_STATUSES`, `TASK_PRIORITIES`, `TEAMS`, `PROFILE_KINDS`); add values there, then regenerate.

## Task board semantics

Column identity is derived, not stored (`lib/tasks/utils.ts`, `lib/tasks/types.ts`):

- `backlog` = status `backlog`, zero assignees (invariant).
- per-user column = status `active` and that email in `task_assignee`.
- `done` = status `done`; `completedAt` set on entry, cleared on exit; `listTasks` drops done tasks older than 30 days and any `deletedAt` row.
- Ordering is derived, never stored: `compareTasks` in `lib/tasks/utils.ts` sorts every column but `done` by priority (high first, unset last), then due date ascending (unset last), then `number` descending. `done` uses `compareDoneTasks` — `completedAt` descending, then `number` descending. `lib/home/summary.ts` sorts "My Day" with the same `compareTasks`, so the board and the home page never disagree.
- `task.number` is a `generatedByDefaultAsIdentity` integer, unique and immutable — the user-facing `#42` handle and the stable final tiebreak. Never reuse or renumber it.
- **`TASK_PRIORITIES` order is load-bearing.** `priorityRank` is `TASK_PRIORITIES.indexOf(p)`, so the array must stay in ascending urgency (`low`, `med`, `high`); a new value goes at its urgency position, not the end. Reordering it silently reorders every board column, and nothing fails to compile.
- Drag-and-drop moves a task between columns only — there is no within-column position. `moveTask` (`server/tasks/mutations/move.ts`) just reconciles `status`, `task_assignee` rows and `completedAt`; task record writes live in `mutations/task.ts` and the two files share no helper. Cards are dnd-kit `useDraggable`, not sortables.
- Mutations flow through TanStack Query hooks in `hooks/tasks/use-tasks.ts` with optimistic updates plus a snapshot rollback; server actions revalidate `/tasks`.
- Clicking a task in either view opens `TaskDetailDialog` read-only — description, tags, assignees and links as real anchors — with an Edit button that swaps the body for `TaskFormFields` in the same dialog. Cancel returns to view mode rather than closing; `mode` resets to `view` on every open.

### List view

`/tasks` renders one of two views, both fed by the same `taskKeys.all` cache —
no extra action, query or round trip. `TasksView.tsx` is the shell (state,
mutations, team filter, dialogs, the view toggle); `TasksKanban.tsx` owns
`DndContext` / `DragOverlay` / columns / `useTaskDragDrop`, `TasksList.tsx` owns
the list. Only the shell is a default export, imported by the page.

- The list groups by **status** — In progress / Backlog / Done — not by person,
  and sorts with `statusTasks` (`lib/tasks/utils.ts`), whose comparator switch
  mirrors `colTasks`. A team filter therefore shows every matching active task,
  including ones assigned to someone off that team, which the kanban renders in
  no column at all.
- Rows share one CSS grid across all three sections through nested
  `grid-cols-subgrid`, so the badge columns line up down the whole list. Below
  `sm` the badge cluster wraps to a second line (`sm:contents` on its wrapper).
- The list has no drag, so every row carries its own move affordances: a done
  toggle, plus a `⋯` menu with Backlog and Done. **In progress is not on that
  menu** — a task is active because someone is assigned, so that transition goes
  through the edit dialog, where `useUpdateTaskMutation` derives `active` from a
  non-empty assignee list.
- `taskColId(task)` supplies a move's `from`. An `active` task with zero
  assignees falls back to `backlog`: `user-undefined` would fail
  `moveTaskSchema`'s `z.email()`, and the list is the first surface that renders
  such a row.
- **Moving to Backlog passes `from: backlog`, not the task's real column.** The
  user branch of `moveTask` only drops that one assignee and leaves a
  multi-assignee task `active` (`move.ts:24-37`); the non-user branch wipes them
  all (`:38-43`), which is what "send it back" means without a column to drag
  out of.
- `applyDragLocal` maintains `completedAt` (set on entering done, `null` on
  leaving) so a completed row sorts to the top of Done immediately instead of
  jumping when the refetch lands.
- Row controls are disabled while that row's own move is in flight
  (`usePendingMoveTaskIds`, reading pending move mutations' `variables`).
  `onMutate` snapshots before applying, so a second move on the same row would
  roll back to the first one's optimistic state.
- **List is the default**; the board is opt-in. An unset or unrecognised cookie value falls back to `list`.
- View choice persists in the `tasks_view` cookie (`lib/tasks/view.ts`, written
  by `useViewMode`, read by the page and passed down as `defaultView`) — seeded
  server-side, so there is no post-hydration flash. `lib/tasks/view.ts` is not
  in the hook because an RSC importing a value from a `"use client"` module gets
  a client reference that throws when called.
- The toggle is disabled while dragging, and `TasksKanban` clears `activeTaskId`
  on unmount: a view switch mid-drag would otherwise never fire `onDragEnd` and
  pin `useBoardSync`'s pause gate on forever, with `BoardSyncStatus` still
  showing a green dot.

### Live board sync

- A focused tab polls `getBoardVersionAction()` every `BOARD_POLL_MS` (10s, `hooks/tasks/query-options.ts`). One row, ~40 bytes — a full-board tick would sit in the same serialized Server Function lane as the user's next `moveTaskAction` and delay it. On a changed signature the probe invalidates `taskKeys.all`, which is the only thing that fetches.
- The signature is `` `${count}:${max(updated_at)}` `` over the visible set (`getBoardVersion`, sharing `visibleTasksWhere` with `listTasks` so the predicates cannot drift). **Compare with equality, never `>`** — a soft delete or done-retention fall-off drops a row, so `max` can move backwards; `count` catches it. `profile` and `tag` stay out: both live-refresh bugs are triggered by a task row changing, so `task.updatedAt` already moves.
- **`getBoardAction` and the `/tasks` page derive their version from the rows `listTasks` just returned (`boardVersionOf`), never a second query** — two independent SELECTs get separate READ COMMITTED snapshots, and a write landing between them yields a version newer than its own tasks: `onBoard` stores it in `appliedRef`, every later probe compares equal, and the board is wedged on stale data until an unrelated write moves the signature. `getBoardVersion()` is the probe's query only. A transaction does not fix this — READ COMMITTED re-snapshots per statement.
- `users` and `tags` flow through `taskKeys.meta` after first paint, not props. The board queryFn fans them out via `onBoard`; the meta entry is `skipToken` and never fetches. Props are seed-only. Without this, a remotely-created tag is silently dropped from a task on the next local edit (`tagIdByName` miss) and a task assigned to a newly-added profile renders in no column.
- Query keys are **flat siblings** (`["tasks"]`, `["tasks-meta"]`, `["tasks-version"]`). RQ matches by prefix, so nesting them under `["tasks"]` would sweep them into every existing `invalidateQueries({ queryKey: taskKeys.all })` — and the probe would pause itself through the `useIsFetching` gate.
- Three pause gates in `useBoardSync`: dragging (measured dnd-kit column rects go stale), `useIsMutating()` (the window between the optimistic write and `onSettled`), and an in-flight board fetch. `enabled: !paused` kills the interval; `staleTime: 0` makes un-pause and window focus probe immediately. Drag state therefore lives in `TasksView`, not `useTaskDragDrop` or `TasksKanban` — the gate has to be reactive.
- The invalidate effect is keyed on `probe.dataUpdatedAt`, one board fetch per tick at most: a board fetch can return a version newer than the probe's, and keying on the value alone spins on every un-pause until the next tick. A failed board fetch leaves `appliedRef` behind and retries on the next tick.
- `refetchIntervalInBackground: false` — hidden tabs stop probing, which is what lets Neon's compute autosuspend. `refetchOnWindowFocus: true` on the probe only; the global default in `app/providers.tsx` stays `false` or every Fly.io query on `/tech` wakes on focus.
- Remote changes apply silently — no toast. `BoardSyncStatus` shows a permanent state dot (live / hidden-tab / stalled) and only surfaces text plus Retry after two consecutive probe failures. It is deliberately not driven by the pause gates or `isFetching`, which clear within a second and would strobe.

## Conventions

- Server actions validate input with zod (schemas live in `lib/<domain>/schemas.ts`) or the `lib/form-parser.ts` helpers for `FormData`; they throw plain `Error` with a readable message.
- Inside a server domain: `queries.ts` (reads) and `mutations.ts` (writes) are plain functions with no `"use server"`; `actions.ts` is the domain's `"use server"` file and holds thin delegates only — `requireUser()` -> parse -> call the mutation -> `revalidatePath()`, no `db.` calls. Exports carry the `Action` suffix. RSCs import `queries.ts`; client components import `actions.ts`. `requireUser()` lives in the action (and in the page), not in the query. `grep -n "^export async function" server/*/actions.ts` is the whole network surface.
- The task board publishes one board-data read, `getBoardAction` (tasks + users + tags + version in one round trip), plus one version probe, `getBoardVersionAction`. `listTasks`, `listUsers` and `listTags` are never exported from a `"use server"` module.
- Reads stay side-effect free. Deferred work uses `after()` from `next/server` (expired go-links hidden after render, Cloudflare sync after admin writes, go-app cache purge after `go_link` writes). Exception: `removeProfileAction` syncs Cloudflare inline because revoking access must complete before returning.
- "Today" is always `getTodayIso()` from `lib/date.ts` (Pacific/Auckland) and is passed into queries rather than using `CURRENT_DATE`.
- Prettier: double quotes, semicolons, 2 spaces, width 80. Several files were committed with tabs; run `pnpm format` on files you touch.

## Gotchas

- Next 16: the request-interception file is `proxy.ts` exporting `proxy()`, not `middleware.ts`. Read `node_modules/next/dist/docs/` before using any Next API.
- `server/env.ts` validates only `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and throws at import. `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` are read by Better Auth itself; `CLOUDFLARE_*` are read lazily in `server/cloudflare.ts`; `WDCC_INTERNAL_KEY` (and optional `GO_REVALIDATE_URL`) lazily in `server/go.ts`.
- `ALLOWED_EMAILS` appears in `.env.example` but no code reads it. The allowlist is the `profile` table.
- `server/flyio/config.ts` uses `fs` at module load: server-only. Tokens come from `FLY_TOKENS` (JSON object of `org-slug -> token`) or a gitignored `fly-tokens.json`. With neither, `/tech` renders an empty state.
- `syncDocsAccessGroup()` refuses to push an empty allowlist and serializes writes in-process; failures are surfaced through the Resync button on `/admin`.
- `/projects` is a placeholder page.
