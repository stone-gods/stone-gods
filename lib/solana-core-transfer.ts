import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  fetchAsset,
  fetchCollection,
  mplCore,
  transfer,
} from "@metaplex-foundation/mpl-core";
import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
} from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import type { Keypair } from "@solana/web3.js";

export async function transferCoreAsset(
  rpcUrl: string,
  prizeWallet: Keypair,
  assetAddress: string,
  recipientAddress: string,
  collectionAddress: string | null,
): Promise<string> {
  const umi = createUmi(rpcUrl).use(mplCore());
  const umiKeypair = fromWeb3JsKeypair(prizeWallet);
  const signer = createSignerFromKeypair(umi, umiKeypair);
  umi.use(signerIdentity(signer));

  const asset = await fetchAsset(umi, assetAddress);
  const collection = collectionAddress
    ? await fetchCollection(umi, collectionAddress)
    : undefined;

  const result = await transfer(umi, {
    asset,
    ...(collection ? { collection } : {}),
    newOwner: publicKey(recipientAddress),
  }).sendAndConfirm(umi, {
    confirm: { commitment: "confirmed" },
  });

  return String(result.signature);
}
