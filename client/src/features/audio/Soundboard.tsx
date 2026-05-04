import React from 'react';
import { SOUNDBOARD_SOUNDS, type SoundboardSoundFile } from '../../lib/soundboard';
import type { PlayerIndex } from '../../types';

type Props = {
  variant: 'mobile' | 'desktop';
  positionStyle?: React.CSSProperties;
  onClose: () => void;
  onPick: (file: SoundboardSoundFile) => void;
};

function SoundboardItem({
  s,
  onPick,
}: {
  s: (typeof SOUNDBOARD_SOUNDS)[number];
  onPick: (file: SoundboardSoundFile) => void;
}) {
  return (
    <button
      type="button"
      className="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 px-3 py-2 text-left"
      onClick={() => onPick(s.file)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold truncate">{s.label}</span>
        <img
          src="/assets/icons/play.ico"
          alt="Play"
          className="w-4 h-4 opacity-90 group-hover:opacity-100"
        />
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/85">
      Add audio files to <span className="font-mono">client/public/assets/soundboard</span>
    </div>
  );
}

export default function Soundboard({ variant, positionStyle, onClose, onPick }: Props) {
  if (variant === 'mobile') {
    return (
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-[260]">
        <div className="mx-auto max-w-[640px]">
          <div className="rounded-t-3xl border-t border-x border-white/15 bg-tableWood-dark/95 backdrop-blur-sm shadow-caféGlow text-white">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div>
                <div className="text-sm font-semibold tracking-wide">Soundboard</div>
                <div className="text-[11px] text-white/70">Tap a sound to send it</div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs"
                onClick={onClose}
                aria-label="Close soundboard"
              >
                Close
              </button>
            </div>
            <div className="px-4 pb-4 max-h-[55svh] overflow-auto">
              {SOUNDBOARD_SOUNDS.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {SOUNDBOARD_SOUNDS.map((s) => (
                    <SoundboardItem key={s.file} s={s} onPick={onPick} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="hidden sm:block fixed -translate-x-1/2 z-[260] w-[min(360px,34vw)] max-h-[48vh] overflow-hidden rounded-2xl border border-white/15 bg-tableWood-dark/95 backdrop-blur-sm shadow-caféGlow text-white"
      style={positionStyle}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <div className="text-sm font-semibold tracking-wide">Soundboard</div>
          <div className="text-[11px] text-white/70">Pick a sound</div>
        </div>
        <button
          type="button"
          className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs"
          onClick={onClose}
          aria-label="Close soundboard"
        >
          ✕
        </button>
      </div>
      <div className="p-3 max-h-[42vh] overflow-auto">
        {SOUNDBOARD_SOUNDS.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SOUNDBOARD_SOUNDS.map((s) => (
              <SoundboardItem key={s.file} s={s} onPick={onPick} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export for convenience
export type { PlayerIndex };
