# Rhythm

**Live App:** [https://rhythm-today.vercel.app](https://rhythm-today.vercel.app)

Today-first recurring reminders for household chores, hygiene, and other life maintenance — built for ADHD brains that need a clear “what’s due now” list, not a crowded month calendar.

**How we decide what to build and how to write it:** [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md). Agents: [AGENTS.md](AGENTS.md).

## Stack

- TanStack Start (Vite + TanStack Router) + TypeScript + Tailwind
- Neon Postgres + Drizzle ORM
- Auth.js magic-link email sign-in
- i18next (English, French, Spanish, German, Italian, Portuguese)
- Biome (lint) + Prettier (format) + Vitest
- Deployed on Vercel (with hourly cron to generate upcoming occurrences)

## Local setup

1. Create a Neon database and copy the connection string.
2. Copy env file and fill values:

```bash
cp .env.example .env.local
```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

3. Install, fill remaining secrets, and migrate:

```bash
npm install
npm run secrets:local
npm run db:migrate
```

4. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with your email. If `EMAIL_SERVER` is unset, the magic link is printed in the terminal.

## Deploy on Vercel

See [docs/DEPLOY.md](docs/DEPLOY.md) for the Neon + Vercel checklist (env vars, migrations, cron). Philosophy: [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md). Layout: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Rate limits: [docs/SECURITY.md](docs/SECURITY.md).

Quick path:

```bash
npx vercel link
npx vercel env add DATABASE_URL
npx vercel env add AUTH_SECRET
npx vercel env add AUTH_URL
npx vercel env add CRON_SECRET
npx vercel --prod
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local Vite / TanStack Start server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run check` | Lint + typecheck + tests |
| `npm run lint` | Biome |
| `npm run format` | Prettier |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:studio` | Drizzle Studio |
| `npm run secrets:local` | Write missing AUTH_SECRET / VAPID keys into `.env.local` |

## Product notes

- **Today** shows overdue + due-today reminders; one tap marks done.
- **Routines** are templates (`every N days` / weekly / monthly).
- Occurrences are materialised ~30 days ahead for lateness and regularity stats.
