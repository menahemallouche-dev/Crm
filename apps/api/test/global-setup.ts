import { execSync } from "child_process";
import { applyTestEnv } from "./test-env";

/**
 * Runs once before the whole e2e suite: applies every Prisma migration to
 * the test database, so `npm run test:e2e` is self-contained as long as
 * Postgres is reachable (see docker-compose.yml or README § Tests).
 */
export default async function globalSetup() {
  applyTestEnv();
  execSync("npx prisma migrate deploy", {
    cwd: __dirname + "/..",
    stdio: "inherit",
    env: process.env,
  });
}
