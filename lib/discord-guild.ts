import { getDiscordGuildEnv } from "@/lib/discord-guild-env";

const DISCORD_API = "https://discord.com/api/v10";

type DiscordGuildSummary = {
  id: string;
};

export class DiscordGuildJoinError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "not_member" | "join_failed" | "api_error",
  ) {
    super(message);
    this.name = "DiscordGuildJoinError";
  }
}

async function discordApi<T>(
  path: string,
  init: RequestInit & { bearer?: string; bot?: string },
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const headers = new Headers(init.headers);

  if (init.bearer) {
    headers.set("Authorization", `Bearer ${init.bearer}`);
  } else if (init.bot) {
    headers.set("Authorization", `Bot ${init.bot}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(12_000),
  });

  if (res.status === 204) {
    return { ok: true, status: res.status, data: null };
  }

  const text = await res.text();
  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }

  return { ok: res.ok, status: res.status, data };
}

async function userIsGuildMember(
  accessToken: string,
  guildId: string,
): Promise<boolean> {
  const { ok, data } = await discordApi<DiscordGuildSummary[]>(
    "/users/@me/guilds",
    { bearer: accessToken },
  );

  if (!ok || !data) {
    throw new DiscordGuildJoinError(
      "Could not verify Discord server membership",
      "api_error",
    );
  }

  return data.some((guild) => guild.id === guildId);
}

async function addUserToGuild(
  discordUserId: string,
  accessToken: string,
  guildId: string,
  botToken: string,
): Promise<void> {
  const { ok, status } = await discordApi<unknown>(
    `/guilds/${guildId}/members/${discordUserId}`,
    {
      method: "PUT",
      bot: botToken,
      body: JSON.stringify({ access_token: accessToken }),
    },
  );

  // 201 created, 204 already a member
  if (ok || status === 204) {
    return;
  }

  throw new DiscordGuildJoinError(
    `Discord server join failed (HTTP ${status})`,
    "join_failed",
  );
}

/**
 * Ensures the Discord user is in the Stone Gods server.
 * Uses guilds.join OAuth scope + bot Add Guild Member when they are not already a member.
 */
export async function ensureStoneGodsGuildMembership(
  discordUserId: string,
  accessToken: string,
): Promise<void> {
  const env = getDiscordGuildEnv();
  if (!env) {
    if (process.env.NODE_ENV === "production") {
      throw new DiscordGuildJoinError(
        "Discord server gate is not configured",
        "not_configured",
      );
    }
    console.warn("[discord-guild] DISCORD_GUILD_ID / DISCORD_BOT_TOKEN not set — skipping guild join");
    return;
  }

  const alreadyMember = await userIsGuildMember(accessToken, env.guildId);
  if (alreadyMember) {
    return;
  }

  await addUserToGuild(discordUserId, accessToken, env.guildId, env.botToken);

  const joined = await userIsGuildMember(accessToken, env.guildId);
  if (!joined) {
    throw new DiscordGuildJoinError(
      "Could not confirm Stone Gods Discord membership after join",
      "not_member",
    );
  }
}
