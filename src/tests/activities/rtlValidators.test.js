import { describe, it, expect } from 'vitest';
import { validateDFFChallenge } from '../../activities/rtl/validators/validateDFFChallenge.js';
import { validateCombSeqChallenge } from '../../activities/rtl/validators/validateCombSeqChallenge.js';
import { validateAccumulatorChallenge } from '../../activities/rtl/validators/validateAccumulatorChallenge.js';
import { validateFSMChallenge } from '../../activities/rtl/validators/validateFSMChallenge.js';

describe('RTL Kingdom Activity Validators (Levels 2–5)', () => {
  describe('Level 2: validateDFFChallenge', () => {
    it('accepts correct cycle predictions and concept answer for 35 XP (3 Stars)', () => {
      // Expected Q values: [0, 1, 1, 0, 0, 1]
      const res = validateDFFChallenge({
        cycleAnswers: [0, 1, 1, 0, 0, 1],
        conceptAnswer: 'opt-setup-hold-window',
      });
      expect(res.passed).toBe(true);
      expect(res.score).toBe(35);
      expect(res.stars).toBe(3);
    });

    it('awards 2 stars (30 XP) if concept question is missed but all cycles correct', () => {
      const res = validateDFFChallenge({
        cycleAnswers: [0, 1, 1, 0, 0, 1],
        conceptAnswer: 'wrong-answer',
      });
      expect(res.passed).toBe(true);
      expect(res.score).toBe(30);
      expect(res.stars).toBe(2);
    });

    it('rejects incomplete predictions', () => {
      const res = validateDFFChallenge({
        cycleAnswers: [0, 1, null, 0, 0, 1],
      });
      expect(res.passed).toBe(false);
    });
  });

  describe('Level 3: validateCombSeqChallenge', () => {
    it('accepts correct comparative predictions and latch concepts for 40 XP (3 Stars)', () => {
      const cyclePredictions = [
        { combY: 1, seqY: 0 },
        { combY: 0, seqY: 1 },
        { combY: 0, seqY: 0 },
        { combY: 1, seqY: 0 },
      ];
      const res = validateCombSeqChallenge({
        cyclePredictions,
        latchAnswer: 'opt-missing-else-latch',
        glitchAnswer: 'opt-comb-glitch-filter',
      });
      expect(res.passed).toBe(true);
      expect(res.score).toBe(40);
      expect(res.stars).toBe(3);
    });

    it('rejects incorrect sequential timing predictions', () => {
      const wrongSeq = [
        { combY: 1, seqY: 1 }, // wrong: sequential should be 0 in cycle 1
        { combY: 0, seqY: 0 },
        { combY: 0, seqY: 0 },
        { combY: 1, seqY: 1 },
      ];
      const res = validateCombSeqChallenge({
        cyclePredictions: wrongSeq,
        latchAnswer: 'opt-missing-else-latch',
      });
      expect(res.passed).toBe(false);
    });
  });

  describe('Level 4: validateAccumulatorChallenge', () => {
    it('verifies correct datapath wiring, test vectors, and bit-width concepts for 45 XP (3 Stars)', () => {
      const wiring = {
        muxInput0: 'feedback',
        muxInput1: 'inData',
        adderInputA: 'muxOut',
        adderInputB: 'operand',
        regInputD: 'adderSum',
      };
      const vectorOutputs = [
        { acc: 0, ovf: false },
        { acc: 120, ovf: false },
        { acc: 150, ovf: false },
        { acc: 14, ovf: true }, // 270 & 255 = 14
      ];
      const res = validateAccumulatorChallenge({
        wiring,
        vectorOutputs,
        conceptAnswer: 'opt-bit-width-growth',
      });
      expect(res.passed).toBe(true);
      expect(res.score).toBe(45);
      expect(res.stars).toBe(3);
    });

    it('fails if datapath has invalid port connection', () => {
      const badWiring = {
        muxInput0: 'zero', // wrong
        muxInput1: 'inData',
        adderInputA: 'muxOut',
        adderInputB: 'operand',
        regInputD: 'adderSum',
      };
      const res = validateAccumulatorChallenge({
        wiring: badWiring,
        vectorOutputs: [{ acc: 0, ovf: false }],
      });
      expect(res.passed).toBe(false);
      expect(res.feedback).toContain('Datapath wiring has invalid connections');
    });
  });

  describe('Level 5: validateFSMChallenge', () => {
    it('certifies RTL Capstone with transition table, overlapping stream, and Moore/Mealy concept for 50 XP', () => {
      const transitions = [
        { nextState: 'S0', match: false },
        { nextState: 'S1', match: false },
        { nextState: 'S2', match: false },
        { nextState: 'S1', match: false },
        { nextState: 'S0', match: false },
        { nextState: 'S3', match: false },
        { nextState: 'S2', match: false },
        { nextState: 'S1', match: true }, // 1011 match
      ];
      const streamMatches = [false, false, false, true, false, false, true];
      const res = validateFSMChallenge({
        transitions,
        streamMatches,
        conceptAnswer: 'opt-moore-vs-mealy',
      });
      expect(res.passed).toBe(true);
      expect(res.score).toBe(50);
      expect(res.stars).toBe(3);
    });

    it('rejects if overlapping pattern detection is missed', () => {
      const transitions = [
        { nextState: 'S0', match: false },
        { nextState: 'S1', match: false },
        { nextState: 'S2', match: false },
        { nextState: 'S1', match: false },
        { nextState: 'S0', match: false },
        { nextState: 'S3', match: false },
        { nextState: 'S2', match: false },
        { nextState: 'S1', match: true },
      ];
      // Student missed second match at index 6
      const badStreamMatches = [false, false, false, true, false, false, false];
      const res = validateFSMChallenge({
        transitions,
        streamMatches: badStreamMatches,
        conceptAnswer: 'opt-moore-vs-mealy',
      });
      expect(res.passed).toBe(false);
    });
  });
});
