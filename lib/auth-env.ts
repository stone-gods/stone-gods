function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

export type AuthEnv = {
  secret: string;
  discordClientId: string;
  discordClientSecret: string;
  url: string | undefined;
};

export function getAuthEnv(): AuthEnv | null {
  const secret = trim(process.env.AUTH_SECRET);
  const discordClientId = trim(process.env.AUTH_DISCORD_ID);
  const discordClientSecret = trim(process.env.AUTH_DISCORD_SECRET);

  if (!secret || !discordClientId || !discordClientSecret) {
    return null;
  }

  return {
    secret,
    discordClientId,
    discordClientSecret,
    url: trim(process.env.AUTH_URL),
  };
}

export function requireAuthEnv(): AuthEnv {
  const env = getAuthEnv();
  if (!env) {
    const missing = [
      !trim(process.env.AUTH_SECRET) && "AUTH_SECRET",
      !trim(process.env.AUTH_DISCORD_ID) && "AUTH_DISCORD_ID",
      !trim(process.env.AUTH_DISCORD_SECRET) && "AUTH_DISCORD_SECRET",
    ].filter(Boolean);

    throw new Error(
      `Discord auth is not configured. Set ${missing.join(", ")} in .env`,
    );
  }

  return env;
}

export function isAuthConfigured(): boolean {
  return getAuthEnv() !== null;
}

export function missingAuthEnvKeys(): string[] {
  return [
    !trim(process.env.AUTH_SECRET) && "AUTH_SECRET",
    !trim(process.env.AUTH_DISCORD_ID) && "AUTH_DISCORD_ID",
    !trim(process.env.AUTH_DISCORD_SECRET) && "AUTH_DISCORD_SECRET",
  ].filter((key): key is string => Boolean(key));
}
