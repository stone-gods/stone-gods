"use client";

import { useEffect, useState } from "react";
import { formatPrizeDisplayName, type PrizeInfo } from "@/types/game";

type PrizeGalleryModalProps = {
  open: boolean;
  onClose: () => void;
};

function prizeNumberLabel(prize: PrizeInfo): string | null {
  if (prize.number) return `#${prize.number}`;
  const hashMatch = prize.name.match(/#\s*(\d+)\s*$/);
  return hashMatch ? `#${hashMatch[1]}` : null;
}

function prizeBaseName(prize: PrizeInfo): string {
  if (prize.number) {
    return prize.name.replace(/\s*\d+\s*$/, "").trim() || prize.name;
  }
  return prize.name.replace(/\s*#\s*\d+\s*$/, "").trim() || prize.name;
}

function PrizeGalleryCard({ prize }: { prize: PrizeInfo }) {
  const displayName = formatPrizeDisplayName(prize);
  const numberLabel = prizeNumberLabel(prize);

  return (
    <li className="prize-gallery__card">
      <img
        className="prize-gallery__image"
        src={prize.imageUrl}
        alt={displayName}
        draggable={false}
        loading="lazy"
      />
      <p className="prize-gallery__name">{prizeBaseName(prize)}</p>
      {numberLabel ? <p className="prize-gallery__number">{numberLabel}</p> : null}
    </li>
  );
}

export default function PrizeGalleryModal({ open, onClose }: PrizeGalleryModalProps) {
  const [prizes, setPrizes] = useState<PrizeInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPrizes(null);

    void fetch("/api/prizes")
      .then(async (res) => {
        const data = (await res.json()) as { prizes?: PrizeInfo[]; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load prizes");
        }
        return data.prizes ?? [];
      })
      .then((items) => {
        if (!cancelled) setPrizes(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load prizes");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="game-modal-backdrop prize-gallery-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="game-modal prize-gallery" role="dialog" aria-modal="true" aria-label="Available prizes">
        <p className="game-modal__heading game-modal__heading--win">Available prizes</p>

        {loading ? <p className="game-modal__text">Loading prizes…</p> : null}

        {error ? (
          <p className="game-modal__text game-modal__text--error">{error}</p>
        ) : null}

        {!loading && !error && prizes?.length === 0 ? (
          <p className="game-modal__text">No prizes available right now.</p>
        ) : null}

        {!loading && !error && prizes && prizes.length > 0 ? (
          <ul className="prize-gallery__grid">
            {prizes.map((prize) => (
              <PrizeGalleryCard key={prize.mintAddress} prize={prize} />
            ))}
          </ul>
        ) : null}

        <button type="button" className="game-modal__continue-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
