import type { NextConfig } from "next";

const allowedDevOrigins =
  process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  // Required for mobile/tablet testing via LAN IP (Next.js 16 blocks by default)
  allowedDevOrigins,
};

export default nextConfig;
