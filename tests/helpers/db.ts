import { openPglite, type Db } from "@/db/client";

/** A fresh, migrated, in-memory database for one test. */
export function createTestDb(): Promise<Db> {
  return openPglite();
}
