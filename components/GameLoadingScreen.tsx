type GameLoadingScreenProps = {
  exiting?: boolean;
};

export default function GameLoadingScreen({ exiting = false }: GameLoadingScreenProps) {
  return (
    <div
      className={`game-loading-screen${exiting ? " game-loading-screen--exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Stone Gods Slots"
    >
      <div className="game-loading-screen__content">
        <img
          className="game-loading-screen__logo"
          src="/assets/stone-gods-thumb.png"
          alt=""
          width={72}
          height={72}
          draggable={false}
        />
        <h1 className="game-loading-screen__title">Stone Gods Slots</h1>
        <div className="game-loading-screen__spinner" aria-hidden>
          <span className="game-loading-screen__ring" />
          <span className="game-loading-screen__gem" />
        </div>
        <p className="game-loading-screen__label">Loading…</p>
      </div>
    </div>
  );
}
