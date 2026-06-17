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

## NFT prize claim (Solana)

Winners claim via Discord login + Solana wallet address. Set these env vars on Vercel and locally:

| Variable | Description |
|----------|-------------|
| `SOLANA_RPC_URL` | Solana RPC endpoint (e.g. Helius) |
| `PRIZE_WALLET` | Public key of the wallet holding Stone God NFTs |
| `PRIZE_WALLET_PRIVATE_KEY` | Base58-encoded secret key for that wallet (signs transfers) |
| `NFT_MINT_ADDRESS` | Mint address of the Stone God NFT |
| `MOCK_NFT_CLAIM` | `true` skips on-chain transfer (testing only) |

The prize wallet must hold the NFT in its associated token account. `PRIZE_WALLET` must match the public key derived from `PRIZE_WALLET_PRIVATE_KEY`.
