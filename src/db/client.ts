import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** A Drizzle database: postgres.js in production, embedded PGlite in development and tests. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS_DIR = path.join(process.cwd(), "src/db/migrations");

/** Opens an embedded PGlite database (in memory when dataDir is undefined) and applies migrations. */
export async function openPglite(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite({ dataDir, extensions: { btree_gist } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db as unknown as Db;
}

async function openPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  // Production migrations run at build time (npm run db:migrate), not on each request.
  return drizzle(postgres(url, { prepare: false, max: 5 }), { schema }) as unknown as Db;
}

const globalForDb = globalThis as unknown as { __salonDb?: Promise<Db> };

/** The app's shared database connection. */
export function getDb(): Promise<Db> {
  if (!globalForDb.__salonDb) {
    const url = process.env.DATABASE_URL;
    globalForDb.__salonDb = url ? openPostgres(url) : openPglite(process.env.PGLITE_DIR ?? ".data/pglite");
  }
  return globalForDb.__salonDb;
}
