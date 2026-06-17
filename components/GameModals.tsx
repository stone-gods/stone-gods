"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { isValidSolanaWalletAddress } from "@/lib/solana-wallet";
import type { PrizeInfo, SpinApiResponse, SpinStatusResponse } from "@/types/game";

export type PostSpinPhase = "idle" | "splash" | "cooldown" | "win-celebration" | "claim";

function DiscordIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function ModalTitle() {
  return (
    <h2 className="game-modal__title">
      <img
        className="game-modal__thumb"
        src="/assets/stone-gods-thumb.png"
        alt=""
        width={40}
        height={40}
      />
      Stone Gods Slots
    </h2>
  );
}

function CountdownText({ targetIso }: { targetIso: string | null }) {
  const countdown = useCountdown(targetIso);
  return (
    <p className="game-modal__countdown">
      Try again in{" "}
      <span className="game-modal__timer">
        {pad(countdown.hours)}:{pad(countdown.mins)}:{pad(countdown.secs)}
      </span>
    </p>
  );
}

function useCountdown(targetIso: string | null) {
  const [parts, setParts] = useState({ hours: 0, mins: 0, secs: 0, done: true });

  useEffect(() => {
    if (!targetIso) {
      setParts({ hours: 0, mins: 0, secs: 0, done: true });
      return;
    }

    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) {
        setParts({ hours: 0, mins: 0, secs: 0, done: true });
        return;
      }

      const totalSecs = Math.floor(diff / 1000);
      setParts({
        hours: Math.floor(totalSecs / 3600),
        mins: Math.floor((totalSecs % 3600) / 60),
        secs: totalSecs % 60,
        done: false,
      });
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  return parts;
}

function resultSplashText(outcome: SpinApiResponse["outcome"], noSpinsLeft: boolean): string {
  if (outcome === "NEAR_MISS") return "So close!";
  if (noSpinsLeft) return "No win this time.\nCome back tomorrow.";
  return "No win this time.";
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ResultSplash({ result }: { result: SpinApiResponse }) {
  const noSpinsLeft = result.spinsRemaining === 0 || result.canSpinAgainAt !== null;
  const lines = resultSplashText(result.outcome, noSpinsLeft).split("\n");

  return (
    <div className="result-splash" role="status" aria-live="polite">
      <p
        className={`result-splash__text${
          result.outcome === "NEAR_MISS" ? " result-splash__text--near" : ""
        }`}
      >
        {lines.map((line, i) => (
          <span key={i} className="result-splash__line">
            {line}
          </span>
        ))}
      </p>
    </div>
  );
}

function PrizeWinCard({ prize }: { prize: PrizeInfo }) {
  const displayName = prize.number ? `${prize.name} #${prize.number}` : prize.name;

  return (
    <div className="game-modal__prize">
      <img
        className="game-modal__prize-image"
        src={prize.imageUrl}
        alt={displayName}
        draggable={false}
      />
      <p className="game-modal__prize-name">{displayName}</p>
    </div>
  );
}

type GameModalsProps = {
  refreshKey?: number;
  lastSpinResult?: SpinApiResponse | null;
  postSpinPhase?: PostSpinPhase;
  postSpinDismissed?: boolean;
  onPostSpinDismiss?: () => void;
  onClaimComplete?: () => void;
  onSpinBlockedChange?: (blocked: boolean) => void;
};

export default function GameModals({
  refreshKey = 0,
  lastSpinResult = null,
  postSpinPhase = "idle",
  postSpinDismissed = false,
  onPostSpinDismiss,
  onClaimComplete,
  onSpinBlockedChange,
}: GameModalsProps) {
  const { status } = useSession();
  const [spinStatus, setSpinStatus] = useState<SpinStatusResponse | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [authConfigured, setAuthConfigured] = useState<boolean | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const returnVisitCountdown = useCountdown(spinStatus?.nextSpinAt ?? null);
  const postSpinCountdown = useCountdown(
    lastSpinResult?.canSpinAgainAt ?? spinStatus?.nextSpinAt ?? null,
  );

  useEffect(() => {
    void fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data: { configured: boolean }) => setAuthConfigured(data.configured))
      .catch(() => setAuthConfigured(false));
  }, []);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/spin");
    if (!res.ok) {
      setSpinStatus(null);
      return;
    }
    setSpinStatus((await res.json()) as SpinStatusResponse);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setSpinStatus(null);
      setWelcomeDismissed(false);
      return;
    }
    void fetchStatus();
  }, [status, fetchStatus, refreshKey]);

  useEffect(() => {
    if (returnVisitCountdown.done && spinStatus && !spinStatus.canSpin) {
      void fetchStatus();
    }
  }, [returnVisitCountdown.done, spinStatus, fetchStatus]);

  useEffect(() => {
    if (
      postSpinCountdown.done &&
      postSpinPhase === "cooldown" &&
      lastSpinResult &&
      !postSpinDismissed
    ) {
      onPostSpinDismiss?.();
    }
  }, [
    postSpinCountdown.done,
    postSpinPhase,
    lastSpinResult,
    postSpinDismissed,
    onPostSpinDismiss,
  ]);

  const pendingWinId =
    postSpinPhase === "win-celebration"
      ? null
      : postSpinPhase === "claim" && lastSpinResult?.outcome === "NFT_WIN"
        ? lastSpinResult.spinId
        : postSpinPhase === "idle" && !lastSpinResult
          ? (spinStatus?.uncollectedWin?.spinId ?? null)
          : null;

  const pendingPrize: PrizeInfo | null =
    postSpinPhase === "claim" && lastSpinResult?.prize
      ? lastSpinResult.prize
      : postSpinPhase === "idle" && !lastSpinResult
        ? (spinStatus?.uncollectedWin?.prize ?? null)
        : (lastSpinResult?.prize ?? null);

  const showResultSplash =
    postSpinPhase === "splash" &&
    lastSpinResult !== null &&
    lastSpinResult.outcome !== "NFT_WIN";

  const showPostSpinLose =
    postSpinPhase === "cooldown" &&
    lastSpinResult !== null &&
    !postSpinDismissed &&
    lastSpinResult.outcome !== "NFT_WIN" &&
    !postSpinCountdown.done;

  const showWelcome = Boolean(
    spinStatus?.canSpin &&
      !welcomeDismissed &&
      postSpinPhase !== "win-celebration" &&
      postSpinPhase !== "claim",
  );
  const showReturnCooldown = Boolean(
    postSpinPhase === "idle" &&
      spinStatus &&
      !spinStatus.canSpin &&
      spinStatus.nextSpinAt &&
      !returnVisitCountdown.done &&
      !lastSpinResult,
  );

  const spinBlocked =
    status === "loading" ||
    status !== "authenticated" ||
    !spinStatus ||
    Boolean(pendingWinId) ||
    postSpinPhase === "win-celebration" ||
    showResultSplash ||
    showPostSpinLose ||
    showWelcome ||
    showReturnCooldown;

  useEffect(() => {
    onSpinBlockedChange?.(spinBlocked);
  }, [spinBlocked, onSpinBlockedChange]);

  async function handleLogin() {
    setLoginError(null);
    if (authConfigured === false) {
      setLoginError("Discord auth is not configured on the server.");
      return;
    }

    const result = await signIn("discord", { redirect: false });
    if (result?.error) {
      setLoginError("Discord login failed. Check server logs and .env credentials.");
      return;
    }
    if (result?.url) window.location.href = result.url;
  }

  async function handleClaim(spinId: string) {
    setClaimError(null);

    if (!isValidSolanaWalletAddress(walletAddress)) {
      setClaimError("Enter a valid Solana wallet address");
      return;
    }

    setClaiming(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, spinId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setClaimError(data.error ?? "Claim failed");
        return;
      }

      setWalletAddress("");
      onClaimComplete?.();
    } catch {
      setClaimError("Network error");
    } finally {
      setClaiming(false);
    }
  }

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className="game-modal-backdrop">
        <div className="game-modal" role="dialog" aria-modal="true">
          <ModalTitle />
          <p className="game-modal__text">Sign in with Discord to continue</p>
          {authConfigured === false ? (
            <p className="game-modal__text game-modal__text--error">
              Set AUTH_DISCORD_ID and AUTH_DISCORD_SECRET in .env, then restart the dev server.
            </p>
          ) : null}
          {loginError ? (
            <p className="game-modal__text game-modal__text--error">{loginError}</p>
          ) : null}
          <button
            type="button"
            className="game-modal__discord-btn"
            onClick={() => void handleLogin()}
            disabled={authConfigured === false}
          >
            <DiscordIcon />
            Login
          </button>
        </div>
      </div>
    );
  }

  // Result splash — before spinStatus gate so it always shows right after a spin
  if (showResultSplash && lastSpinResult) {
    return <ResultSplash result={lastSpinResult} />;
  }

  if (!spinStatus) return null;

  if (pendingWinId && pendingPrize) {
    return (
      <div className="game-modal-backdrop game-modal-backdrop--locked">
        <div className="game-modal game-modal--prize" role="dialog" aria-modal="true">
          <p className="game-modal__heading game-modal__heading--win">You have won</p>
          <PrizeWinCard prize={pendingPrize} />
          <label className="game-modal__label">
            Enter Solana wallet
            <input
              type="text"
              className="game-modal__input"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Solana wallet"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {claimError ? (
            <p className="game-modal__text game-modal__text--error">{claimError}</p>
          ) : null}
          <button
            type="button"
            className="game-modal__claim-btn"
            onClick={() => void handleClaim(pendingWinId)}
            disabled={claiming || !walletAddress.trim()}
          >
            {claiming ? "…" : "Claim"}
          </button>
        </div>
      </div>
    );
  }

  if (showPostSpinLose && lastSpinResult) {
    return (
      <div className="game-modal-backdrop game-modal-backdrop--locked">
        <div className="game-modal" role="dialog" aria-modal="true">
          <p className="game-modal__heading game-modal__heading--lose">Bad luck</p>
          <CountdownText
            targetIso={lastSpinResult.canSpinAgainAt ?? spinStatus.nextSpinAt}
          />
        </div>
      </div>
    );
  }

  if (spinStatus.canSpin && !welcomeDismissed) {
    const n = spinStatus.spinsRemaining;
    return (
      <div className="game-modal-backdrop">
        <div className="game-modal" role="dialog" aria-modal="true">
          <ModalTitle />
          <p className="game-modal__text game-modal__text--highlight">
            You have {n} free spin{n === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            className="game-modal__continue-btn"
            onClick={() => setWelcomeDismissed(true)}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (showReturnCooldown) {
    return (
      <div className="game-modal-backdrop game-modal-backdrop--locked">
        <div className="game-modal" role="dialog" aria-modal="true">
          <ModalTitle />
          <p className="game-modal__text">You have no spins remaining</p>
          <CountdownText targetIso={spinStatus.nextSpinAt} />
        </div>
      </div>
    );
  }

  return null;
}
