# WDCC Dashboard

Internal dashboard for the WDCC exec team. Built with Next.js 16, Drizzle ORM, and Better Auth.

## Features

- **Tasks** — kanban board with a backlog column, one column per member, and a done column. Drag and drop assigns the task; tags, links, priorities and due dates.
- **Linktree** — the club's go-links (reorderable, hideable, auto-hidden after their expiry date) plus short `go/<key>` redirect entries.
- **Tech** — Fly.io app, machine and Prometheus CPU/memory metrics per organisation.
- **Admin** — member profiles (the sign-in allowlist), and a resync of the Cloudflare Zero Trust access group for the docs site.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- PostgreSQL (Neon) via Drizzle ORM
- Better Auth with Google OAuth, allowlisted against the `profile` table
- shadcn/ui, Radix UI, Tailwind CSS v4
- TanStack Query, dnd-kit

## Setup

Requires Node 20+ and pnpm.

**1. Install dependencies**

```bash
pnpm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Required:

| Variable               | Description                           |
| ---------------------- | ------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string (Neon)   |
| `BETTER_AUTH_SECRET`   | Random string, 32+ chars              |
| `BETTER_AUTH_URL`      | App URL, e.g. `http://localhost:3000` |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret            |

Optional — Cloudflare Zero Trust sync (the admin page's Resync button; profile changes fail loudly without these):

| Variable                       | Description                                                     |
| ------------------------------ | --------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`         | Token with Access: Groups edit                                  |
| `CLOUDFLARE_ACCOUNT_ID`        | Cloudflare account ID                                           |
| `CLOUDFLARE_ACCESS_GROUP_ID`   | Access group synced with every profile                          |
| `CLOUDFLARE_ACCESS_GROUP_NAME` | Set to make writes idempotent; otherwise the name is read first |

Optional — Fly.io dashboard (`/tech`):

| Variable     | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| `FLY_TOKENS` | JSON object mapping org slug to Fly API token, e.g. `{"wdcc":"tok_..."}` |

Locally you can instead copy `fly-tokens.example.json` to `fly-tokens.json` (gitignored). Without either, `/tech` shows an empty state.

`ALLOWED_EMAILS` in `.env.example` is unused — access is controlled by rows in the `profile` table.

**3. Run migrations**

```bash
pnpm db:migrate
```

**4. Seed (optional)**

```bash
pnpm db:seed
```

Inserts a shared `tech@wdcc.co.nz` profile, a starter tag set, and a few demo tasks. Idempotent.

**5. Grant yourself access**

Sign-in is restricted to emails present in the `profile` table, so the first account must be inserted manually:

```bash
pnpm db:studio
```

Add a row to `profile` with your lowercase Google email, a name, and `kind = personal`. After that, further members can be added from `/admin`.

**6. Start the dev server**

```bash
pnpm dev
```

Open http://localhost:3000.

## Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | Start dev server                   |
| `pnpm build`        | Production build                   |
| `pnpm start`        | Start production server            |
| `pnpm lint`         | Run ESLint                         |
| `pnpm format`       | Format with Prettier               |
| `pnpm format:check` | Check formatting                   |
| `pnpm db:generate`  | Generate Drizzle migrations        |
| `pnpm db:migrate`   | Apply migrations                   |
| `pnpm db:push`      | Push schema directly (dev only)    |
| `pnpm db:studio`    | Open Drizzle Studio                |
| `pnpm db:seed`      | Seed profiles, tags and demo tasks |

## Auth

Sign in with Google. Access is limited to emails in the `profile` table, managed from `/admin`. Every signed-in user has full access, including the admin page. Removing a profile signs that user out on their next request and revokes their Cloudflare docs access.

Profiles have two kinds, and both can sign in and reach every page, and both are synced to the Cloudflare access group for the docs site. The difference is the task board: `shared` mailboxes (e.g. `tech@wdcc.co.nz`) never appear as assignees or board columns, so a role account can read everything without adding a column nobody works out of.

## Deployment

No deployment configuration is committed. Deploy as a standard Next.js app (`pnpm build` then `pnpm start`), with the environment variables above set on the host and `pnpm db:migrate` run against the production database.
