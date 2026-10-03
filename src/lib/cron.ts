/**
 * Hourly job auth. Vercel sets `x-vercel-cron: 1`. Manual/native callers
 * must send `Authorization: Bearer $CRON_SECRET`.
 */
export function authorizeCron(request: Request): Response | null {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const bearerOk = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !bearerOk) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
