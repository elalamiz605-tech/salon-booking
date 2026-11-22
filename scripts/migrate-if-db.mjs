// Applies database migrations before a production build when DATABASE_URL is set.
// Locally (no DATABASE_URL) the embedded PGlite database migrates itself on first use.
import { execSync } from "node:child_process";

if (process.env.DATABASE_URL) {
  execSync("npx drizzle-kit migrate", { stdio: "inherit" });
} else {
  console.log("No DATABASE_URL: skipping migrations (PGlite migrates on first use).");
}
