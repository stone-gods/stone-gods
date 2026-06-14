import { simulateWinRate } from "../lib/spin-engine";

const SPINS = 10_000;
const rate = simulateWinRate(SPINS);

console.log(`Simulated ${SPINS} spins`);
console.log(`NFT win rate: ${(rate * 100).toFixed(2)}% (target ~1%)`);
