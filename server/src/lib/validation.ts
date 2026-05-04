import { z } from 'zod';

const ROOM_CODE = z.string().regex(/^[A-Z0-9]{4,8}$/, 'invalid room code');
const CARD_ID = z.string().min(1).max(64);

export const RoomCodeSchema = ROOM_CODE;
export const CardIdSchema = CARD_ID;

export const RoomJoinSchema = ROOM_CODE; // payload IS the code

export const RoomSettingsSchema = z.object({
  code: ROOM_CODE,
  settings: z.object({
    mode: z.enum(['1v1', 'teams']).optional(),
    playerCount: z.union([z.literal(2), z.literal(4)]).optional(),
    turnTimerEnabled: z.boolean().optional(),
    turnDurationMs: z.number().int().positive().max(600_000).optional(),
    fillWithBots: z.boolean().optional(),
  }),
});

export const GameLaunchSchema = z.object({ code: ROOM_CODE });
export const GameReplaySchema = z.object({ code: ROOM_CODE });
export const RoomQuitSchema = z.object({ code: ROOM_CODE });

export const GamePlaySchema = z.object({
  code: ROOM_CODE,
  cardId: CARD_ID,
  combo: z.array(CARD_ID).max(20).optional(),
});

export const ProfileSetSchema = z.object({
  nickname: z.string().min(1).max(40).optional(),
  avatar: z.string().min(1).max(512).optional(),
});

export const TeamRenameSchema = z.object({
  code: ROOM_CODE,
  teamIndex: z.union([z.literal(0), z.literal(1)]),
  name: z.string().min(1).max(40),
});

export const SoundboardSchema = z.object({
  code: ROOM_CODE,
  soundFile: z.string().min(1).max(128),
});

export type AckFn = (ok: boolean, msg?: string) => void;

/** Parse a payload with a zod schema; ack with a 400-style error if it fails. */
export function parseOrAck<T>(
  schema: z.ZodSchema<T>,
  payload: unknown,
  ack?: AckFn
): T | null {
  const r = schema.safeParse(payload);
  if (!r.success) {
    const msg = r.error.issues.map((i) => i.message).join('; ');
    ack?.(false, `invalid payload: ${msg}`);
    return null;
  }
  return r.data;
}
