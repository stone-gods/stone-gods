import { execSync } from "node:child_process";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 4000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      execSync("npx prisma migrate deploy", {
        stdio: "inherit",
        env: {
          ...process.env,
          // Neon + serverless builds often exceed Prisma's 10s advisory lock wait.
          PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "true",
        },
      });
      return;
    } catch {
      if (attempt === MAX_ATTEMPTS) {
        process.exit(1);
      }
      console.warn(
        `prisma migrate deploy failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying…`,
      );
      await sleep(RETRY_DELAY_MS);
    }
  }
}

void main();
