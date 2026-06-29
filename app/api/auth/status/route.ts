import { NextResponse } from "next/server";
import { isAuthConfigured, missingAuthEnvKeys } from "@/lib/auth-env";
import { isDevForceWin, isDevUnlimitedSpins } from "@/lib/dev";
import { isDiscordGuildGateConfigured } from "@/lib/discord-guild-env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    configured: isAuthConfigured(),
    missing: missingAuthEnvKeys(),
    guildGateConfigured: isDiscordGuildGateConfigured(),
    devUnlimitedSpins: isDevUnlimitedSpins(),
    devForceWin: isDevForceWin(),
  });
}
