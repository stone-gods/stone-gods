import { simulateWinRate, simulateWinRateWithPool } from "../lib/spin-engine";

const SPINS = 10_000;
const rate = simulateWinRate(SPINS);
const pooled = simulateWinRateWithPool(SPINS);

console.log(`Simulated ${SPINS} spins (no pool cap)`);
console.log(`NFT win rate: ${(rate * 100).toFixed(2)}% (target ~1%)`);
console.log(`\nSimulated ${SPINS} spins (with 1 win / 100 pool cap)`);
console.log(`NFT win rate: ${(pooled.rate * 100).toFixed(2)}%`);
console.log(`Max wins in any 100-spin window: ${pooled.maxWinsInWindow} (must be ≤ 1)`);
