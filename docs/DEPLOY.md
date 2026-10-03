# Deploy checklist

## 1. Neon database

1. Create a project at [https://console.neon.tech](https://console.neon.tech)
2. Copy the connection string (`DATABASE_URL`)
3. Apply schema:

```bash
DATABASE_URL='postgresql://…' npm run db:migrate
```

Or paste the files in [`drizzle/`](../drizzle/) into Neon’s SQL editor in order (`0000` … `0004`).

## 2. Vercel project

```bash
npx vercel link
npx vercel env add DATABASE_URL
npx vercel env add AUTH_SECRET   # openssl rand -base64 32
npx vercel env add AUTH_URL      # https://your-app.vercel.app
npx vercel env add CRON_SECRET   # openssl rand -base64 32
# optional for real emails (Resend):
npx vercel env add RESEND_API_KEY
npx vercel env add EMAIL_FROM
npx vercel --prod
```

`vercel.json` already schedules hourly occurrence generation and reminder pushes at `/api/cron/generate-occurrences`. Set the same `CRON_SECRET` in Vercel → Project → Settings → Cron Jobs (Authorization bearer).

Also set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (for example `mailto:you@yourdomain.com`). Generate keys with `npx web-push generate-vapid-keys`.

## 3. Verify

1. Open the production URL → `/login`
2. Request a magic link (check email, or Vercel function logs if `EMAIL_SERVER` is unset)
3. Create a routine → confirm it appears on **Today**
