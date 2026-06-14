import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { getAuthEnv, resolveAuthUrl } from "@/lib/auth-env";
import { prisma } from "@/lib/prisma";

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
        }),
      ]
    : [],
  trustHost: true,
  callbacks: {
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
