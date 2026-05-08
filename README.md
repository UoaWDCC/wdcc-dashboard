# WDCC Dashboard

Internal dashboard for WDCC. Built with Next.js, Drizzle ORM, and Better Auth.

## Stack

- **Framework:** Next.js 16 (React 19)
- **Database:** PostgreSQL (Neon) via Drizzle ORM
- **Auth:** Better Auth with Google OAuth + email allowlist
- **UI:** shadcn/ui, Radix UI, Tailwind CSS v4

## Setup

**1. Install dependencies**

```bash
pnpm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Random string (32+ chars) |
| `BETTER_AUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

**3. Run migrations**

```bash
pnpm db:migrate
```

**4. Start dev server**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format with Prettier |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema directly (dev only) |
| `pnpm db:studio` | Open Drizzle Studio |

## Auth

Sign-in via Google OAuth. Access restricted to an allowlist managed in the database via the admin page.
