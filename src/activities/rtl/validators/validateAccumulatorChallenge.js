/**
 * validateAccumulatorChallenge.js
 * =================================
 * Pure deterministic validator for Level 4 (rtl-4): Block Diagram Challenge.
 *
 * Validates:
 * 1. Correct port connections in the 8-bit accumulator datapath.
 * 2. Multi-vector simulation including reset, load, accumulation, and 8-bit overflow.
 * 3. Understanding of bit-width growth in digital arithmetic.
 */

import { simulateAccumulator } from '../../../engine/digitalLogic.js';

export const ACCUMULATOR_TEST_VECTORS = [
  { vector: 1, currentAcc: 50, rst: 1, load: 0, inData: 0, operand: 10, expectedAcc: 0, expectedOvf: false, reason: 'RST=1 forces accumulator to 0' },
  { vector: 2, currentAcc: 0, rst: 0, load: 1, inData: 100, operand: 20, expectedAcc: 120, expectedOvf: false, reason: 'LOAD=1 loads InData(100) + Operand(20) = 120' },
  { vector: 3, currentAcc: 120, rst: 0, load: 0, inData: 0, operand: 30, expectedAcc: 150, expectedOvf: false, reason: 'LOAD=0 accumulates Acc(120) + Operand(30) = 150' },
  { vector: 4, currentAcc: 150, rst: 0, load: 0, inData: 0, operand: 120, expectedAcc: 14, expectedOvf: true, reason: '150 + 120 = 270 (>255) -> Acc wraps to 14, Overflow=true' },
];

export const CORRECT_ACCUMULATOR_CONCEPT_ID = 'opt-bit-width-growth';

export function validateAccumulatorChallenge(submission) {
  if (!submission) {
    return {
      passed: false,
      score: 0,
      stars: 0,
      feedback: 'Please complete block wiring, test vectors, and concept questions.',
    };
  }

  const { wiring, vectorOutputs, conceptAnswer } = submission;

  // Validate wiring connections
  // Expected wiring:
  // muxInput0: 'feedback'
  // muxInput1: 'inData'
  // adderInputA: 'muxOut'
  // adderInputB: 'operand'
  // regInputD: 'adderSum'
  const wiringValid = Boolean(
    wiring &&
    wiring.muxInput0 === 'feedback' &&
    wiring.muxInput1 === 'inData' &&
    wiring.adderInputA === 'muxOut' &&
    wiring.adderInputB === 'operand' &&
    wiring.regInputD === 'adderSum'
  );
  const wiringScore = wiringValid ? 15 : 0;

  // Validate vectors
  let correctVectors = 0;
  const vectorResults = [];
  if (Array.isArray(vectorOutputs)) {
    ACCUMULATOR_TEST_VECTORS.forEach((vec, idx) => {
      const student = vectorOutputs[idx] || {};
      const accOk = student.acc === vec.expectedAcc;
      const ovfOk = Boolean(student.ovf) === vec.expectedOvf;
      const isCorrect = accOk && ovfOk;
      if (isCorrect) correctVectors++;
      vectorResults.push({
        vector: vec.vector,
        accOk,
        ovfOk,
        isCorrect,
        expectedAcc: vec.expectedAcc,
        expectedOvf: vec.expectedOvf,
        reason: vec.reason,
      });
    });
  }

  const vectorScore = correctVectors * 5; // up to 20 XP
  const conceptScore = conceptAnswer === CORRECT_ACCUMULATOR_CONCEPT_ID ? 10 : 0;

  const rawScore = wiringScore + vectorScore + conceptScore;
  const score = Math.min(45, rawScore);

  // Star thresholds: [18, 32, 45]
  let stars = 0;
  if (score >= 45) stars = 3;
  else if (score >= 32) stars = 2;
  else if (score >= 18) stars = 1;

  const passed = wiringValid && correctVectors >= 3 && score >= 32;

  let feedback = '';
  if (!wiringValid) {
    feedback = 'Datapath wiring has invalid connections. Ensure Mux input 0 connects to the feedback loop and the adder output connects to the register input!';
  } else if (correctVectors < 3) {
    feedback = `Datapath wired correctly, but only ${correctVectors}/4 vector predictions matched. Check vector #4 for 8-bit addition overflow wrap-around!`;
  } else if (stars === 3) {
    feedback = 'Outstanding engineering! You correctly wired the pipelined accumulator datapath, modeled register feedback loops, and predicted 8-bit overflow.';
  } else {
    feedback = `Great job (${score}/45 XP, ${stars} Stars)! Your datapath functions correctly and handles arithmetic overflow.`;
  }

  return {
    passed,
    score,
    stars,
    feedback,
    wiringValid,
    vectorResults,
    conceptCorrect: conceptAnswer === CORRECT_ACCUMULATOR_CONCEPT_ID,
  };
}
