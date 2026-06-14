import { SYMBOLS } from "@/lib/symbols";
import type { SymbolId } from "@/types/game";

type ReelSymbolProps = {
  symbolId: SymbolId;
};

export default function ReelSymbol({ symbolId }: ReelSymbolProps) {
  const { label, tier, image } = SYMBOLS[symbolId];

  return (
    <div className={`reel-symbol reel-symbol--${tier}`}>
      <img className="reel-symbol__img" src={image} alt={label} draggable={false} />
    </div>
  );
}
