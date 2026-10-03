# Abuse controls

Limits are enforced on the server. Counters live in `rate_limits` (hashed keys) so they work across serverless instances.

## Windows

| Bucket | Cap |
| --- | --- |
| Auth GET (CSRF, session) | 90 / min / IP |
| Auth POST | 30 / min / IP |
| Magic-link email | Valid, non-disposable address required. Then 5 / 15 min / IP, 3 / 15 min / address, 40 / 15 min global |
| API reads | 120 / min / IP |
| API writes | 60 / min / IP |
| New routines | 8 / min and 20 / hour / user, max 80 routines |
| Push devices | 12 / user |
| JSON body | 32 KiB |

Over-limit responses are `429` with `Retry-After`. Email and writes **fail closed** if the limit store errors. Reads fail open so Today still loads.

Hourly cron (`/api/cron/generate-occurrences`) prunes rows older than two days. Cron itself requires `x-vercel-cron: 1` or `Authorization: Bearer $CRON_SECRET`.

Caps are defined in `src/lib/security/limits.ts`. Product intent (remind, don’t nag; fail closed on mail): [PHILOSOPHY.md](PHILOSOPHY.md).
