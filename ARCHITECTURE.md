# Architecture

Target structure for the WDCC Dashboard. The current tree differs; the
[Migration](#migration) section maps what moves where. CLAUDE.md describes what
is; this file describes what it becomes.

## Layers

Five layers, one-way dependencies:

| Layer         | Invariant                                              | May import                                                                                            |
| ------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `lib/`        | Browser-safe. No value imports from `@/server/`.       | `lib/` only (type-only `@/server/db/schema` is OK)                                                    |
| `server/`     | Server-only. Every file starts `import "server-only"`. | `lib/`, `server/`                                                                                     |
| `hooks/`      | Client data + interaction layer.                       | `lib/`, `server/**/actions.ts`                                                                        |
| `components/` | UI.                                                    | `lib/`, `hooks/`, `server/**/actions.ts`                                                              |
| `app/`        | Routes only. `requireUser()` at every fetching entry.  | `lib/`, `hooks/`, `components/`, `server/**/queries.ts`, `server/**/actions.ts`, `server/auth/access` |

`lib/` means "safe in a client bundle". `server/` means "explodes in a client
bundle". Both directions are enforceable: `import "server-only"` guards one side,
an eslint `no-restricted-imports` rule on `lib/**` guards the other. Next
resolves the import itself, but drizzle-kit and `db:seed` load `server/env.ts`
and `server/db/` outside the bundler, so the package is a real dependency and
those scripts pass `--conditions=react-server`.

Type-only imports cross the boundary freely — `import type { goLink } from
"@/server/db/schema"` is erased at compile time, so Drizzle row types can live
in `lib/`.

A page never imports `server/db` or a schema table directly. Queries live in
`server/<domain>/queries.ts` so a second caller can reuse them.

### Inside a server domain

- `queries.ts` — reads. Plain async functions, no `"use server"`.
- `mutations.ts` — writes. Plain async functions, no `"use server"`.
- `actions.ts` — one file per domain, `"use server"`, thin delegates only.
  Two shapes, nothing else in the file:
  - **write** — `requireUser()` -> validate -> delegate -> `revalidatePath()`
  - **read** — `requireUser()` -> delegate -> return. No zod (there is no
    untrusted input beyond the session), no revalidation. Only for reads the
    client actually triggers: `getBoardAction` and `server/flyio/*`.

RSCs import `queries.ts` directly. Client components import `actions.ts`. A
read consumed only by an RSC must never be exported from a `"use server"`
module — that publishes it as a reachable POST endpoint for no reason. A domain
the client never calls has no `actions.ts` file at all: `server/home/` is
RSC-only, so it is queries and nothing else.

#### Naming: the `Action` suffix is on the export

`server/tasks/actions.ts` exporting `moveTaskAction`. The suffix earns its place
at the call site: `await deleteTagAction(id)` reads as a network round trip
crossing the trust boundary; a bare `deleteTag(t.id)` is indistinguishable from
a local call. It also removes the collision between `moveTask` (mutation) and
`moveTaskAction` (action), so nothing needs import aliasing.

One `actions.ts` per domain, not one file per action. Every domain in the repo
uses this shape, so `server/tasks/` and `server/tags/` are not exceptions, and
the surface is still one command: `grep -n "^export async function" server/*/actions.ts`.

The footgun that "everything exported from a `"use server"` file is public"
warns about is real, but file count is not what defuses it. What defuses it is
that reads and writes live in `queries.ts` / `mutations.ts` as plain modules —
the three unbounded reads that leaked as POST endpoints did so because they sat
in a `"use server"` file, not because that file was large. The rule that keeps
`actions.ts` honest is that it contains delegates and nothing else: no `db.`
calls, no join logic, no position math. A file of four-line functions stays
reviewable at any length.

```ts
// server/tasks/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { moveTaskSchema } from "@/lib/tasks/schemas";
import { requireUser } from "@/server/auth/access";
import { moveTask } from "@/server/tasks/mutations";

export async function moveTaskAction(raw: unknown) {
  const session = await requireUser();
  await moveTask(moveTaskSchema.parse(raw), session.user.id);
  revalidatePath("/tasks");
}
```

Queries and mutations are grouped for a different reason: they share select
shapes, join logic, position math, and lock helpers, so one-per-file would force
either a web of cross-imports or a `_shared.ts` that is the grouped file with
extra steps.

Split the DAL by **sub-domain**, never by function, and only past roughly 300
lines — `mutations/task.ts` + `mutations/move.ts`, not
`mutations/move-task.ts`. `server/tasks/` is the one domain past the threshold:
the two halves share no helper, so the split needed no `_shared.ts`.

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

Reads the client genuinely needs are published deliberately and counted. The
task board needs exactly one: `getBoardAction`, returning
tasks + users + tags in a single round trip so TanStack Query can refetch after
a mutation without three waterfalled endpoints. It is the one action that
composes another domain's queries (`server/tags/queries.ts`); `listTasks`,
`listUsers` and `listTags` stay unexported from any `"use server"` module.

`server/flyio/` is the other case where reads are endpoints — there it is the
point, since nothing renders them server-side.

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
    queries.ts             # isAllowed, getProfile, listProfiles
    mutations.ts           # upsertProfile, removeProfile + Cloudflare sync
    actions.ts             # addProfileAction, removeProfileAction,
                           # updateProfileAction, resyncAccessAction
  tasks/
    queries.ts             # listTasks, listUsers  <- RSCs import these
    mutations/
      task.ts              # createTask, updateTask, softDeleteTask
      move.ts              # moveTask + advisory locks, fractional positions,
                           # rebalance — no helper shared with task.ts
    actions.ts             # createTaskAction, updateTaskAction,
                           # softDeleteTaskAction, moveTaskAction, and
                           # getBoardAction — the one published read,
                           # composing tags/queries
  tags/                    # own table, own lifecycle; task_tag stays with tasks
    queries.ts             # listTags
    mutations.ts           # createTag, updateTag, deleteTag
    actions.ts             # createTagAction, updateTagAction, deleteTagAction
  home/
    queries.ts             # getHomeSummary — no "use server", no action file at all
  linktree/
    queries.ts  mutations.ts
    actions.ts             # addGoLinkAction, updateGoLinkAction,
                           # removeGoLinkAction, reorderGoLinksAction, ...
  flyio/
    config.ts              # reads fs at module load
    fetcher.ts
    actions.ts             # listAppsAction, listMachinesAction,
                           # getMetricsAction — reads, but client-triggered
                           # via TanStack, so being endpoints is the point
```

```
hooks/                     # client data layer
  use-mobile.ts
  tasks/
    query-options.ts       # queryKey + queryFn -> getBoardAction; no directive, RSC-prefetchable
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

`ui/` is kebab-case because the shadcn CLI writes those files and overwrites
them on `add`. Feature components are PascalCase, one component per file,
filename = export name.

## Migration

Ranked by impact. The **Order** column is the sequence to actually execute in.
One PR per row — rows 1, 2 and 4 touch the import graph repo-wide and are
unreviewable bundled together. Each PR updates the CLAUDE.md paths it
invalidates in the same commit; a deferred doc-sync commit never survives
contact.

| #   | Order | Move                                                                                                                                                                                               | Why                                                                                                                                                                                                                              |
| --- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 4     | `lib/{db,auth,access,cloudflare,env,flyio/config}` -> `server/`                                                                                                                                    | `lib/` stops being a lie; the workaround comment in `lib/date.ts` becomes unnecessary                                                                                                                                            |
| 2   | 6     | `server/tasks/actions.ts` (743 lines) -> `server/tasks/{queries,mutations}.ts`, `server/tags/*`, a delegates-only `actions.ts` per domain, plus `lib/tags/{types,schemas}.ts` and `getBoardAction` | Splits the god file on real seams; three unbounded reads stop being POST endpoints, replaced by one `getBoardAction`. Carries the `TaskTagView` -> `TagView` collapse, since the tags domain and its type must land together     |
| 3   | 2     | `server/home/{actions,home.utils}.ts` -> `server/home/queries.ts` + `lib/home/summary.ts`                                                                                                          | Fixes the `home.utils.ts` name, moves a pure reducer out of `server/`, drops action-calls-action                                                                                                                                 |
| 4   | 7     | `lib/{tasks,flyio}/queries.ts` -> `hooks/<domain>/`; `lib/flyio/styles.ts` -> `components/tech/state-meta.ts` (done)                                                                               | Removes the `lib -> server` back-edge that leaves no layer ordering to reason about, and empties `lib/flyio/` of everything that was never pure in the first place                                                               |
| 5   | 8     | `app/(dashboard)/linktree/GoLinksManager.tsx` (617 lines) -> `components/linktree/*` (done)                                                                                                        | Only feature component living under `app/`; contains dialog + row + list in one file                                                                                                                                             |
| 6   | 3     | `import "server-only"` at the top of every `server/**` module; eslint `no-restricted-imports` on `lib/**`; `pnpm add server-only` + `--conditions=react-server` on the `db:*` scripts              | Makes every rule above self-enforcing instead of conventional                                                                                                                                                                    |
| 7   | 1     | One repo-wide `pnpm format` commit, plus `.prettierignore` (lockfile, `.next/`, `lib/db/drizzle/`) and a plain CI workflow: `pnpm lint`, `pnpm format:check`, `pnpm build`, `tsc --noEmit`         | 18 hand-written files are tab-indented; going first keeps every later diff free of whitespace noise. CI ships here so rows 1-6 land machine-checked instead of on trust                                                          |
| 8   | 9     | CI ratchet: add row 6's eslint `no-restricted-imports` to the pipeline once `lib/` is actually pure                                                                                                | Row 6's rule is a suggestion until it is enforced, and it can only be enforced after rows 1 and 4 remove the `lib -> server` back-edge                                                                                           |
| 9   | 5     | Rebaselined the Drizzle migration chain: single `0000_baseline.sql` generated from `server/db/schema/`, `0000`-`0008` dropped, `drizzle.__drizzle_migrations` collapsed to one row (done)          | `meta/0005`-`0008_snapshot.json` shared one `id` and one `prevId`, so `db:generate` aborted on a chain collision; their contents also predated the hand-written SQL in `0006`-`0008`, so a repaired chain would still diff wrong |

Row 7 goes first: the per-file format rule otherwise mixes whitespace churn into
every migration diff. Review it with `--ignore-all-space` and record its SHA in
`.git-blame-ignore-revs`. The same PR carries the CI workflow, so the six
import-graph migrations that follow are gated rather than trusted; `pnpm build`
needs `DATABASE_URL`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set to dummy
values, since `lib/env.ts` throws at import. `tsc --noEmit` runs after the build,
not before: `tsconfig.json` includes `.next/types`, which the build generates.

Row 6's `no-restricted-imports` rule shipped with `lib/flyio/queries.ts` and
`lib/tasks/queries.ts` exempted in `eslint.config.mjs` — they were the `lib ->
server` back-edge. Row 4 moved both under `hooks/` and deleted the exemption
block, so the rule now covers all of `lib/`. Type-only imports are allowed
through (`allowTypeImports`), which is the boundary rule stated above.

Row 9 landed with row 1 rather than on its own branch. The old chain is
recoverable from git (`581761d` is where `0006`-`0008` were committed with
copies of `0005_snapshot.json` in place of generated ones). The baseline was
generated from `server/db/schema/` after confirming it matched the live database
by introspection — 12 tables, 95 columns, 4 enums, 16 FKs identical, the only
differences being how Postgres echoes check-constraint text.

`db:migrate` never saw the corruption: it reads `_journal.json` and the SQL
files, never the snapshots, which is why this went unnoticed until a `generate`
was attempted. Environments other than the one in `.env` still hold nine
bookkeeping rows; each needs the same `DELETE` + `INSERT` before its next
`db:migrate`, or it will try to apply the baseline over live tables.

Row 1 splits one file across the boundary; the rest is mechanical moves.
`lib/profile.ts` becomes:

- `normalizeEmail` -> `lib/profile.ts` (the only pure function there)
- `isAllowed`, `getProfile`, `listProfiles` -> `server/profile/queries.ts`
- `upsertProfile`, `removeProfile` -> `server/profile/mutations.ts`

`server/auth/index.ts` calls `isAllowed` from its `databaseHooks`, which is a
legal `server/` -> `server/` edge.

Config paths to update alongside row 1: `drizzle.config.ts` (schema directory),
`package.json` (`db:seed`). The `@/*` alias in `tsconfig.json` is unaffected.

When the last row lands, delete this file's opening caveat: the tree stops being
a target and becomes a description.

## Deliberately unchanged

- The flat `@/*` alias, used consistently. No barrel files beyond
  `lib/db/schema/index.ts` (Drizzle config points at the directory).
- `components/ui/` kept separate from feature directories.
- `proxy.ts` as a non-enforcing fast path.
- `requireUser()` + React `cache()` as the gate design.
- Const-array enums in `lib/types.ts` feeding both Drizzle and the client.
- One `(dashboard)` route group. Revisit past roughly 15 routes.
- Each directory is named by what you search it _by_, so the three naming
  schemes do not need reconciling: `server/` by domain (`profile/`, not
  `admin/` — you look for the table's owner), `components/` by route
  (`admin/`, not `profile/` — you look for what is on the page), and
  `db/schema/` by table cluster (`golinks.ts`). Renaming `components/admin/`
  to match the server domain would break the only lookup that directory
  exists to serve.
