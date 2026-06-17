export async function dasRpc<T>(
  rpcUrl: string,
  method: string,
  params: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "stone-gods", method, params }),
  });

  if (!res.ok) {
    throw new Error(`Solana RPC request failed (${res.status})`);
  }

  const json = (await res.json()) as { result?: T; error?: { message?: string } };
  if (json.error) {
    throw new Error(json.error.message ?? "Solana RPC error");
  }

  if (json.result === undefined) {
    throw new Error("Solana RPC returned no result");
  }

  return json.result;
}
