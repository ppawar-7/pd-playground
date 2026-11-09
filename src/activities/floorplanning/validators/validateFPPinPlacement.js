/**
 * validateFPPinPlacement.js
 * ==========================
 * Pure deterministic validator for Level 3 (fp-3): I/O Placement.
 */

import { validatePinPlacements } from '../../../engine/geometryEngine.js';

export const CORRECT_ESD_CONCEPT_ID = 'opt-esd-wirebond-clearance';

export function validateFPPinPlacement(submission) {
  if (!submission || !Array.isArray(submission.pins)) {
    return {
      passed: false,
      score: 0,
      stars: 0,
      feedback: 'Please place all required I/O pins along core boundaries.',
    };
  }

  const { pins, esdConcept } = submission;
  const core = { width: 500, height: 400 };

  // Validate geometry pitch spacing (min 20 µm)
  const pinCheck = validatePinPlacements(pins, 20, core);

  // Check required pin assignments:
  // DATA0-3 must be on 'top' edge
  // CLK and RST must be on 'bottom' edge
  const dataPinsOnTop = ['DATA0', 'DATA1', 'DATA2', 'DATA3'].every((id) => {
    const p = pins.find((pin) => pin.id === id);
    return p && p.edge === 'top';
  });

  const controlPinsOnBottom = ['CLK', 'RST'].every((id) => {
    const p = pins.find((pin) => pin.id === id);
    return p && p.edge === 'bottom';
  });

  const esdCorrect = esdConcept === CORRECT_ESD_CONCEPT_ID;

  const pitchScore = pinCheck.isValid ? 15 : 0;
  const topScore = dataPinsOnTop ? 10 : 0;
  const bottomScore = controlPinsOnBottom ? 5 : 0;
  const esdScore = esdCorrect ? 10 : 0;

  const rawScore = pitchScore + topScore + bottomScore + esdScore;
  const score = Math.min(40, rawScore);

  let stars = 0;
  if (score >= 40) stars = 3;
  else if (score >= 28) stars = 2;
  else if (score >= 15) stars = 1;

  const passed = pinCheck.isValid && dataPinsOnTop && controlPinsOnBottom && score >= 28;

  let feedback = '';
  if (!pinCheck.isValid) {
    feedback = `Pin pitch violation: ${pinCheck.violations[0]}. Ensure at least 20 µm spacing between adjacent pins on the same edge!`;
  } else if (!dataPinsOnTop || !controlPinsOnBottom) {
    feedback = 'Bus grouping error: Place DATA[0:3] on the top edge and clock/reset controls on the bottom edge to minimize routing entanglement!';
  } else if (stars === 3) {
    feedback = 'Flawless I/O Placement! You adhered to minimum pin pitch rules, clustered related bus nets, and mastered ESD ring integration.';
  } else {
    feedback = `Good pin arrangement (${score}/40 XP, ${stars} Stars)! Your I/O configuration satisfies packaging and physical routing guidelines.`;
  }

  return {
    passed,
    score,
    stars,
    feedback,
    pinCheck,
    dataPinsOnTop,
    controlPinsOnBottom,
    esdCorrect,
  };
}
