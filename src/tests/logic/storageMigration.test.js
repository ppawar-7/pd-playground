import { describe, it, expect } from 'vitest';
import {
  migratePlayerState,
  CURRENT_SCHEMA_VERSION,
} from '../../logic/storageMigration.js';

describe('Player Storage Migration (v1 -> v2)', () => {
  it('creates clean baseline state when given null or empty object', () => {
    const resNull = migratePlayerState(null);
    expect(resNull.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(resNull.name).toBe('Student Explorer');
    expect(resNull.totalXP).toBe(0);
    expect(resNull.levelProgress).toEqual({});
    expect(resNull.legacyArchive || null).toBeNull();

    const resEmpty = migratePlayerState({});
    expect(resEmpty.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(resEmpty.name).toBe('Student Explorer');
  });

  it('preserves user identity and verified rtl-1 completion', () => {
    const v1State = {
      name: 'Alice VLSI',
      avatarEmoji: '⚡',
      createdAt: '2026-10-20T12:00:00.000Z',
      totalXP: 30,
      levelProgress: {
        'rtl-1': { completed: true, stars: 3, xpEarned: 30 },
      },
    };

    const res = migratePlayerState(v1State);
    expect(res.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(res.name).toBe('Alice VLSI');
    expect(res.avatarEmoji).toBe('⚡');
    expect(res.createdAt).toBe('2026-10-20T12:00:00.000Z');
    expect(res.levelProgress['rtl-1'].completed).toBe(true);
    expect(res.levelProgress['rtl-1'].xpEarned).toBe(30);
    expect(res.levelProgress['rtl-1'].stars).toBe(3);
    expect(res.totalXP).toBe(30);
    expect(res.legacyArchive).toBeNull();
  });

  it('isolates unverified unimplemented levels into legacyArchive while keeping player identity', () => {
    const legacyStateWithSliderCheats = {
      name: 'Dave',
      avatarEmoji: '🚀',
      totalXP: 100, // inflated total
      levelProgress: {
        'rtl-1': { completed: true, stars: 3, xpEarned: 30 },
        'unimpl-mock-1': { completed: true, stars: 3, xpEarned: 35 }, // unimplemented mock
        'unimpl-mock-2': { completed: true, stars: 3, xpEarned: 35 }, // unimplemented mock
      },
    };

    const res = migratePlayerState(legacyStateWithSliderCheats);
    expect(res.name).toBe('Dave');
    // rtl-1 verified is kept
    expect(res.levelProgress['rtl-1']).toBeDefined();
    expect(res.levelProgress['rtl-1'].completed).toBe(true);
    // unimpl-mock-1 and unimpl-mock-2 are not in active levelProgress because no validator exists
    expect(res.levelProgress['unimpl-mock-1']).toBeUndefined();
    expect(res.levelProgress['unimpl-mock-2']).toBeUndefined();
    // They are safely stored in legacyArchive
    expect(res.legacyArchive).not.toBeNull();
    expect(res.legacyArchive.unverifiedLevels['unimpl-mock-1'].xpEarned).toBe(35);
    expect(res.legacyArchive.unverifiedLevels['unimpl-mock-2'].xpEarned).toBe(35);
    // Derived totalXP is corrected to verified only (30 XP)
    expect(res.totalXP).toBe(30);
  });

  it('is completely idempotent (repeated migration produces identical state)', () => {
    const initial = {
      name: 'Bob',
      levelProgress: {
        'rtl-1': { completed: true, stars: 2, xpEarned: 25 },
      },
    };

    const firstPass = migratePlayerState(initial);
    const secondPass = migratePlayerState(firstPass);

    expect(secondPass.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(secondPass.name).toBe('Bob');
    expect(secondPass.totalXP).toBe(25);
    expect(secondPass.levelProgress['rtl-1'].xpEarned).toBe(25);
  });
});
