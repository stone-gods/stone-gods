import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { getAuthEnv, resolveAuthUrl } from "@/lib/auth-env";
import { DiscordGuildJoinError, ensureStoneGodsGuildMembership } from "@/lib/discord-guild";
import { prisma } from "@/lib/prisma";

const DISCORD_SCOPES = "identify email guilds guilds.join";

const resolvedAuthUrl = resolveAuthUrl();
if (resolvedAuthUrl) {
  process.env.AUTH_URL = resolvedAuthUrl;
}

const authEnv = getAuthEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: authEnv?.secret,
  providers: authEnv
    ? [
        Discord({
          clientId: authEnv.discordClientId,
          clientSecret: authEnv.discordClientSecret,
          authorization: {
            params: {
              scope: DISCORD_SCOPES,
            },
          },
        }),
      ]
    : [],
  trustHost: true,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "discord") return true;
      if (!account.access_token) return false;

      const discordUserId =
        (profile as { id?: string } | undefined)?.id ?? account.providerAccountId;
      if (!discordUserId) return false;

      try {
        await ensureStoneGodsGuildMembership(discordUserId, account.access_token);
        return true;
      } catch (err) {
        console.error("[auth] Discord guild join failed:", err);
        if (err instanceof DiscordGuildJoinError) {
          return "/?authError=discord_guild";
        }
        return "/?authError=discord_guild";
      }
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;

      await prisma.gameSession.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    },
  },
});
