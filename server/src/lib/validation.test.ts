import { describe, it, expect } from 'vitest';
import {
  GamePlaySchema,
  RoomCodeSchema,
  RoomSettingsSchema,
  TeamRenameSchema,
  parseOrAck,
} from './validation';

describe('schemas', () => {
  it('accepts well-formed room codes', () => {
    expect(RoomCodeSchema.safeParse('ABCD').success).toBe(true);
    expect(RoomCodeSchema.safeParse('XY12ZQ').success).toBe(true);
  });

  it('rejects malformed room codes', () => {
    expect(RoomCodeSchema.safeParse('abc').success).toBe(false);
    expect(RoomCodeSchema.safeParse('TOO_LONG_CODE').success).toBe(false);
    expect(RoomCodeSchema.safeParse('').success).toBe(false);
  });

  it('parses a play payload with combo', () => {
    const r = GamePlaySchema.safeParse({
      code: 'ABCD',
      cardId: 'card-1',
      combo: ['x', 'y'],
    });
    expect(r.success).toBe(true);
  });

  it('rejects giant combos', () => {
    const r = GamePlaySchema.safeParse({
      code: 'ABCD',
      cardId: 'c',
      combo: Array(50).fill('x'),
    });
    expect(r.success).toBe(false);
  });

  it('accepts settings with optional fields', () => {
    const r = RoomSettingsSchema.safeParse({
      code: 'ABCD',
      settings: { playerCount: 2 },
    });
    expect(r.success).toBe(true);
  });

  it('team rename clamps name length', () => {
    const r = TeamRenameSchema.safeParse({
      code: 'ABCD',
      teamIndex: 0,
      name: 'a'.repeat(60),
    });
    expect(r.success).toBe(false);
  });
});

describe('parseOrAck', () => {
  it('returns parsed value on success without acking', () => {
    let acked: { ok: boolean; msg?: string } | null = null;
    const v = parseOrAck(RoomCodeSchema, 'ABCD', (ok, msg) => {
      acked = { ok, msg };
    });
    expect(v).toBe('ABCD');
    expect(acked).toBeNull();
  });

  it('acks failure and returns null', () => {
    let acked: { ok: boolean; msg?: string } | null = null;
    const v = parseOrAck(RoomCodeSchema, 'bad', (ok, msg) => {
      acked = { ok, msg };
    });
    expect(v).toBeNull();
    expect(acked).not.toBeNull();
    expect(acked!.ok).toBe(false);
  });
});
