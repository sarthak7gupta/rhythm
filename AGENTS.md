# Rhythm — agent instructions

This is **TanStack Start** (Vite + TanStack Router + Nitro), **not Next.js**. Ignore any `nextjs-agent-rules` block if a generator re-inserts one. Do not add `app/`, `next.config`, or Next APIs.

Read [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md) before changing UX, recurrence, or backend shape. Roadmap: [ROADMAP.md](ROADMAP.md). Layout: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Limits: [docs/SECURITY.md](docs/SECURITY.md).

## Product

- **Today is home.** Overdue + due now. Not a month calendar. A week strip is later, and only after Today is a habit.
- **ADHD-friendly:** one tap to clear. Extra screens and settings are optional. Defaults should work without filling a long form.
- **Life maintenance, not a social app.** Household, hygiene, bills, anything that should come back. No streaks-for-shame, leaderboards, or AI inventing chores.
- **Day-first, time optional.** Routines are a date (or weekday / day of month). Clock time is an explicit opt-in.
- **English default.** UI locales: `en`, `fr`, `es`, `de`, `it`, `pt`. No Hindi unless product asks again.
- **Suggest, don’t trap.** Starter examples stay until added; added ones leave the pack. Edit before add. Edit existing from Routines.
- **Remind, don’t nag.** Push is opt-in. Quiet hours / digest are the direction, not more pings.

## Code

- **Neon Postgres is the source of truth.** Drizzle schema + `drizzle/*.sql`. The Start app **is** the backend: `/api/*` + `src/lib`.
- **Domain logic stays on the server.** React is UI + `fetch`. Recurrence, overdue, snooze, stats, auth, and rate limits do not live in components.
- **Same HTTP API for native later.** Don’t encode web-only assumptions into `/api/*` (except cookie session until bearer tokens exist).
- **Do not add Convex** for this app unless live multi-device sync is a real pain. Do not split a second backend until web and native need different ship cadences.
- **npm**, not bun. **Python: named arguments.** Future React Native: **styled-components/native**.
- **TypeScript strict.** Prefer named object args when a function has more than two parameters. Zod on API input. No `any` in `src/` (generated `routeTree.gen.ts` is exempt).
- **Tests next to the module** (`*.test.ts`). New recurrence, validation, or security behavior needs a test.
- **Document** public modules briefly; keep [docs/](docs/) current when architecture or limits change.
- **Format:** Prettier. **Lint:** Biome. Before claiming done: `npm run check`.
- **Dev:** `npm run dev` / `npx convex` is not used here. Migrations: `npm run db:migrate`. Never `npx convex deploy`.
- **Auth:** magic links, 24h, one-time. Rate-limit email sends. Reject malformed and disposable inboxes before sending. Don’t log secrets or raw tokens.
- **Abuse:** Postgres-backed limits in `src/lib/security`. Email and writes fail closed if the limiter store fails.

## UI changes

Verify in the browser when tools allow: the real flow, not only a screenshot. Check empty/error states and other routes that share the state you touched.
