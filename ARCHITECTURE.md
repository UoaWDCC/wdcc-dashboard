# Architecture

Target structure for the WDCC Dashboard. The current tree differs; the
[Migration](#migration) section maps what moves where.

## Layers

Four layers, one-way dependencies:

| Layer         | Invariant                                              | May import                                         |
| ------------- | ------------------------------------------------------ | -------------------------------------------------- |
| `lib/`        | Browser-safe. No value imports from `@/server/`.       | `lib/` only (type-only `@/server/db/schema` is OK) |
| `server/`     | Server-only. Every file starts `import "server-only"`. | `lib/`, `server/`                                  |
| `hooks/`      | Client data + interaction layer.                       | `lib/`, `server/*/actions`                         |
| `components/` | UI.                                                    | `lib/`, `hooks/`, `server/*/actions`               |

`lib/` means "safe in a client bundle". `server/` means "explodes in a client
bundle". Both directions are enforceable: the `server-only` package guards one
side, an eslint `no-restricted-imports` rule on `lib/**` guards the other.

Type-only imports cross the boundary freely — `import type { goLink } from
"@/server/db/schema"` is erased at compile time, so Drizzle row types can live
in `lib/`.

### Inside a server domain

- `queries.ts` — reads. Plain async functions, no `"use server"`.
- `mutations.ts` — writes. Plain async functions, no `"use server"`.
- `actions.ts` — `"use server"`. Thin: `requireUser()` -> validate -> delegate
  -> `revalidatePath()`. Nothing else.

RSCs import `queries.ts` directly. Client components import `actions.ts`. A
read consumed only by an RSC must never be exported from a `"use server"`
module — that publishes it as a reachable POST endpoint for no reason.

## Tree

```
app/
  (auth)/sign-in/page.tsx
  (dashboard)/
    layout.tsx  loading.tsx  error.tsx  page.tsx
    admin/page.tsx  linktree/page.tsx  tasks/page.tsx
    tech/page.tsx  projects/page.tsx
  api/auth/[...all]/route.ts
  layout.tsx  providers.tsx  globals.css
```

Routes only — no feature components under `app/`. Every page that fetches data
or schedules `after()` work calls `requireUser()` itself; the layout gate is not
sufficient, since layout and page render concurrently.

```
lib/                       # browser-safe, pure
  types.ts                 # TASK_STATUSES, TASK_PRIORITIES, TEAMS, PROFILE_KINDS
  utils.ts                 # cn, getFirstElement, safePath
  date.ts                  # getTodayIso, isLinkExpired
  form-parser.ts
  auth-client.ts           # better-auth/react
  auth-errors.ts           # AUTH_ERROR_CODES + copy
  profile.ts               # normalizeEmail only (pure)
  tasks/
    types.ts               # TaskView, column types
    utils.ts               # column derivation
    position.ts            # midpoint, gap constants (pure, testable)
    schemas.ts             # zod: createTaskSchema, updateTaskSchema
  home/
    summary.ts             # HomeSummary/MyTask/BoardPulse types + buildHomeSummary
    utils.ts               # dueState, dueLabel
    quick-links.ts
  linktree/
    types.ts               # GoLinkRow (type-only schema import), AddGoLinkInput
    schemas.ts
  flyio/
    types.ts  utils.ts  styles.ts
```

```
server/                    # server-only; every file: import "server-only"
  env.ts                   # validates DATABASE_URL, GOOGLE_CLIENT_*; throws at import
  db/
    index.ts               # pg Pool + drizzle
    schema/{auth,profile,golinks,tasks,enums,index}.ts
    drizzle/               # committed migrations + meta/_journal.json
    seed.ts
  auth/
    index.ts               # Better Auth instance, databaseHooks, onAPIError
    access.ts              # requireUser, resolveSession (React cache())
  integrations/
    cloudflare.ts          # syncDocsAccessGroup
  profile/                 # domain-named, not route-named; replaces server/admin/
    queries.ts             # isAllowed, listProfiles
    mutations.ts           # add/remove/update + Cloudflare sync
    actions.ts
  tasks/
    queries.ts             # listTasks, listUsers, listTags  <- RSCs import these
    mutations.ts           # createTask, updateTask, softDeleteTask, moveTask
    tags.ts                # tag CRUD
    actions.ts             # thin wrappers only
  home/
    queries.ts             # getHomeSummary — no "use server", RSC-only
  linktree/
    queries.ts  mutations.ts  actions.ts
  flyio/
    config.ts              # reads fs at module load
    fetcher.ts
    actions.ts
```

```
hooks/                     # client data layer
  use-mobile.ts
  tasks/
    query-options.ts       # queryKey + queryFn -> actions; no directive, RSC-prefetchable
    use-tasks.ts           # "use client" — optimistic mutations + snapshot rollback
    use-task-drag-drop.ts
    use-task-form.ts
  flyio/
    query-options.ts       # appsQuery, machinesQuery, metricsQuery
    use-fly-queries.ts     # "use client" — useQueries wrappers
```

Splitting query descriptors from the hooks that consume them is what makes
`/tech` correct rather than accidentally correct: an RSC can import
`query-options.ts` to prefetch without pulling a module full of React hooks.

```
components/
  ui/                      # shadcn-generated, untouched
  shell/                   # AppSidebar.tsx, UserMenu.tsx
  auth/  admin/  home/  tasks/  tech/
  linktree/
    GoLinksManager.tsx  GoLinksList.tsx  GoLinkRow.tsx  GoLinkDialog.tsx
```

## Migration

Ranked by impact.

| #   | Move                                                                                       | Why                                                                                                         |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | `lib/{db,auth,access,cloudflare,env,flyio/config}` -> `server/`                            | `lib/` stops being a lie; the workaround comment in `lib/date.ts` becomes unnecessary                       |
| 2   | `server/tasks/actions.ts` (743 lines) -> `queries` / `mutations` / `tags` / thin `actions` | Splits the god file on a real seam; stops publishing `listTasks`, `listUsers`, `listTags` as POST endpoints |
| 3   | `server/home/{actions,home.utils}.ts` -> `server/home/queries.ts` + `lib/home/summary.ts`  | Fixes the `home.utils.ts` name, moves a pure reducer out of `server/`, drops action-calls-action            |
| 4   | `lib/{tasks,flyio}/queries.ts` -> `hooks/<domain>/`                                        | Removes the `lib -> server` back-edge that leaves no layer ordering to reason about                         |
| 5   | `app/(dashboard)/linktree/GoLinksManager.tsx` (617 lines) -> `components/linktree/*`       | Only feature component living under `app/`; contains dialog + row + list in one file                        |
| 6   | `pnpm add server-only`; eslint `no-restricted-imports` on `lib/**`                         | Makes every rule above self-enforcing instead of conventional                                               |
| 7   | One repo-wide `pnpm format` commit                                                         | 18 hand-written files are tab-indented; the per-file format rule guarantees diff noise                      |

Suggested order: 3 (smallest, already in flight) -> 6 (rule first, so the rest
is guided) -> 1 -> 2 -> 4 -> 5 -> 7.

Config paths to update alongside move 1: `drizzle.config.ts` (schema
directory), `package.json` (`db:seed`). The `@/*` alias in `tsconfig.json` is
unaffected.

After move 2, `buildHomeSummary`, `lib/tasks/utils.ts`, and the
midpoint/rebalance logic become trivially unit-testable pure functions. That is
the moment to add a test runner, not before.

## Deliberately unchanged

- The flat `@/*` alias, used consistently. No barrel files beyond
  `lib/db/schema/index.ts` (Drizzle config points at the directory).
- `components/ui/` kept separate from feature directories.
- `proxy.ts` as a non-enforcing fast path.
- `requireUser()` + React `cache()` as the gate design.
- Const-array enums in `lib/types.ts` feeding both Drizzle and the client.
- One `(dashboard)` route group. Revisit past roughly 15 routes.
