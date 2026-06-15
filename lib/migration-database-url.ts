/**
 * Prisma migrate needs a direct Postgres connection. Neon pooler URLs cannot
 * acquire advisory locks (P1002 timeout during `prisma migrate deploy`).
 */
export function resolveMigrationDatabaseUrl(): string {
  const directUrl = process.env.DIRECT_URL?.trim();
  if (directUrl) return directUrl;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  // Neon: ep-xxx-pooler.region.aws.neon.tech → ep-xxx.region.aws.neon.tech
  if (databaseUrl.includes("-pooler")) {
    return databaseUrl.replace("-pooler", "");
  }

  // Neon cold starts: allow extra time for the direct connection used by migrate.
  if (databaseUrl.includes("neon.tech") && !databaseUrl.includes("connect_timeout=")) {
    const separator = databaseUrl.includes("?") ? "&" : "?";
    return `${databaseUrl}${separator}connect_timeout=30`;
  }

  return databaseUrl;
}
