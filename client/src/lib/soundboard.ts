export type SoundboardSoundFile = string;

export type SoundboardSound = {
  file: SoundboardSoundFile;
  label: string;
  src: string;
};

function filenameFromPath(p: string) {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function labelFromFilename(file: string) {
  const base = file.replace(/\.[^.]+$/, '');
  return base.replace(/-/g, ' ');
}

// Auto-discover sounds from /public/assets/soundboard.
// Add files there and they will appear in the list on next rebuild.
// Supported extensions can be extended as needed.
const SOUND_URLS = import.meta.glob('../../public/assets/soundboard/*.{mp3,wav,ogg}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

export const SOUNDBOARD_SOUNDS: SoundboardSound[] = Object.entries(SOUND_URLS)
  .map(([path, src]) => {
    const file = filenameFromPath(path);
    return { file, src, label: labelFromFilename(file) };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

export function isSoundboardSoundFile(v: unknown): v is SoundboardSoundFile {
  return typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9 _.-]*\.(mp3|wav|ogg)$/i.test(v);
}
