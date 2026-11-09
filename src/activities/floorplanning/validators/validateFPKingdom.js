/**
 * validateFPKingdom.js
 * =====================
 * Pure deterministic validator for Level 5 (fp-5): Floorplan Kingdom Challenge.
 */

import {
  checkRectCollision,
  isContainedInCore,
  validatePinPlacements,
  computeUtilization,
} from '../../../engine/geometryEngine.js';
import {
  createDesignArtifact,
  ARTIFACT_KINDS,
} from '../../../logic/designArtifactContracts.js';

export const CORRECT_POWER_GRID_ID = 'opt-mesh-power-straps';

export function validateFPKingdom(submission) {
  if (!submission) {
    return {
      passed: false,
      score: 0,
      stars: 0,
      feedback: 'Please complete macro placement, pin configuration, and power grid questions.',
    };
  }

  const { macros, pins, powerGridConcept } = submission;
  const core = { width: 500, height: 400 };
  const halo = 15;

  // 1. Macro validation
  let macrosOk = false;
  let macroFeedback = '';
  let measuredMargin = 0;
  let measuredHalo = 0;

  if (Array.isArray(macros) && macros.length >= 2) {
    const m1 = macros[0];
    const m2 = macros[1];
    const m1Inside = isContainedInCore(m1, core);
    const m2Inside = isContainedInCore(m2, core);
    const collision = checkRectCollision(m1, m2, halo);

    // Compute actual boundary clearance (margin) to core edges
    const m1Margin = Math.min(
      m1.x,
      m1.y,
      core.width - (m1.x + m1.width),
      core.height - (m1.y + m1.height)
    );
    const m2Margin = Math.min(
      m2.x,
      m2.y,
      core.width - (m2.x + m2.width),
      core.height - (m2.y + m2.height)
    );
    measuredMargin = Math.max(0, Math.min(m1Margin, m2Margin));

    // Compute actual macro-to-macro clear distance (halo clearance)
    const dx = Math.max(0, Math.max(m1.x - (m2.x + m2.width), m2.x - (m1.x + m1.width)));
    const dy = Math.max(0, Math.max(m1.y - (m2.y + m2.height), m2.y - (m1.y + m1.height)));
    measuredHalo = Math.max(dx, dy);

    if (!m1Inside || !m2Inside) {
      macroFeedback = 'Macros exceed core boundary bounds.';
    } else if (collision) {
      macroFeedback = 'Macros collide or violate 15 µm halo clearance.';
    } else {
      macrosOk = true;
    }
  } else {
    macroFeedback = 'Two SRAM macros required.';
  }

  // 2. Pin validation
  let pinsOk = false;
  let pinFeedback = '';
  if (Array.isArray(pins) && pins.length >= 6) {
    const check = validatePinPlacements(pins, 20, core);
    const dataOnTop = ['DATA0', 'DATA1', 'DATA2', 'DATA3'].every((id) => {
      const p = pins.find((pin) => pin.id === id);
      return p && p.edge === 'top';
    });
    const ctrlOnBottom = ['CLK', 'RST'].every((id) => {
      const p = pins.find((pin) => pin.id === id);
      return p && p.edge === 'bottom';
    });

    if (!check.isValid) {
      pinFeedback = check.violations[0];
    } else if (!dataOnTop || !ctrlOnBottom) {
      pinFeedback = 'DATA[3:0] must reside on top edge; CLK/RST on bottom edge.';
    } else {
      pinsOk = true;
    }
  } else {
    pinFeedback = 'All 6 I/O pins must be placed.';
  }

  // 3. Power Grid Concept
  const powerOk = powerGridConcept === CORRECT_POWER_GRID_ID;

  const macroScore = macrosOk ? 20 : 0;
  const pinScore = pinsOk ? 20 : 0;
  const powerScore = powerOk ? 10 : 0;

  const rawScore = macroScore + pinScore + powerScore;
  const score = Math.min(50, rawScore);

  let stars = 0;
  if (score >= 50) stars = 3;
  else if (score >= 38) stars = 2;
  else if (score >= 20) stars = 1;

  const passed = macrosOk && pinsOk && score >= 38;

  let feedback = '';
  if (!macrosOk) {
    feedback = `Macro placement error: ${macroFeedback}`;
  } else if (!pinsOk) {
    feedback = `Pin layout error: ${pinFeedback}`;
  } else if (stars === 3) {
    feedback = 'Flawless Floorplan Capstone! You established valid core boundaries, placed SRAM blocks with keepout halos, arranged I/O pins, and verified power grid integrity.';
  } else {
    feedback = `Great floorplanning work (${score}/50 XP, ${stars} Stars)! You are ready to advance to Standard Cell Placement.`;
  }

  // Construct explicit verified design artifact
  const artifacts = createDesignArtifact({
    kind: ARTIFACT_KINDS.FLOORPLAN_LAYOUT,
    sourceLevelId: 'fp-5',
    inputs: {
      macros: Array.isArray(macros) ? macros.map((m) => ({ ...m })) : [],
      pins: Array.isArray(pins) ? pins.map((p) => ({ ...p })) : [],
      powerGridConcept,
    },
    measurements: {
      margin: measuredMargin,
      halo: measuredHalo,
      macrosOk,
      pinsOk,
      powerOk,
      coreWidth: core.width,
      coreHeight: core.height,
    },
    units: {
      margin: 'µm',
      halo: 'µm',
      coreWidth: 'µm',
      coreHeight: 'µm',
    },
  });

  return {
    passed,
    score,
    stars,
    feedback,
    macrosOk,
    pinsOk,
    powerOk,
    artifacts,
  };
}
