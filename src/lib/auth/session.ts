import { Auth } from "@auth/core";
import { getAuthConfig } from "@/lib/auth";

export async function requireUser(request: Request) {
  const config = getAuthConfig();
  const url = new URL("/api/auth/session", request.url);
  const response = await Auth(
    new Request(url, { headers: request.headers }),
    config,
  );
  if (!response.ok) return null;
  const session = (await response.json()) as {
    user?: { id?: string; email?: string | null; name?: string | null };
  } | null;
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}
