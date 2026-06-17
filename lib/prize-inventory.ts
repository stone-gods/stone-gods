import type { PrizeInfo } from "@/types/game";
import { dasRpc } from "@/lib/das-rpc";

type HeliusAsset = {
  id: string;
  interface?: string;
  burnt?: boolean;
  compression?: { compressed?: boolean };
  ownership?: { owner?: string };
  token_info?: {
    token_program?: string;
    associated_token_address?: string;
  };
  content?: {
    metadata?: { name?: string };
    links?: { image?: string };
    files?: { uri?: string }[];
  };
};

type GetAssetsByOwnerResult = {
  items: HeliusAsset[];
};

const NFT_INTERFACES = new Set([
  "V1_NFT",
  "ProgrammableNFT",
  "MplCoreAsset",
  "Custom",
]);

function extractPrizeNumber(name: string): string | null {
  const hashMatch = name.match(/#\s*(\d+)\b/);
  if (hashMatch?.[1]) return hashMatch[1];

  const trailingMatch = name.match(/\b(\d+)\s*$/);
  return trailingMatch?.[1] ?? null;
}

function assetToPrize(asset: HeliusAsset): PrizeInfo | null {
  const name = asset.content?.metadata?.name?.trim();
  if (!name) return null;

  const imageUrl =
    asset.content?.links?.image?.trim() ??
    asset.content?.files?.find((file) => file.uri?.trim())?.uri?.trim() ??
    null;

  if (!imageUrl) return null;

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
  if (!asset.interface || !NFT_INTERFACES.has(asset.interface)) return false;
  if (!asset.ownership?.owner) return false;
  if (!asset.token_info?.associated_token_address) return false;
  return true;
}

async function fetchPrizeNftsViaDas(
  ownerAddress: string,
  rpcUrl: string,
): Promise<PrizeInfo[]> {
  const items: HeliusAsset[] = [];
  let page = 1;

  while (true) {
    const result = await dasRpc<GetAssetsByOwnerResult>(rpcUrl, "getAssetsByOwner", {
      ownerAddress,
      page,
      limit: 1000,
      displayOptions: {
        showFungible: false,
        showCollectionMetadata: false,
      },
    });

    items.push(...result.items);
    if (result.items.length < 1000) break;
    page += 1;
  }

  const prizes: PrizeInfo[] = [];
  const seenMints = new Set<string>();

  for (const asset of items) {
    if (!isEligibleNonCompressedNft(asset)) continue;

    const prize = assetToPrize(asset);
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
