# Architecture

Rhythm is a TanStack Start app: UI and HTTP live in one Node process. Domain rules stay in `src/lib`. React components fetch `/api/*`; they do not talk to Postgres.

**Why we build it this way:** [docs/PHILOSOPHY.md](PHILOSOPHY.md). Agent rules: [AGENTS.md](../AGENTS.md).

## Layout

| Path | Role |
| --- | --- |
| `src/routes/_authed/` | Signed-in pages (Today, Routines, Settings) |
| `src/routes/api/` | REST handlers used by the web UI and future native clients |
| `src/lib/recurrence/` | Due-date math (N-day, weekly, monthly, optional clock time) |
| `src/lib/occurrences/` | Materialise slots, Today query, snooze |
| `src/lib/security/` | Rate limits, payload size, signup email checks, identity helpers |
| `src/lib/validators/` | Zod input for routines |
| `src/lib/db/` | Drizzle schema |
| `drizzle/` | SQL migrations (`0000` …) |

## Conventions

- **Types:** `strict` TypeScript. Public helpers take named object args where they have more than two parameters. Zod infers `RoutineInput`.
- **Tests:** colocated `*.test.ts` next to the module. Run `npm run test`.
- **Format / lint:** Prettier then Biome (`npm run format`, `npm run lint`).
- **Full check:** `npm run check` (lint + `tsc --noEmit` + tests).

Occurrence rows are unique on `(routineId, dueAt)`. Day-only routines use local midnight as `dueAt` and are overdue only after that local day ends.

Auth is Auth.js email magic links (24h, one-time). Sign-in addresses must be syntactically valid and not a known disposable domain (`src/lib/security/email.ts`). Sessions are JWTs (default 30 idle days).
