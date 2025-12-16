/* eslint-disable prettier/prettier */
/* eslint linebreak-style: 0 */
import React from 'react';

export type UseSoundOptions = {
  volume?: number; // 0..1
  playbackRate?: number; // default 1
  loop?: boolean; // default false
  interrupt?: boolean; // if true, cut/restart on play()
  preload?: 'none' | 'metadata' | 'auto';
};

export function useSound(src: string, options?: UseSoundOptions) {
  const {
    volume = 1,
    playbackRate = 1,
    loop = false,
    interrupt = true,
    preload = 'auto',
  } = options || {};

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const ensureAudio = React.useCallback(() => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(src);
      audio.preload = preload;
      audio.loop = loop;
      audio.volume = volume;
      audio.playbackRate = playbackRate;
      audioRef.current = audio;
      const onPlay = () => setIsPlaying(true);
      const onPauseOrEnd = () => setIsPlaying(false);
      audio.addEventListener('play', onPlay);
      audio.addEventListener('pause', onPauseOrEnd);
      audio.addEventListener('ended', onPauseOrEnd);
      // Store listeners on the element for cleanup
      // @ts-expect-error attach for cleanup
      audio.__listeners = { onPlay, onPauseOrEnd } as const;
    } else {
      // Keep runtime properties in sync
      audio.loop = loop;
      audio.volume = volume;
      audio.playbackRate = playbackRate;
    }
    return audio;
  }, [src, loop, volume, playbackRate, preload]);

  const play = React.useCallback(async () => {
    const audio = ensureAudio();
    try {
      if (interrupt) {
        audio.pause();
        audio.currentTime = 0;
      }
      await audio.play();
    } catch {
      // ignore play promise rejections due to browser policies
    }
  }, [ensureAudio, interrupt]);

  const stop = React.useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.pause();
    } catch {
      // ignore pause errors
    }
    a.currentTime = 0;
  }, []);

  // If src changes, dispose existing audio so a new one is created.
  type AudioWithListeners = HTMLAudioElement & {
    __listeners?: { onPlay: () => void; onPauseOrEnd: () => void };
  };

  React.useEffect(() => {
    return () => {
      const a = audioRef.current as AudioWithListeners | null;
      if (!a) return;
      try {
        a.pause();
      } catch {
        // ignore pause errors
      }
      if (a.__listeners) {
        const { onPlay, onPauseOrEnd } = a.__listeners;
        a.removeEventListener('play', onPlay);
        a.removeEventListener('pause', onPauseOrEnd);
        a.removeEventListener('ended', onPauseOrEnd);
      }
      audioRef.current = null;
    };
    // Cleanup runs on unmount or when hook is re-created
  }, [src]);

  return { play, stop, isPlaying, audioRef } as const;
}

export default useSound;
