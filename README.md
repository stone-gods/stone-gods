# Stone Gods Slots

Daily promo slot game for the Stone Gods NFT project. Deployed on Vercel with serverless API routes.

## Stack

- Next.js 16 (App Router)
- Prisma 7 + PostgreSQL (Neon recommended, pooled URL on Vercel)
- Framer Motion for reel animation

## Setup

1. Copy env and set your database URL:

```bash
cp .env.example .env
```

2. Create a Postgres database ([Neon](https://neon.tech) works well with Vercel). Use the **pooled** connection string for `DATABASE_URL`. Migrations auto-use a direct Neon host (or set `DIRECT_URL` explicitly).

3. Run migrations:

```bash
npm run db:migrate
```

4. Start dev server:

```bash
npm run dev
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/spin` | Spin status (can spin today?, last result) |
| `POST` | `/api/spin` | Execute daily spin (~1% NFT win rate) |

Spins are **server-authoritative** — outcome is decided before the UI animates.

## Scripts

- `npm run verify:win-rate` — simulate 10k spins to check ~1% win rate
- `npm run db:push` — push schema without migration (dev only)

## Vercel deploy

Set `DATABASE_URL` (pooled Neon URL) in project env. Build runs `prisma generate`, migrations (`tsx scripts/migrate-deploy.ts`), then `next build`. Migrations use a direct DB connection automatically when the URL contains `-pooler`; optionally set `DIRECT_URL` to override.

To deploy migrations manually: `npx tsx scripts/migrate-deploy.ts`

## Discord login + server membership

Players sign in with Discord OAuth. On first login, users who are not already in the Stone Gods Discord are **auto-joined** via the `guilds.join` scope before auth completes.

### Discord application setup

1. In the [Discord Developer Portal](https://discord.com/developers/applications), use the same app as `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET`.
2. Under **OAuth2**, add redirect URLs for your site (e.g. `https://stone-gods.vercel.app/api/auth/callback/discord`).
3. Under **Bot**, create a bot and copy the token to `DISCORD_BOT_TOKEN`.
4. Invite the bot to the Stone Gods server with **Create Instant Invite** permission:
   `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=1`
5. Copy the server (guild) ID to `DISCORD_GUILD_ID` (Developer Mode → right-click server → Copy Server ID).

| Variable | Description |
|----------|-------------|
| `DISCORD_GUILD_ID` | Stone Gods Discord server ID |
| `DISCORD_BOT_TOKEN` | Bot token from the OAuth application |
| `DISCORD_INVITE_URL` | Optional manual invite link if auto-join fails |

## NFT prize claim (Solana)

Winners claim via Discord login + Solana wallet address. Set these env vars on Vercel and locally:

| Variable | Description |
|----------|-------------|
| `SOLANA_RPC_URL` | Solana RPC endpoint (e.g. Helius) |
| `PRIZE_WALLET` | Public key of the wallet holding prize NFTs |
| `PRIZE_WALLET_PRIVATE_KEY` | Base58-encoded secret key for that wallet (signs transfers) |
| `MOCK_NFT_CLAIM` | `true` skips on-chain transfer (testing only) |

On win, the server randomly assigns a **non-compressed** NFT from the prize wallet (via Helius DAS — cNFT/spam airdrops are excluded). `PRIZE_WALLET` must match the public key derived from `PRIZE_WALLET_PRIVATE_KEY`.
