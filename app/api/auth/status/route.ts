import { NextResponse } from "next/server";
import { isAuthConfigured, missingAuthEnvKeys } from "@/lib/auth-env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    configured: isAuthConfigured(),
    missing: missingAuthEnvKeys(),
  });
}
