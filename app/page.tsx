import GameShell from "@/components/GameShell";

export default function Home() {
  return (
    <main className="game-viewport">
      <div className="game-stage">
        <GameShell />
      </div>
    </main>
  );
}
