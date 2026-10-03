# Philosophy

Rhythm is a Today-first recurring reminder for ADHD life maintenance (sheets, nails, bins, filters, bills). It should feel like a short list you can clear, not a productivity system you have to manage.

## Product

**Today is the product.** Home is overdue + due now. A month grid is out of scope until someone misses it after living in Today. A seven-day strip is allowed only after Today is actually used.

**One tap to done.** Skip, snooze, and edit exist, but marking done is the primary motion. Long forms are for people who want them; suggestions and defaults should be enough to start.

**Day-first, time optional.** A routine is “this day” (or this weekday / this day of month). A clock time is an opt-in. Day-only items are not overdue at midnight; they are overdue after that local day ends.

**Suggest, then get out of the way.** Starter examples remain until the user adds that one. After add, it drops off the pack and is edited from Routines. Frequency, weekday, month day, start date, and optional time are editable before add.

**Kind, not coercive.** No public streaks, shame emails, or invented chores. Regularity stats are private feedback. Push should remind, then shut up (quiet hours and a morning digest are the intended shape).

**English default.** Ship `en`, `fr`, `es`, `de`, `it`, `pt`. Copy stays plain.

**Web first, same brain everywhere.** Native apps should reuse `/api/*`, not a second domain model. Household sharing and two-way calendars wait until the personal loop is automatic.

## Code

**One process, one database.** TanStack Start serves UI and REST. Neon Postgres + Drizzle is the source of truth. Occurrences are rows (`routineId` + `dueAt` unique), not only a rule evaluated at read time.

**Rules on the server.** `src/lib` owns recurrence, Today assembly, snooze, stats, auth, and rate limits. Components fetch and render. If a native client could not call the same endpoint, the logic is in the wrong place.

**Stay boring until it hurts.** No Convex for this app. No separate backend repo. No bun. npm + Vite + Drizzle migrations.

**Typed, tested, documented.** Strict TypeScript, Zod at the API boundary, colocated Vitest, short comments on non-obvious public helpers, architecture/security docs when the shape changes. `npm run check` is lint + types + tests.

**Named, explicit APIs.** Prefer `{ … }` object arguments in Python and in TypeScript helpers with several parameters. Future React Native UI uses styled-components/native.

**Fail closed on abuse, fail open on Today.** Magic-link send and writes are rate-limited and should deny if the limiter cannot run. Authenticated reads may fail open so the checklist still loads.

**Don’t “upgrade” the stack in passing.** Don’t introduce Next.js, a new CSS-in-JS for web, or a second ORM because a tutorial used them. Match the files already in the tree.
