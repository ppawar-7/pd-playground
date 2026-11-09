/**
 * validateCombSeqChallenge.js
 * =============================
 * Pure deterministic validator for Level 3 (rtl-3): Combinational vs Sequential Logic.
 *
 * Validates:
 * 1. Cycle-by-cycle comparison of immediate combinational vs registered outputs.
 * 2. Identification of latch inference hazards in incomplete conditional blocks.
 * 3. Understanding of glitch propagation and clock-domain stability.
 */

export const COMB_SEQ_CYCLES = [
  { cycle: 1, a: 1, b: 1, expectedComb: 1, expectedSeq: 0, reason: 'Initial cycle: Comb responds immediately (1&1=1); Reg holds initial state 0' },
  { cycle: 2, a: 0, b: 1, expectedComb: 0, expectedSeq: 1, reason: 'Cycle 2: Comb falls to 0 immediately; Reg captures previous cycle 1' },
  { cycle: 3, a: 1, b: 0, expectedComb: 0, expectedSeq: 0, reason: 'Cycle 3: Comb is 0; Reg captures previous cycle 0' },
  { cycle: 4, a: 1, b: 1, expectedComb: 1, expectedSeq: 0, reason: 'Cycle 4: Comb rises to 1; Reg still holds previous cycle 0' },
];

export const CORRECT_LATCH_HAZARD_ID = 'opt-missing-else-latch';
export const CORRECT_GLITCH_CONCEPT_ID = 'opt-comb-glitch-filter';

export function validateCombSeqChallenge(submission) {
  if (!submission || !Array.isArray(submission.cyclePredictions)) {
    return {
      passed: false,
      score: 0,
      stars: 0,
      feedback: 'Please complete all cycle predictions and concept questions.',
    };
  }

  const { cyclePredictions, latchAnswer, glitchAnswer } = submission;
  let correctCycles = 0;
  const cycleResults = [];

  COMB_SEQ_CYCLES.forEach((stim, idx) => {
    const student = cyclePredictions[idx] || {};
    const combOk = student.combY === stim.expectedComb;
    const seqOk = student.seqY === stim.expectedSeq;
    const isRowCorrect = combOk && seqOk;
    if (isRowCorrect) correctCycles++;
    cycleResults.push({
      cycle: stim.cycle,
      combOk,
      seqOk,
      isRowCorrect,
      reason: stim.reason,
    });
  });

  const allCyclesFilled = cyclePredictions.length === 4 && cyclePredictions.every((p) => p && p.combY !== null && p.seqY !== null);
  const latchCorrect = latchAnswer === CORRECT_LATCH_HAZARD_ID;
  const glitchCorrect = glitchAnswer === CORRECT_GLITCH_CONCEPT_ID;

  // 4 cycles * 5 XP = 20 XP. Latch question = 10 XP. Glitch question = 10 XP. Total = 40 XP.
  const score = Math.min(40, correctCycles * 5 + (latchCorrect ? 10 : 0) + (glitchCorrect ? 10 : 0));

  // Star thresholds: [15, 28, 40]
  let stars = 0;
  if (score >= 40) stars = 3;
  else if (score >= 28) stars = 2;
  else if (score >= 15) stars = 1;

  const passed = allCyclesFilled && correctCycles >= 3 && (latchCorrect || glitchCorrect) && score >= 28;

  let feedback = '';
  if (!allCyclesFilled) {
    feedback = 'Please complete the predictions for all 4 cycles.';
  } else if (!passed) {
    feedback = `Score: ${score}/40 XP. Remember: combinational logic updates immediately within the cycle, whereas registers only update their output at the rising clock edge!`;
  } else if (stars === 3) {
    feedback = 'Mastery achieved! You perfectly differentiated immediate combinational propagation from edge-aligned registered states and recognized latch inference hazards.';
  } else {
    feedback = `Solid performance (${score}/40 XP, ${stars} Stars)! You understand how registers synchronize dataflow across clock boundaries.`;
  }

  return {
    passed,
    score,
    stars,
    feedback,
    cycleResults,
    latchCorrect,
    glitchCorrect,
  };
}
