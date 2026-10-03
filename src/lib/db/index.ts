import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  rhythmDb?: Db;
};

export function getDb(): Db {
  if (globalForDb.rhythmDb) {
    return globalForDb.rhythmDb;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = neon(url);
  const instance = drizzle({ client: sql, schema });
  globalForDb.rhythmDb = instance;
  return instance;
}

/** Convenience alias — prefer getDb() in new code. */
export const db = {
  get query() {
    return getDb().query;
  },
  insert(...args: Parameters<Db["insert"]>) {
    return getDb().insert(...args);
  },
  update(...args: Parameters<Db["update"]>) {
    return getDb().update(...args);
  },
  delete(...args: Parameters<Db["delete"]>) {
    return getDb().delete(...args);
  },
  select(...args: Parameters<Db["select"]>) {
    return getDb().select(...args);
  },
  execute(...args: Parameters<Db["execute"]>) {
    return getDb().execute(...args);
  },
} as unknown as Db;
