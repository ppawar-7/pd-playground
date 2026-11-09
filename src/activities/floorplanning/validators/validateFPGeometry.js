/**
 * validateFPGeometry.js
 * =====================
 * Pure deterministic validator for Level 2 (fp-2): Die Size and Aspect Ratio.
 */

import { computeCoreGeometry, computeUtilization } from '../../../engine/geometryEngine.js';

export const CORRECT_UTIL_CONGESTION_ID = 'opt-routing-drc-hotspots';

export function validateFPGeometry(submission) {
  if (!submission) {
    return {
      passed: false,
      score: 0,
      stars: 0,
      feedback: 'Please complete all geometry calculations and utilization questions.',
    };
  }

  const { coreWidth, coreHeight, coreArea, aspectRatio, nominalUtil, effectiveUtil, congestionConcept } = submission;

  // Expected values:
  // Core: 500 x 400 = 200,000
  // AR: 0.80
  // Nominal: 50.0%
  // Effective: 42.9%
  const widthOk = Math.abs(Number(coreWidth) - 500) <= 2;
  const heightOk = Math.abs(Number(coreHeight) - 400) <= 2;
  const areaOk = Math.abs(Number(coreArea) - 200000) <= 500;
  const arOk = Math.abs(Number(aspectRatio) - 0.80) <= 0.05;
  const nomOk = Math.abs(Number(nominalUtil) - 50.0) <= 0.5;
  const effOk = Math.abs(Number(effectiveUtil) - 42.9) <= 0.5;
  const conceptOk = congestionConcept === CORRECT_UTIL_CONGESTION_ID;

  const dimScore = (widthOk ? 3 : 0) + (heightOk ? 3 : 0) + (areaOk ? 4 : 0); // 10 XP
  const ratioScore = arOk ? 5 : 0;                                           // 5 XP
  const utilScore = (nomOk ? 5 : 0) + (effOk ? 5 : 0);                        // 10 XP
  const conceptScore = conceptOk ? 10 : 0;                                   // 10 XP

  const rawScore = dimScore + ratioScore + utilScore + conceptScore;
  const score = Math.min(35, rawScore);

  let stars = 0;
  if (score >= 35) stars = 3;
  else if (score >= 24) stars = 2;
  else if (score >= 12) stars = 1;

  const passed = (widthOk && heightOk && areaOk) && (nomOk || effOk) && score >= 24;

  let feedback = '';
  if (!passed) {
    feedback = `Geometry check: Core Width=${coreWidth} (expected 500), Core Height=${coreHeight} (expected 400), Core Area=${coreArea} (expected 200000), Nominal Util=${nominalUtil}% (expected 50.0%). Remember to subtract 2x margins from die size!`;
  } else if (stars === 3) {
    feedback = 'Flawless calculations! You accurately derived core dimensions, aspect ratio, and distinguished nominal utilization from effective placement area.';
  } else {
    feedback = `Great work (${score}/35 XP, ${stars} Stars)! Your utilization metrics ensure adequate routability during detailed routing.`;
  }

  return {
    passed,
    score,
    stars,
    feedback,
    widthOk,
    heightOk,
    areaOk,
    arOk,
    nomOk,
    effOk,
    conceptOk,
  };
}
