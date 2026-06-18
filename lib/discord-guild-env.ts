function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

export type DiscordGuildEnv = {
  guildId: string;
  botToken: string;
  inviteUrl: string | undefined;
};

export function getDiscordGuildEnv(): DiscordGuildEnv | null {
  const guildId = trim(process.env.DISCORD_GUILD_ID);
  const botToken = trim(process.env.DISCORD_BOT_TOKEN);

  if (!guildId || !botToken) {
    return null;
  }

  return {
    guildId,
    botToken,
    inviteUrl: trim(process.env.DISCORD_INVITE_URL),
  };
}

export function isDiscordGuildGateConfigured(): boolean {
  return getDiscordGuildEnv() !== null;
}
