import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  not,
  or,
  sql,
} from "drizzle-orm";
import { createDbClient } from "@/db/client";
import { explainAnalyze } from "@/db/lib/debug";
import * as dbSchemas from "@/db/schema";
import { env } from "@/env";

// @ts-expect-error Node's CommonJS module loading changes the schemas to be under a single 'default' export
const schemas = dbSchemas.default;

const db = createDbClient(env.POSTGRES_URL_NON_POOLING, { max: 1 });

Object.entries({
  db,
  explainAnalyze,
  sql,
  ...schemas,
  eq,
  and,
  or,
  not,
  isNull,
  isNotNull,
  inArray,
  lte,
  gte,
  lt,
  gt,
  asc,
  desc,
  count,
  like,
  ilike,
}).forEach(([key, value]) => {
  (globalThis as any)[key] = value;
});

if (env.VERCEL_ENV === "production") {
  console.log("\x1b[31mProduction environment, setting database connection to read-only.\x1b[0m");
  console.log(
    "\x1b[31mFor a read-write connection, run: await db.execute(sql`SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE`)\x1b[0m",
  );
  await db.execute(sql`SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`);
}
