/**
 * validateFPIntro.js
 * ==================
 * Pure deterministic validator for Level 1 (fp-1): Introduction to Floorplanning.
 */

export const CORRECT_CORE_VS_DIE_ID = 'opt-die-core-margin';
export const CORRECT_POWER_RING_ID = 'opt-power-ring-ir';

export function validateFPIntro(submission) {
  if (!submission) {
    return {
      passed: false,
      score: 0,
      stars: 0,
      feedback: 'Please complete all floorplanning concept questions.',
    };
  }

  const { coreDieAnswer, powerRingAnswer } = submission;

  const q1Ok = coreDieAnswer === CORRECT_CORE_VS_DIE_ID;
  const q2Ok = powerRingAnswer === CORRECT_POWER_RING_ID;

  const score = (q1Ok ? 15 : 0) + (q2Ok ? 15 : 0);

  let stars = 0;
  if (score >= 30) stars = 3;
  else if (score >= 20) stars = 2;
  else if (score >= 10) stars = 1;

  const passed = q1Ok && q2Ok && score >= 20;

  let feedback = '';
  if (!passed) {
    feedback = 'Review floorplan boundaries: The Core is the active placement region for standard cells and macros, surrounded by the I/O pad ring on the Die!';
  } else if (stars === 3) {
    feedback = 'Flawless! You understand the physical hierarchy of ASIC silicon: Die boundaries, I/O margins, core placement area, and low-impedance power rings.';
  } else {
    feedback = `Good understanding (${score}/30 XP, ${stars} Stars)! You are ready to calculate exact floorplan dimensions.`;
  }

  return {
    passed,
    score,
    stars,
    feedback,
    q1Ok,
    q2Ok,
  };
}
