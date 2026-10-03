# Rhythm roadmap

Today-first recurring reminders for ADHD life maintenance (household, hygiene, bills, anything that should come back). Neon Postgres stays the source of truth; web is first; native clients reuse the same HTTP API. The TanStack Start app **is** the backend (`/api/*` + `src/lib`); there is no separate API service.

## Already shipped (v1)

- TanStack Start (Vite + Nitro) + Tailwind; same origin for UI and REST
- Neon Postgres + Drizzle (`0000_init`, `0001_push_and_notify` applied)
- Email magic-link sign-in (Auth.js)
- Login: language globe (en / fr / es / de / it / pt); domain pills after `@`
- Starter pack stays visible after the first add; added cards switch to Edit
- Start date for N-day routines; weekday for weekly; day of month 1–31 (clamped on short months)
- Today list: overdue + due today, done / skip / undo / snooze (later today, tomorrow, +2 days)
- Routines: every N days, weekly, monthly; day-only by default, optional clock time; pause / delete
- Categories: household, hygiene, external, other
- Regularity stats (completion, on-time, streak, avg days late)
- Occurrence generation (on save + hourly cron)
- Web push (VAPID) + `push_subscriptions` table ready for native tokens
- Settings for account + reminder toggle
- Biome (lint), Prettier (format), Vitest
- Rate limits (Postgres-backed): magic-link email, API reads/writes, routine create cap

### Email (local)

- **Brevo** is the send path when `BREVO_API_KEY` is set (`EMAIL_FROM` must be a [verified sender](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email))
- Resend remains a fallback (test sender `onboarding@resend.dev` only delivers to the Resend account email; a custom domain is required to mail anyone else)
- Gmail SMTP is still available via `EMAIL_SERVER` if needed

No own domain yet: Brevo + a verified Gmail sender is the current plan. Gmail/Yahoo from-addresses can still be rejected or land in spam until a domain is authenticated.

## Principles

Full write-up: [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md). In short:

- Home stays **Today**, not a month calendar.
- One tap to clear an item. Extra screens are optional.
- Day-first schedules; clock time is opt-in.
- Same Postgres + HTTP API for web, Mac, iPhone, Android.
- Domain rules stay on the server (`src/lib`, `/api/*`). React is UI + fetch.
- Do not add Convex unless live sync across devices becomes a real pain.
- Do not split a second backend until native shipping cadence or workers actually need it.

---

## Next: make the web app something you actually use

### 1. Production deploy and mail that lands

- Verify the Brevo sender for `EMAIL_FROM` and confirm a magic link in the real inbox
- Deploy to Vercel with `AUTH_URL`, `AUTH_SECRET`, `DATABASE_URL`, `CRON_SECRET`, `VAPID_*`, `BREVO_API_KEY`, `EMAIL_FROM`
- Optional later: cheap domain + authenticate it in Brevo (better deliverability than Gmail-as-from)
- Optional: Google sign-in beside email (Auth.js already supports it)
- Optional: passkeys after first email login

### 2. ADHD-friendly Today polish

- Flexible window: due Sunday, still on-time through Monday evening
- Quick-add from Today (title + every N days, skip the long form)

### 3. Recurrence and time

- User-editable timezone on Settings (stored, already on `users`)
- Preferred time actually drives the push hour, not just the due timestamp
- “After I complete it, wait N days” (rolling from last done, not from calendar)
- One-off tasks that never recur
- Seasonal / “every 3 months” without hacking interval days

### 4. Push that does not nag

- Quiet hours
- Digest: one morning ping listing everything due, instead of one per item
- Deep link from notification → that occurrence
- Test notification button on Settings
- iOS Safari: document “Add to Home Screen” (web push needs the PWA)

### 5. Week view (after Today feels good)

- Seven-day strip under Today
- Mark done on a future day only if you did it early
- Still no month calendar unless you miss it after a month of use

### 6. History you can trust

- Undo skip/done from routine history
- “I did this late on purpose” vs forgotten
- Export CSV of completions
- Restore a paused routine without losing history

---

## Later: other surfaces

### 7. Native mobile (Expo)

- Same `/api/*` + session/token auth (cookies are web-only; add bearer tokens)
- Register APNs/FCM tokens into `push_subscriptions` (`platform`: `ios` / `android`)
- styled-components/native for UI
- Home-screen widgets: count of overdue + next due
- Share sheet / Siri / Shortcuts: “mark bedsheets done”

### 8. Native Mac

- Menu-bar or small window: Today list + mark done
- Same API; optional keyboard: `j/k`, `enter` done, `s` skip
- Focus-mode / Lock Screen reminder via native notifications

### 9. Household (only if you want it)

- Invite a partner to a subset of routines (not full account merge)
- “Someone in the house did it” vs personal hygiene
- Separate from project collaborators / Neon console access

### 10. Calendar interop (optional)

- Subscribe-only ICS feed for Apple Calendar / Google Calendar
- Do **not** two-way sync first; conflicts with “check off in Rhythm”

---

## Suggested order

| Step | Outcome | Depends on |
| --- | --- | --- |
| A | Vercel + Brevo mail in the real inbox + you signing in daily | Verified sender + env vars |
| B | Rolling “from last done” + Today polish | Using Today for a week |
| C | Quiet hours + morning digest push | Web push already on |
| D | Token auth for APIs | Before any native app |
| E | Expo iOS/Android | D + push token column |
| F | Mac menu bar | D |
| G | ICS / household | Only if A–C are habit |

Skip G until the personal loop is automatic. Shared houses and calendar sync are the usual way this category of app gets complicated.

## Explicitly out of v1 / maybe never

- Social streaks, leaderboards, shame emails
- AI that invents chores you did not ask for
- Full Google/Outlook two-way calendar
- Replacing Neon with Convex unless native clients need live query sync
- A separate backend repo until web and native need different ship cadences
