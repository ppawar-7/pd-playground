import { describe, it, expect } from 'vitest';
import {
  simulateDFF,
  simulateDFFSequence,
  simulateCombVsSeq,
  evaluateLatchInference,
  simulateAccumulator,
  stepSequenceDetector1011,
  simulateSequenceDetector,
} from '../../engine/digitalLogic.js';

describe('Digital Logic Simulation Engine', () => {
  describe('D Flip-Flop Behavior', () => {
    it('samples D on clock edge when enabled and not reset', () => {
      expect(simulateDFF({ d: 1, currentQ: 0, rst: 0, en: 1 })).toBe(1);
      expect(simulateDFF({ d: 0, currentQ: 1, rst: 0, en: 1 })).toBe(0);
    });

    it('gives priority to synchronous reset over D and enable', () => {
      expect(simulateDFF({ d: 1, currentQ: 1, rst: 1, en: 1 })).toBe(0);
      expect(simulateDFF({ d: 1, currentQ: 1, rst: 1, en: 0 })).toBe(0);
    });

    it('retains previous state when enable is 0', () => {
      expect(simulateDFF({ d: 1, currentQ: 0, rst: 0, en: 0 })).toBe(0);
      expect(simulateDFF({ d: 0, currentQ: 1, rst: 0, en: 0 })).toBe(1);
    });

    it('handles string/number coerced inputs safely', () => {
      expect(simulateDFF({ d: '1', currentQ: '0', rst: '0', en: '1' })).toBe(1);
      expect(simulateDFF({ d: '1', currentQ: '0', rst: '1', en: '1' })).toBe(0);
    });

    it('correctly simulates multi-cycle sequences', () => {
      const inputs = [
        { d: 1, rst: 0, en: 1 }, // captures 1
        { d: 0, rst: 0, en: 0 }, // en=0 -> retains 1
        { d: 0, rst: 1, en: 1 }, // rst=1 -> resets to 0
        { d: 1, rst: 0, en: 1 }, // captures 1
      ];
      const seq = simulateDFFSequence(inputs, 0);
      expect(seq.map((s) => s.q)).toEqual([1, 1, 0, 1]);
    });
  });

  describe('Combinational vs Sequential & Latch Hazards', () => {
    it('models delay differences between combinational and registered paths', () => {
      const inputs = [
        { a: 1, b: 1 },
        { a: 0, b: 1 },
      ];
      const results = simulateCombVsSeq(inputs, 0);
      expect(results[0].combY).toBe(1);
      expect(results[0].seqY).toBe(0); // register holds previous cycle value
      expect(results[1].combY).toBe(0);
      expect(results[1].seqY).toBe(1); // register updated to previous combY
    });

    it('detects transparent latch inference when combinational conditional is missing else', () => {
      const unclosed = evaluateLatchInference({ hasElse: false, isClocked: false });
      expect(unclosed.hasLatch).toBe(true);

      const closed = evaluateLatchInference({ hasElse: true, isClocked: false });
      expect(closed.hasLatch).toBe(false);

      const clocked = evaluateLatchInference({ hasElse: false, isClocked: true });
      expect(clocked.hasLatch).toBe(false);
    });
  });

  describe('Accumulator Datapath Simulation', () => {
    it('correctly accumulates operand into registered value', () => {
      const r1 = simulateAccumulator({ currentAcc: 10, inData: 0, operand: 15, muxSel: 0, rst: 0 });
      expect(r1.nextAcc).toBe(25);
      expect(r1.overflow).toBe(false);
      expect(r1.carryOut).toBe(false);
      expect(r1.signedOverflow).toBe(false);
    });

    it('loads external data when muxSel is 1', () => {
      const r2 = simulateAccumulator({ currentAcc: 10, inData: 50, operand: 5, muxSel: 1, rst: 0 });
      expect(r2.nextAcc).toBe(55);
      expect(r2.overflow).toBe(false);
    });

    it('handles 8-bit unsigned overflow clamping and flags', () => {
      const r3 = simulateAccumulator({ currentAcc: 250, inData: 0, operand: 10, muxSel: 0, rst: 0 });
      expect(r3.nextAcc).toBe(4); // 260 & 0xff = 4
      expect(r3.overflow).toBe(true);
      expect(r3.carryOut).toBe(true);
    });

    it('detects 2s complement signed overflow (e.g. +120 + 20 = -116 in 8-bit)', () => {
      // +120 (0x78) + 20 (0x14) = 140 (0x8C) which has MSB=1 (negative)
      const rSigned = simulateAccumulator({ currentAcc: 120, inData: 0, operand: 20, muxSel: 0, rst: 0 });
      expect(rSigned.nextAcc).toBe(140);
      expect(rSigned.carryOut).toBe(false); // < 256, no unsigned carry
      expect(rSigned.signedOverflow).toBe(true); // Pos + Pos = Neg -> signed overflow!
    });

    it('synchronously resets to 0 regardless of inputs', () => {
      const r4 = simulateAccumulator({ currentAcc: 120, inData: 50, operand: 10, muxSel: 1, rst: 1 });
      expect(r4.nextAcc).toBe(0);
      expect(r4.overflow).toBe(false);
      expect(r4.signedOverflow).toBe(false);
    });
  });

  describe('1011 Sequence Detector FSM', () => {
    it('transitions through S0 -> S1 -> S2 -> S3 -> S1 and flags match on 1011', () => {
      const bitStream = [1, 0, 1, 1];
      const steps = simulateSequenceDetector(bitStream);
      expect(steps.map((s) => s.state)).toEqual(['S0', 'S1', 'S2', 'S3']);
      expect(steps.map((s) => s.match)).toEqual([false, false, false, true]);
      expect(steps[3].nextState).toBe('S1'); // overlapping restart
    });

    it('supports overlapping sequence detection for stream 1011011', () => {
      const bitStream = [1, 0, 1, 1, 0, 1, 1];
      const steps = simulateSequenceDetector(bitStream);
      const matches = steps.map((s) => s.match);
      // Index 3 (bit 4: 1011) and Index 6 (bit 7: 1011 overlapping)
      expect(matches).toEqual([false, false, false, true, false, false, true]);
    });

    it('returns to S0 when stream breaks non-matching bit', () => {
      const res = stepSequenceDetector1011('S2', 0); // saw 10, next is 0 -> 100 -> resets to S0
      expect(res.nextState).toBe('S0');
      expect(res.match).toBe(false);
    });
  });
});
