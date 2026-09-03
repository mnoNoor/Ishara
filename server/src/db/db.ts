import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const DBkey = process.env.DATABASE_URL;
if (!DBkey) {
  throw new Error("DATABASE_URL is not defined");
}

const client = postgres(DBkey);
export const db = drizzle(client, { schema, logger: true });
