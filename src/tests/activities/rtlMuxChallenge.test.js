import { describe, it, expect } from 'vitest';
import {
  validateMuxChallenge,
  EXPECTED_MUX_TRUTH_TABLE,
  CORRECT_CONCEPT_ANSWER_ID,
} from '../../activities/rtl/validators/validateMuxChallenge.js';
import { ACTIVITY_CONTRACT_VERSION } from '../../activities/contracts/activityContract.js';

describe('validateMuxChallenge — Deterministic RTL Level 1 Validator', () => {
  const perfectOutputs = [0, 0, 1, 1, 0, 1, 0, 1]; // Matches all 8 rows

  it('rejects empty or null submission with passed=false and score=0', () => {
    const result = validateMuxChallenge({});
    expect(result.version).toBe(ACTIVITY_CONTRACT_VERSION);
    expect(result.levelId).toBe('rtl-1');
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.stars).toBe(0);
    expect(result.feedback).toContain('0/8');
  });

  it('rejects an incomplete truth table (7 out of 8 rows provided)', () => {
    const incomplete = [0, 0, 1, 1, 0, 1, 0, null];
    const result = validateMuxChallenge({ tableOutputs: incomplete, conceptAnswer: CORRECT_CONCEPT_ANSWER_ID });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.stars).toBe(0);
    expect(result.feedback).toContain('7/8');
  });

  it('rejects an incorrect truth table output on a specific row', () => {
    // Row 2: SEL=0, A=1, B=0 -> Expected 1, but we pass 0
    const withError = [0, 0, 0, 1, 0, 1, 0, 1];
    const result = validateMuxChallenge({ tableOutputs: withError });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.stars).toBe(0);
    expect(result.breakdown[0].passed).toBe(false);
  });

  it('awards passing status (25 XP, 2 Stars) when all 8 rows are correct without concept answer', () => {
    const result = validateMuxChallenge({ tableOutputs: perfectOutputs, conceptAnswer: 'wrong-opt' });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(25);
    expect(result.stars).toBe(2);
    expect(result.breakdown[0].passed).toBe(true);
    expect(result.breakdown[1].passed).toBe(false);
    // 25 XP satisfies pointsRequired for rtl-2
    expect(result.score).toBeGreaterThanOrEqual(25);
  });

  it('awards full mastery (30 XP, 3 Stars) when all 8 rows AND concept check are correct', () => {
    const result = validateMuxChallenge({
      tableOutputs: perfectOutputs,
      conceptAnswer: CORRECT_CONCEPT_ANSWER_ID,
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(30);
    expect(result.stars).toBe(3);
    expect(result.breakdown[0].passed).toBe(true);
    expect(result.breakdown[1].passed).toBe(true);
    expect(result.feedback).toContain('3 Stars');
  });

  it('validates that all 8 reference truth table rows follow Y = SEL ? B : A', () => {
    expect(EXPECTED_MUX_TRUTH_TABLE).toHaveLength(8);
    for (const row of EXPECTED_MUX_TRUTH_TABLE) {
      const calculated = row.sel === 0 ? row.a : row.b;
      expect(row.expectedY).toBe(calculated);
    }
  });
});
