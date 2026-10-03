import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireUser } from "@/lib/auth/session";

export const getAuthedUser = createServerFn({ method: "GET" }).handler(
  async () => {
    return requireUser(getRequest());
  },
);
