/**
 * validateFSMChallenge.js
 * ========================
 * Pure deterministic validator for Level 5 (rtl-5): RTL Kingdom Capstone.
 *
 * Validates:
 * 1. State transition table for overlapping 1011 Sequence Detector.
 * 2. Multi-cycle stream simulation with overlapping pattern matches.
 * 3. Synthesis architecture understanding: Moore vs Mealy machines.
 */

import { stepSequenceDetector1011, simulateSequenceDetector } from '../../../engine/digitalLogic.js';

export const FSM_TRANSITION_ROWS = [
  { state: 'S0', inBit: 0, expectedNext: 'S0', expectedMatch: false, reason: 'Looking for initial 1' },
  { state: 'S0', inBit: 1, expectedNext: 'S1', expectedMatch: false, reason: 'Saw 1, advance to S1' },
  { state: 'S1', inBit: 0, expectedNext: 'S2', expectedMatch: false, reason: 'Saw 10, advance to S2' },
  { state: 'S1', inBit: 1, expectedNext: 'S1', expectedMatch: false, reason: 'Saw 11, stay in S1' },
  { state: 'S2', inBit: 0, expectedNext: 'S0', expectedMatch: false, reason: 'Saw 100, reset to S0' },
  { state: 'S2', inBit: 1, expectedNext: 'S3', expectedMatch: false, reason: 'Saw 101, advance to S3' },
  { state: 'S3', inBit: 0, expectedNext: 'S2', expectedMatch: false, reason: 'Saw 1010, return to S2' },
  { state: 'S3', inBit: 1, expectedNext: 'S1', expectedMatch: true,  reason: 'Saw 1011! Match=1, overlap next=S1' },
];

export const CAPSTONE_STREAM = [1, 0, 1, 1, 0, 1, 1];
export const CORRECT_FSM_CONCEPT_ID = 'opt-moore-vs-mealy';

export function validateFSMChallenge(submission) {
  if (!submission) {
    return {
      passed: false,
      score: 0,
      stars: 0,
      feedback: 'Please complete the FSM transition table and concept questions.',
    };
  }

  const { transitions, streamMatches, conceptAnswer } = submission;

  // Validate 8 transition table rows
  let correctTransitions = 0;
  const transitionResults = [];
  if (Array.isArray(transitions)) {
    FSM_TRANSITION_ROWS.forEach((row, idx) => {
      const student = transitions[idx] || {};
      const nextOk = student.nextState === row.expectedNext;
      const matchOk = Boolean(student.match) === row.expectedMatch;
      const isCorrect = nextOk && matchOk;
      if (isCorrect) correctTransitions++;
      transitionResults.push({
        state: row.state,
        inBit: row.inBit,
        nextOk,
        matchOk,
        isCorrect,
        expectedNext: row.expectedNext,
        expectedMatch: row.expectedMatch,
        reason: row.reason,
      });
    });
  }

  // Validate stream matches: matches should occur at indices 3 and 6
  let streamOk = false;
  if (Array.isArray(streamMatches) && streamMatches.length === 7) {
    const expectedStreamMatches = [false, false, false, true, false, false, true];
    streamOk = streamMatches.every((val, i) => Boolean(val) === expectedStreamMatches[i]);
  }

  const transitionScore = Math.round((correctTransitions / 8) * 20); // up to 20 XP
  const streamScore = streamOk ? 20 : 0;                              // 20 XP
  const conceptScore = conceptAnswer === CORRECT_FSM_CONCEPT_ID ? 10 : 0; // 10 XP

  const rawScore = transitionScore + streamScore + conceptScore;
  const score = Math.min(50, rawScore);

  // Star thresholds: [20, 38, 50]
  let stars = 0;
  if (score >= 50) stars = 3;
  else if (score >= 38) stars = 2;
  else if (score >= 20) stars = 1;

  const passed = correctTransitions >= 6 && streamOk && score >= 38;

  let feedback = '';
  if (correctTransitions < 6) {
    feedback = `Transition table has errors (${correctTransitions}/8 correct). Verify the overlapping transition from S3 on input 1!`;
  } else if (!streamOk) {
    feedback = 'Stream pattern detection did not match. In the sequence 1-0-1-1-0-1-1, matches must trigger at cycles 4 and 7 due to overlapping detection!';
  } else if (stars === 3) {
    feedback = 'Flawless Capstone Mastery! You designed a complete 4-state sequence detector, verified overlapping detection, and mastered Moore vs Mealy FSM architectures!';
  } else {
    feedback = `Great work on the RTL Capstone (${score}/50 XP, ${stars} Stars)! You have unlocked the Synthesis Kingdom.`;
  }

  return {
    passed,
    score,
    stars,
    feedback,
    transitionResults,
    correctTransitions,
    streamOk,
    conceptCorrect: conceptAnswer === CORRECT_FSM_CONCEPT_ID,
  };
}
