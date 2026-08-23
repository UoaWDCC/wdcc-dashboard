# Architecture

Target structure for the WDCC Dashboard. The current tree differs; the
[Migration](#migration) section maps what moves where.

## Layers

Four layers, one-way dependencies:

| Layer         | Invariant                                              | May import                                         |
| ------------- | ------------------------------------------------------ | -------------------------------------------------- |
| `lib/`        | Browser-safe. No value imports from `@/server/`.       | `lib/` only (type-only `@/server/db/schema` is OK) |
| `server/`     | Server-only. Every file starts `import "server-only"`. | `lib/`, `server/`                                  |
| `hooks/`      | Client data + interaction layer.                       | `lib/`, `server/**/*.action.ts`                    |
| `components/` | UI.                                                    | `lib/`, `hooks/`, `server/**/*.action.ts`          |

`lib/` means "safe in a client bundle". `server/` means "explodes in a client
bundle". Both directions are enforceable: the `server-only` package guards one
side, an eslint `no-restricted-imports` rule on `lib/**` guards the other.

Type-only imports cross the boundary freely — `import type { goLink } from
"@/server/db/schema"` is erased at compile time, so Drizzle row types can live
in `lib/`.

### Inside a server domain

- `queries.ts` — reads. Plain async functions, no `"use server"`.
- `mutations.ts` — writes. Plain async functions, no `"use server"`.
- `<verb-noun>.action.ts` — one file per action, each `"use server"`, flat in
  the domain directory. Thin: `requireUser()` -> validate -> delegate ->
  `revalidatePath()`. Nothing else.

RSCs import `queries.ts` directly. Client components import `*.action.ts`. A
read consumed only by an RSC must never be exported from a `"use server"`
module — that publishes it as a reachable POST endpoint for no reason. A domain
with no client-triggered writes has no `.action.ts` file at all.

#### Naming: the suffix goes on both the file and the export

`server/tasks/move-task.action.ts` exporting `moveTaskAction`. Each half earns
its place for a different reason:

- **File suffix** is mechanical. Eslint can glob `**/*.action.ts` and enforce
  "starts with `requireUser()`", "declares `"use server"`", "contains no raw
  `db.` calls". The rule follows the file if it moves.
- **Export suffix** is at the call site. `await deleteTagAction(id)` reads as a
  network round trip crossing the trust boundary; the current
  `deleteTag(t.id)` in `components/tasks/TagManagerDialog.tsx:83` is
  indistinguishable from a local call.

There is no `actions/` subdirectory — `actions/move-task.action.ts` states it
twice, the same redundancy that makes `home.utils.ts` wrong. The surface stays
one command: `ls server/*/*.action.ts`.

The suffix also removes the collision between `moveTask` (mutation) and
`moveTaskAction` (action), so nothing needs import aliasing.

#### Why actions are one-per-file and the DAL is not

Actions are the trust boundary, so isolation wins:

- `ls server/*/*.action.ts` prints the whole network surface of the app.
- Adding an endpoint is a file addition in the diff, not a line buried in a
  large module — it is reviewable.
- "Everything exported from a `"use server"` file is public" stops being a
  footgun when each file exports exactly one thing.
- The zod schema for a single-use action sits next to it.

Queries and mutations are internal, so cohesion wins. They share select shapes,
join logic, position math, and lock helpers; one-per-file forces either a web of
cross-imports or a `_shared.ts` that is the grouped file with extra steps.

Split the DAL by **sub-domain**, never by function, and only past roughly 300
lines — `mutations/task.ts` + `mutations/position.ts`, not
`mutations/move-task.ts`.

```ts
// server/tasks/move-task.action.ts
"use server";
import { revalidatePath } from "next/cache";
import { moveTaskSchema } from "@/lib/tasks/schemas";
import { requireUser } from "@/server/auth/access";
import { moveTask } from "@/server/tasks/mutations";

export async function moveTaskAction(raw: unknown) {
  await requireUser();
  await moveTask(moveTaskSchema.parse(raw));
  revalidatePath("/tasks");
}
```

### What counts as a domain

A domain owns tables, not routes. `server/profile/` rather than
`server/admin/`; `server/tags/` rather than tags living inside tasks.

Tags are their own domain: `tag` (`lib/db/schema/tasks.ts:77`) is a standalone
table with its own lifecycle, and `components/tasks/TagManagerDialog.tsx` does
tag CRUD with no task in scope. Ownership splits by table:

| Table      | Owner                                                        |
| ---------- | ------------------------------------------------------------ |
| `tag`      | `server/tags/` — list, create, rename, recolor, delete       |
| `task_tag` | `server/tasks/mutations.ts` — a task's tags are a task write |

So `updateTask` writes `task_tag` rows directly and never calls into
`server/tags/`. No cross-domain dependency, which is what makes the split safe.

#### Ownership is about writes, not reads

> A domain owns **writes** to its tables. Reads may join across domains freely.

- `server/tasks/queries.ts` joining `tag` to hydrate `TaskView.tags` — fine,
  it is a read.
- `server/tasks/mutations.ts` writing `task_tag` — fine, tasks owns that table.
- `server/tasks/mutations.ts` inserting into `tag` — not allowed. That belongs
  to `server/tags/mutations.ts`.

The read half of the rule exists because the alternative is worse code for no
benefit: routing the tag join through the tags domain means either an N+1 or
fetching every tag and joining in memory.

The write half has a concrete trigger. If tags ever become creatable inline
from the task editor, that insert goes through `server/tags/`, not into
`updateTask`.

#### One tag type, owned by the tags domain

`TaskTagView` (`lib/tasks/types.ts:14`) and the row shape returned by
`listTags` are both `{ id, name, color }`. Collapse them into a single
`TagView` in `lib/tags/types.ts`; `lib/tasks/types.ts` imports it for
`TaskView.tags`.

The dependency is type-only and points the right way. `lib/tags/*` must never
import `lib/tasks/*` — that direction is a cycle.

Not everything server-side is a domain. `server/cloudflare.ts` is an outbound
client for a third-party API, called by `server/profile/mutations.ts` — no
route, no table, no UI, so it stays a flat file next to `server/env.ts`. It is
deliberately not filed under an `integrations/` directory: one member is not a
category, and Fly.io would contradict it anyway by being an outbound
integration _and_ a full domain backing `/tech`.

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
  tags/
    types.ts                 # TagView — TaskView.tags imports this
    schemas.ts               # hex-colour rule, name normalisation
  linktree/
    types.ts               # GoLinkRow (type-only schema import), AddGoLinkInput
    schemas.ts
  flyio/
    types.ts  utils.ts
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
  cloudflare.ts            # syncDocsAccessGroup — not a domain, so it stays flat
  profile/                 # domain-named, not route-named; replaces server/admin/
    queries.ts             # isAllowed, listProfiles
    mutations.ts           # add/remove/update + Cloudflare sync
    add-profile.action.ts     remove-profile.action.ts
    update-profile.action.ts  resync-access.action.ts
  tasks/
    queries.ts             # listTasks, listUsers  <- RSCs import these
    mutations.ts           # createTask, updateTask, softDeleteTask, moveTask
    create-task.action.ts       update-task.action.ts
    soft-delete-task.action.ts  move-task.action.ts
  tags/                    # own table, own lifecycle; task_tag stays with tasks
    queries.ts             # listTags
    mutations.ts           # createTag, updateTag, deleteTag
    create-tag.action.ts  update-tag.action.ts  delete-tag.action.ts
  home/
    queries.ts             # getHomeSummary — no "use server", no action file at all
  linktree/
    queries.ts  mutations.ts
    add-go-link.action.ts     update-go-link.action.ts
    delete-go-link.action.ts  reorder-go-links.action.ts
  flyio/
    config.ts              # reads fs at module load
    fetcher.ts
    list-apps.action.ts  list-machines.action.ts  get-metrics.action.ts
                           # reads, but client-triggered via TanStack —
                           # being endpoints is the point here
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
  auth/  admin/  home/  tasks/
  tech/
    state-meta.ts            # was lib/flyio/styles.ts — Tailwind class maps are view
  linktree/
    GoLinksManager.tsx  GoLinksList.tsx  GoLinkRow.tsx  GoLinkDialog.tsx
```

## Migration

Ranked by impact.

| #   | Move                                                                                                                            | Why                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | `lib/{db,auth,access,cloudflare,env,flyio/config}` -> `server/`                                                                 | `lib/` stops being a lie; the workaround comment in `lib/date.ts` becomes unnecessary                      |
| 2   | `server/tasks/actions.ts` (743 lines) -> `server/tasks/{queries,mutations}.ts`, `server/tags/*`, one `*.action.ts` per endpoint | Splits the god file on real seams; stops publishing `listTasks`, `listUsers`, `listTags` as POST endpoints |
| 3   | `server/home/{actions,home.utils}.ts` -> `server/home/queries.ts` + `lib/home/summary.ts`                                       | Fixes the `home.utils.ts` name, moves a pure reducer out of `server/`, drops action-calls-action           |
| 4   | `lib/{tasks,flyio}/queries.ts` -> `hooks/<domain>/`                                                                             | Removes the `lib -> server` back-edge that leaves no layer ordering to reason about                        |
| 5   | `app/(dashboard)/linktree/GoLinksManager.tsx` (617 lines) -> `components/linktree/*`                                            | Only feature component living under `app/`; contains dialog + row + list in one file                       |
| 6   | `pnpm add server-only`; eslint `no-restricted-imports` on `lib/**`                                                              | Makes every rule above self-enforcing instead of conventional                                              |
| 7   | One repo-wide `pnpm format` commit                                                                                              | 18 hand-written files are tab-indented; the per-file format rule guarantees diff noise                     |

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
