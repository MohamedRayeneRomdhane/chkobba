import React from 'react';
import { SOUNDBOARD_SOUNDS, type SoundboardSoundFile } from '../../lib/soundboard';
import type { PlayerIndex } from '../../types';
import { useGameStore } from '../../store';

const EQ_BARS = 24;
const SAFETY_MS = 6_000;

type AnalyserNodeBundle = {
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  raf: number | null;
};

/**
 * Owns per-seat audio playback + WebAudio analyser graph for the soundboard.
 * Returns play / stop + the seat-bars + speaking-seat state via the store.
 */
export function useSoundboardAudio() {
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const seatAudioRef = React.useRef<Map<number, HTMLAudioElement>>(new Map());
  const seatAnalyserRef = React.useRef<Map<number, AnalyserNodeBundle>>(new Map());

  const setSpeakingSeat = useGameStore((s) => s.setSpeakingSeat);
  const setSeatBars = useGameStore((s) => s.setSeatBars);

  const stopForSeat = React.useCallback(
    (seatIndex: number) => {
      const audio = seatAudioRef.current.get(seatIndex);
      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {
          /* ignore */
        }
        seatAudioRef.current.delete(seatIndex);
      }

      setSeatBars(seatIndex, null);
      const cur = useGameStore.getState().speakingSeat;
      if (cur === seatIndex) setSpeakingSeat(null);

      const node = seatAnalyserRef.current.get(seatIndex);
      if (node) {
        if (node.raf != null) cancelAnimationFrame(node.raf);
        try {
          node.source.disconnect();
          node.analyser.disconnect();
        } catch {
          /* ignore */
        }
        seatAnalyserRef.current.delete(seatIndex);
      }
    },
    [setSeatBars, setSpeakingSeat]
  );

  const playForSeat = React.useCallback(
    async (seatIndex: PlayerIndex, file: SoundboardSoundFile) => {
      stopForSeat(seatIndex);

      const match = SOUNDBOARD_SOUNDS.find((s) => s.file === file);
      const src = match?.src ?? `/assets/soundboard/${file}`;
      const audio = new Audio(src);
      audio.volume = 0.95;
      seatAudioRef.current.set(seatIndex, audio);

      setSpeakingSeat(seatIndex);

      try {
        const maybeWebkit = window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        };
        const Ctx = window.AudioContext ?? maybeWebkit.webkitAudioContext;
        if (!Ctx) throw new Error('AudioContext not supported');
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
        const ctx = audioCtxRef.current;
        try {
          await ctx.resume();
        } catch {
          /* ignore */
        }

        const mediaAny = audio as unknown as {
          captureStream?: () => MediaStream;
          mozCaptureStream?: () => MediaStream;
        };
        const stream = mediaAny.captureStream?.() ?? mediaAny.mozCaptureStream?.();
        if (!stream) throw new Error('captureStream not supported');

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);

        const buf = new Uint8Array(analyser.frequencyBinCount);
        const bundle: AnalyserNodeBundle = { analyser, source, raf: null };
        seatAnalyserRef.current.set(seatIndex, bundle);

        const tick = () => {
          analyser.getByteFrequencyData(buf);
          const slice = Math.floor(buf.length / EQ_BARS) || 1;
          const bars: number[] = [];
          for (let i = 0; i < EQ_BARS; i++) {
            let sum = 0;
            let count = 0;
            const start = i * slice;
            const end = Math.min(buf.length, start + slice);
            for (let j = start; j < end; j++) {
              sum += buf[j] ?? 0;
              count++;
            }
            const avg = count ? sum / (count * 255) : 0;
            const boosted = Math.min(1, Math.max(0, Math.pow(avg, 0.72) * 1.25));
            bars.push(Math.round(boosted * 100) / 100);
          }
          setSeatBars(seatIndex, bars);
          bundle.raf = requestAnimationFrame(tick);
        };
        bundle.raf = requestAnimationFrame(tick);
      } catch {
        /* analyser optional */
      }

      const safetyT = window.setTimeout(() => stopForSeat(seatIndex), SAFETY_MS);
      audio.onended = () => {
        window.clearTimeout(safetyT);
        stopForSeat(seatIndex);
      };
      audio.onerror = () => {
        window.clearTimeout(safetyT);
        stopForSeat(seatIndex);
      };

      try {
        await audio.play();
      } catch {
        window.clearTimeout(safetyT);
        stopForSeat(seatIndex);
      }
    },
    [setSeatBars, setSpeakingSeat, stopForSeat]
  );

  React.useEffect(() => {
    const audio = seatAudioRef.current;
    const analysers = seatAnalyserRef.current;
    const ctxRef = audioCtxRef;
    return () => {
      for (const a of audio.values()) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
      audio.clear();
      for (const node of analysers.values()) {
        if (node.raf != null) cancelAnimationFrame(node.raf);
        try {
          node.source.disconnect();
          node.analyser.disconnect();
        } catch {
          /* ignore */
        }
      }
      analysers.clear();
      ctxRef.current?.close().catch(() => {
        /* ignore */
      });
    };
  }, []);

  return { playForSeat, stopForSeat };
}
