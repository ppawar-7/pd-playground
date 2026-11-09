/**
 * validateDFFChallenge.js
 * ========================
 * Pure deterministic validator for Level 2 (rtl-2): Signals and Registers.
 *
 * Validates:
 * 1. Predicted Q state across 6 clock cycles given D, RST, and EN stimuli.
 * 2. Understanding of synchronous reset priority and clock enable gating.
 * 3. Synthesis timing concept question regarding setup/hold margins.
 */

import { simulateDFFSequence } from '../../../engine/digitalLogic.js';

export const DFF_CHALLENGE_CYCLES = [
  { cycle: 1, d: 1, rst: 1, en: 1, expectedQ: 0, reason: 'RST=1 forces Q=0 on rising clock edge' },
  { cycle: 2, d: 1, rst: 0, en: 1, expectedQ: 1, reason: 'RST=0 and EN=1 allows D=1 to be captured' },
  { cycle: 3, d: 0, rst: 0, en: 0, expectedQ: 1, reason: 'EN=0 retains previous Q=1 despite D changing to 0' },
  { cycle: 4, d: 0, rst: 0, en: 1, expectedQ: 0, reason: 'EN=1 captures D=0' },
  { cycle: 5, d: 1, rst: 1, en: 0, expectedQ: 0, reason: 'Synchronous reset priority overrides EN=0' },
  { cycle: 6, d: 1, rst: 0, en: 1, expectedQ: 1, reason: 'EN=1 captures D=1' },
];

export const CORRECT_DFF_CONCEPT_ID = 'opt-setup-hold-window';

/**
 * Validate DFF challenge answers.
 *
 * @param {Object} submission
 * @param {Array<number|null>} submission.cycleAnswers - 6 predicted Q values (0 or 1)
 * @param {string} [submission.conceptAnswer] - Selected concept answer ID
 * @returns {Object} ActivityResult contract
 */
export function validateDFFChallenge(submission) {
  if (!submission || !Array.isArray(submission.cycleAnswers)) {
    return {
      passed: false,
      score: 0,
      stars: 0,
      feedback: 'Incomplete submission. Please predict the Q output for all 6 clock cycles.',
      cycleResults: [],
      conceptCorrect: false,
    };
  }

  const { cycleAnswers, conceptAnswer } = submission;
  let correctCycles = 0;
  const cycleResults = [];

  DFF_CHALLENGE_CYCLES.forEach((stim, idx) => {
    const studentAns = cycleAnswers[idx];
    const isCorrect = studentAns === stim.expectedQ;
    if (isCorrect) correctCycles++;
    cycleResults.push({
      cycle: stim.cycle,
      studentAns,
      expectedQ: stim.expectedQ,
      isCorrect,
      reason: stim.reason,
    });
  });

  const allCyclesComplete = cycleAnswers.length === 6 && cycleAnswers.every((a) => a !== null && a !== '');
  const passedCycles = correctCycles >= 5; // allow at most 1 minor error for base pass
  const conceptCorrect = conceptAnswer === CORRECT_DFF_CONCEPT_ID;

  // Scoring: 5 XP per correct cycle (up to 30 XP) + 5 XP for concept question = 35 XP max
  const cycleXP = correctCycles * 5;
  const conceptXP = conceptCorrect ? 5 : 0;
  const rawScore = cycleXP + conceptXP;
  const score = Math.min(35, rawScore);

  // Star thresholds: [12, 24, 35]
  let stars = 0;
  if (score >= 35) stars = 3;
  else if (score >= 24) stars = 2;
  else if (score >= 12) stars = 1;

  const passed = passedCycles && allCyclesComplete;

  let feedback = '';
  if (!allCyclesComplete) {
    feedback = 'Please provide predictions for all 6 clock cycles.';
  } else if (!passed) {
    feedback = `You correctly predicted ${correctCycles} of 6 clock cycles. Remember that synchronous reset takes priority over both clock enable and the data input!`;
  } else if (stars === 3) {
    feedback = 'Flawless analysis! You demonstrated complete mastery of edge-triggered registers, clock enables, reset priority, and setup/hold timing.';
  } else {
    feedback = `Great work! You correctly verified register sequencing (${score}/35 XP, ${stars} Stars). Review setup/hold concepts to earn 3 stars!`;
  }

  return {
    passed,
    score,
    stars,
    feedback,
    cycleResults,
    conceptCorrect,
    correctCount: correctCycles,
    totalCycles: DFF_CHALLENGE_CYCLES.length,
  };
}
