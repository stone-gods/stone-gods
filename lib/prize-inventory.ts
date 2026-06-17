import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { dasRpc } from "@/lib/das-rpc";
import type { PrizeInfo } from "@/types/game";

type HeliusAsset = {
  id: string;
  interface?: string;
  burnt?: boolean;
  compression?: { compressed?: boolean };
  ownership?: { owner?: string };
  token_info?: {
    token_program?: string;
    associated_token_address?: string;
    supply?: number;
    decimals?: number;
  };
  content?: {
    json_uri?: string;
    metadata?: { name?: string; symbol?: string };
    links?: { image?: string; external_url?: string };
    files?: { uri?: string; mime?: string }[];
  };
};

type GetAssetsByOwnerResult = {
  items: HeliusAsset[];
};

const FUNGIBLE_INTERFACES = new Set(["FungibleAsset", "FungibleToken"]);

function extractPrizeNumber(name: string): string | null {
  if (name.includes("#")) return null;

  const trailingMatch = name.match(/\b(\d+)\s*$/);
  return trailingMatch?.[1] ?? null;
}

type OffChainMetadata = {
  name?: string;
  image?: string;
};

const GENERIC_PRIZE_NAME = "NFT Prize";

async function fetchOffChainMetadata(jsonUri: string): Promise<OffChainMetadata | null> {
  try {
    const res = await fetch(jsonUri, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const meta = (await res.json()) as { name?: string; image?: string };
    return {
      name: meta.name?.trim() || undefined,
      image: meta.image?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

function resolveDasName(asset: HeliusAsset): string | null {
  return (
    asset.content?.metadata?.name?.trim() ||
    asset.content?.metadata?.symbol?.trim() ||
    null
  );
}

function resolveDirectImageUrl(asset: HeliusAsset): string | null {
  return (
    asset.content?.links?.image?.trim() ??
    asset.content?.files?.find((file) => file.uri?.trim() && file.mime?.startsWith("image/"))
      ?.uri ??
    asset.content?.files?.find((file) => file.uri?.trim())?.uri?.trim() ??
    null
  );
}

async function assetToPrize(asset: HeliusAsset): Promise<PrizeInfo | null> {
  const jsonUri = asset.content?.json_uri?.trim();
  const offChain = jsonUri ? await fetchOffChainMetadata(jsonUri) : null;

  const name = offChain?.name || resolveDasName(asset) || GENERIC_PRIZE_NAME;
  const imageUrl =
    resolveDirectImageUrl(asset) ?? offChain?.image ?? "/assets/stone-gods-thumb.png";

  return {
    mintAddress: asset.id,
    name,
    imageUrl,
    number: extractPrizeNumber(name),
  };
}

function isEligibleNonCompressedNft(asset: HeliusAsset): boolean {
  if (asset.burnt) return false;
  if (asset.compression?.compressed) return false;
  if (!asset.ownership?.owner) return false;
  if (asset.interface && FUNGIBLE_INTERFACES.has(asset.interface)) return false;

  const decimals = asset.token_info?.decimals;
  const supply = asset.token_info?.supply;
  if (decimals !== undefined && decimals !== 0) return false;
  if (supply !== undefined && supply !== 1) return false;

  return true;
}

async function fetchDasItems(ownerAddress: string, rpcUrl: string): Promise<HeliusAsset[]> {
  const items: HeliusAsset[] = [];
  let page = 1;

  while (true) {
    const result = await dasRpc<GetAssetsByOwnerResult>(rpcUrl, "getAssetsByOwner", {
      ownerAddress,
      page,
      limit: 1000,
      displayOptions: {
        showFungible: false,
        showUnverifiedCollections: true,
        showCollectionMetadata: true,
      },
    });

    items.push(...result.items);
    if (result.items.length < 1000) break;
    page += 1;
  }

  return items;
}

async function fetchMintAddressesFromTokenAccounts(
  rpcUrl: string,
  ownerAddress: string,
): Promise<string[]> {
  const connection = new Connection(rpcUrl, "confirmed");
  const owner = new PublicKey(ownerAddress);
  const mints = new Set<string>();

  for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
    const accounts = await connection.getParsedTokenAccountsByOwner(owner, { programId });

    for (const { account } of accounts.value) {
      const parsed = account.data;
      if (parsed.program !== "spl-token" || parsed.parsed.type !== "account") continue;

      const info = parsed.parsed.info as {
        mint: string;
        tokenAmount: { decimals: number; uiAmount: number | null };
      };

      if (info.tokenAmount.decimals === 0 && info.tokenAmount.uiAmount === 1) {
        mints.add(info.mint);
      }
    }
  }

  return [...mints];
}

async function fetchAssetById(rpcUrl: string, id: string): Promise<HeliusAsset | null> {
  const direct = await dasRpc<HeliusAsset>(rpcUrl, "getAsset", { id }).catch(() => null);
  if (direct) return direct;

  // `id` may be a token account address rather than mint — resolve to mint via on-chain data.
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const info = await connection.getParsedAccountInfo(new PublicKey(id));
    const parsed = info.value?.data;
    if (
      parsed &&
      typeof parsed === "object" &&
      "parsed" in parsed &&
      parsed.parsed &&
      typeof parsed.parsed === "object" &&
      "info" in parsed.parsed
    ) {
      const mint = (parsed.parsed.info as { mint?: string }).mint;
      if (mint) {
        return await dasRpc<HeliusAsset>(rpcUrl, "getAsset", { id: mint }).catch(() => null);
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function prizesFromAssets(assets: HeliusAsset[]): Promise<PrizeInfo[]> {
  const prizes: PrizeInfo[] = [];
  const seenMints = new Set<string>();

  for (const asset of assets) {
    if (!isEligibleNonCompressedNft(asset)) continue;

    const prize = await assetToPrize(asset);
    if (!prize || seenMints.has(prize.mintAddress)) continue;

    seenMints.add(prize.mintAddress);
    prizes.push(prize);
  }

  return prizes;
}

async function fetchPrizeNftsViaDas(
  ownerAddress: string,
  rpcUrl: string,
): Promise<PrizeInfo[]> {
  const dasItems = await fetchDasItems(ownerAddress, rpcUrl);
  const prizes = await prizesFromAssets(dasItems);
  const seenMints = new Set(prizes.map((prize) => prize.mintAddress));

  const onChainMints = await fetchMintAddressesFromTokenAccounts(rpcUrl, ownerAddress);
  const missingMints = onChainMints.filter((mint) => !seenMints.has(mint));

  for (const mint of missingMints) {
    const asset = await fetchAssetById(rpcUrl, mint);
    if (!asset || !isEligibleNonCompressedNft(asset)) continue;

    const prize = await assetToPrize(asset);
    if (!prize || seenMints.has(prize.mintAddress)) continue;

    seenMints.add(prize.mintAddress);
    prizes.push(prize);
  }

  return prizes;
}

export function getMockPrizeInventory(): PrizeInfo[] {
  return [
    {
      mintAddress: "mock-stone-god-1",
      name: "Stone God",
      imageUrl: "/assets/symbols/stone-god.png",
      number: "7",
    },
    {
      mintAddress: "mock-wolf-1",
      name: "Wolf Warrior",
      imageUrl: "/assets/symbols/wolf-warrior.png",
      number: "12",
    },
    {
      mintAddress: "mock-amber-1",
      name: "Amber Gem",
      imageUrl: "/assets/symbols/amber-gem.png",
      number: "3",
    },
  ];
}

export async function prizeInfoFromAssetId(
  rpcUrl: string,
  assetId: string,
): Promise<PrizeInfo | null> {
  const asset = await fetchAssetById(rpcUrl, assetId);
  if (!asset) return null;
  return assetToPrize(asset);
}

export async function enrichPrizeInfo(
  prize: PrizeInfo,
  rpcUrl: string,
): Promise<PrizeInfo> {
  if (prize.name !== GENERIC_PRIZE_NAME) return prize;

  const refreshed = await prizeInfoFromAssetId(rpcUrl, prize.mintAddress);
  return refreshed ?? prize;
}

export async function fetchEligiblePrizeNfts(
  ownerAddress: string,
  rpcUrl: string,
): Promise<PrizeInfo[]> {
  try {
    return await fetchPrizeNftsViaDas(ownerAddress, rpcUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load prize inventory";
    throw new Error(
      `${message}. Use a Helius RPC URL with DAS enabled (getAssetsByOwner).`,
    );
  }
}
