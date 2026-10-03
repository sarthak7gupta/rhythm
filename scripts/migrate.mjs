import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(url, { max: 1 });
  const dir = join(process.cwd(), "drizzle");
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  await sql`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id serial PRIMARY KEY,
      hash text NOT NULL UNIQUE,
      created_at timestamptz DEFAULT now()
    )
  `;

  for (const file of files) {
    const already = await sql`
      SELECT 1 FROM "__drizzle_migrations" WHERE hash = ${file} LIMIT 1
    `;
    if (already.length > 0) {
      console.log(`skip ${file}`);
      continue;
    }

    const body = readFileSync(join(dir, file), "utf8");
    await sql.unsafe(body);
    await sql`INSERT INTO "__drizzle_migrations" (hash) VALUES (${file})`;
    console.log(`applied ${file}`);
  }

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
