/**
 * validateMuxChallenge.js
 * ========================
 * Pure deterministic validator for Level 1 (rtl-1: "What is RTL?").
 *
 * Evaluates:
 * 1. Complete 8-row truth table for a 2:1 Multiplexer: {SEL, A, B} in {0, 1}^3.
 * 2. Conceptual RTL synthesis question distinguishing RTL dataflow steering
 *    from naive assumptions that every conditional builds an unoptimized physical MUX.
 *
 * Scoring & Mastery Rules:
 * - Total XP: 30 (star thresholds: [10, 20, 30]).
 * - Mastery Gate: All 8 truth-table states MUST be logically correct (Y = SEL ? B : A).
 * - If any truth-table row fails or is incomplete: passed = false, score = 0 toward completion.
 * - If all 8 truth-table rows are correct:
 *     - Truth Table Mastery: 25 XP (meets the 25 XP threshold to unlock rtl-2).
 *     - Synthesis Concept Mastery: +5 XP (reaching full 30 XP and 3 Stars).
 */

import { createActivityResult } from '../../contracts/activityContract.js';

export const EXPECTED_MUX_TRUTH_TABLE = [
  { sel: 0, a: 0, b: 0, expectedY: 0, explanation: 'SEL=0 selects A (0). Gate AND1=0, AND2=0 -> Y=0.' },
  { sel: 0, a: 0, b: 1, expectedY: 0, explanation: 'SEL=0 selects A (0). Even though B=1, AND2 is blocked by ~SEL=1 -> Y=0.' },
  { sel: 0, a: 1, b: 0, expectedY: 1, explanation: 'SEL=0 selects A (1). Gate AND1 passes A=1, OR gate outputs Y=1.' },
  { sel: 0, a: 1, b: 1, expectedY: 1, explanation: 'SEL=0 selects A (1). Gate AND1 passes A=1 -> Y=1.' },
  { sel: 1, a: 0, b: 0, expectedY: 0, explanation: 'SEL=1 selects B (0). Gate AND1 is blocked by ~SEL=0 -> Y=0.' },
  { sel: 1, a: 0, b: 1, expectedY: 1, explanation: 'SEL=1 selects B (1). Gate AND2 passes B=1 -> Y=1.' },
  { sel: 1, a: 1, b: 0, expectedY: 0, explanation: 'SEL=1 selects B (0). Even though A=1, AND1 is blocked by ~SEL=0 -> Y=0.' },
  { sel: 1, a: 1, b: 1, expectedY: 1, explanation: 'SEL=1 selects B (1). Gate AND2 passes B=1 -> Y=1.' },
];

export const CORRECT_CONCEPT_ANSWER_ID = 'opt-synthesis-opt';

/**
 * Validates the student submission for the Level 1 MUX challenge.
 *
 * @param {Object} submission
 * @param {Array<number|null>} submission.tableOutputs - Array of 8 outputs provided by student (index 0 to 7)
 * @param {string} submission.conceptAnswer - Selected option ID for the RTL synthesis question
 * @returns {Object} ActivityResult_v1
 */
export function validateMuxChallenge(submission = {}) {
  const tableOutputs = Array.isArray(submission.tableOutputs) ? submission.tableOutputs : [];
  const conceptAnswer = submission.conceptAnswer;

  const rowResults = EXPECTED_MUX_TRUTH_TABLE.map((expectedRow, idx) => {
    const studentVal = tableOutputs[idx];
    const isProvided = studentVal !== null && studentVal !== undefined && studentVal !== '';
    const numericVal = Number(studentVal);
    const isCorrect = isProvided && (numericVal === expectedRow.expectedY);

    return {
      rowIndex: idx,
      sel: expectedRow.sel,
      a: expectedRow.a,
      b: expectedRow.b,
      expected: expectedRow.expectedY,
      received: isProvided ? numericVal : null,
      passed: isCorrect,
      explanation: isCorrect
        ? `Correct: ${expectedRow.explanation}`
        : isProvided
          ? `Incorrect: for SEL=${expectedRow.sel}, A=${expectedRow.a}, B=${expectedRow.b}, expected Y=${expectedRow.expectedY} but got ${numericVal}. ${expectedRow.explanation}`
          : `Incomplete: row ${idx + 1} has not been evaluated yet.`,
    };
  });

  const passedRowCount = rowResults.filter((r) => r.passed).length;
  const isTruthTableComplete = passedRowCount === 8;
  const isConceptCorrect = conceptAnswer === CORRECT_CONCEPT_ANSWER_ID;

  // Breakdown checks for student feedback
  const breakdown = [
    {
      label: 'Truth Table Verification (8 input states)',
      passed: isTruthTableComplete,
      explanation: isTruthTableComplete
        ? 'All 8 truth-table input combinations correctly steering signals A and B to output Y.'
        : `${passedRowCount} of 8 truth-table states verified. All 8 states are required to master RTL steering.`,
    },
    {
      label: 'RTL Dataflow & Synthesis Concept',
      passed: isConceptCorrect,
      explanation: isConceptCorrect
        ? 'Correct understanding of RTL expressions: synthesis tools translate dataflow conditions into multiplexing networks and optimize them into targeted technology standard cells.'
        : 'Review how RTL synthesis tools treat conditional expressions and logic minimization.',
    },
  ];

  // Mastery gate: must pass all 8 truth table rows
  if (!isTruthTableComplete) {
    return createActivityResult({
      levelId: 'rtl-1',
      passed: false,
      score: 0,
      stars: 0,
      feedback: `Mastery gate not met: ${passedRowCount}/8 truth-table states correct. Fix failing rows below to verify data steering.`,
      breakdown,
      stateSnapshot: { tableOutputs, conceptAnswer, passedRowCount },
    });
  }

  // Passing: 25 XP for full truth table, +5 XP for synthesis concept
  const totalScore = isConceptCorrect ? 30 : 25;
  const stars = totalScore >= 30 ? 3 : 2;

  const feedback = isConceptCorrect
    ? 'Outstanding! You have mastered the 2:1 Multiplexer and how RTL constructs translate into digital steering logic. Level 1 complete with 3 Stars!'
    : 'Great work! 100% of the truth-table states are verified. Review the synthesis concept question to earn the 3rd star, or continue to Level 2!';

  return createActivityResult({
    levelId: 'rtl-1',
    passed: true,
    score: totalScore,
    stars,
    feedback,
    breakdown,
    stateSnapshot: { tableOutputs, conceptAnswer, passedRowCount },
  });
}
