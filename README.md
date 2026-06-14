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

2. Create a Postgres database ([Neon](https://neon.tech) works well with Vercel). Use the **pooled** connection string for `DATABASE_URL`.

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

Set `DATABASE_URL` (pooled) in project env. Build runs `prisma generate && prisma migrate deploy && next build`.

## Phase 2+ (not yet implemented)

- Discord / X login
- Solana wallet claim for NFT winners
