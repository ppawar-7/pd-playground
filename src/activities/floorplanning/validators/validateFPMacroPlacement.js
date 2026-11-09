/**
 * validateFPMacroPlacement.js
 * ============================
 * Pure deterministic validator for Level 4 (fp-4): Macro Placement Basics.
 */

import { checkRectCollision, isContainedInCore } from '../../../engine/geometryEngine.js';
import {
  createDesignArtifact,
  ARTIFACT_KINDS,
} from '../../../logic/designArtifactContracts.js';

export const CORRECT_HALO_CONCEPT_ID = 'opt-halo-routing-drc';

export function validateFPMacroPlacement(submission) {
  if (!submission || !Array.isArray(submission.macros)) {
    return {
      passed: false,
      score: 0,
      stars: 0,
      feedback: 'Please place both SRAM hard macros into the core.',
    };
  }

  const { macros, haloConcept } = submission;
  const core = { width: 500, height: 400 };
  const halo = 15; // 15 µm halo

  if (macros.length < 2) {
    return { passed: false, score: 0, stars: 0, feedback: 'Both SRAM1 and SRAM2 must be placed in the core.' };
  }

  const m1 = macros[0];
  const m2 = macros[1];

  const m1InCore = isContainedInCore(m1, core);
  const m2InCore = isContainedInCore(m2, core);
  const boundsOk = m1InCore && m2InCore;

  const overlap = checkRectCollision(m1, m2, halo);
  const haloOk = !overlap;

  const haloConceptOk = haloConcept === CORRECT_HALO_CONCEPT_ID;

  // Real measurements
  const m1Margin = Math.min(
    m1.x,
    m1.y,
    core.width - (m1.x + (m1.width || 0)),
    core.height - (m1.y + (m1.height || 0))
  );
  const m2Margin = Math.min(
    m2.x,
    m2.y,
    core.width - (m2.x + (m2.width || 0)),
    core.height - (m2.y + (m2.height || 0))
  );
  const measuredMargin = Math.max(0, Math.min(m1Margin, m2Margin));

  const dx = Math.max(0, Math.max(m1.x - (m2.x + (m2.width || 0)), m2.x - (m1.x + (m1.width || 0))));
  const dy = Math.max(0, Math.max(m1.y - (m2.y + (m2.height || 0)), m2.y - (m1.y + (m1.height || 0))));
  const measuredHalo = Math.max(dx, dy);

  const boundsScore = boundsOk ? 15 : 0;
  const haloScore = haloOk ? 15 : 0;
  const conceptScore = haloConceptOk ? 15 : 0;

  const rawScore = boundsScore + haloScore + conceptScore;
  const score = Math.min(45, rawScore);

  let stars = 0;
  if (score >= 45) stars = 3;
  else if (score >= 32) stars = 2;
  else if (score >= 18) stars = 1;

  const passed = boundsOk && haloOk && score >= 32;

  let feedback = '';
  if (!boundsOk) {
    feedback = 'Macro extends beyond core boundary! Keep all macros strictly within (0,0) to (500, 400) µm.';
  } else if (!haloOk) {
    feedback = `Macro collision or halo violation! SRAM1 and SRAM2 must maintain at least ${2 * halo} µm clearance between outer boundaries to satisfy placement halo rules.`;
  } else if (stars === 3) {
    feedback = 'Flawless Macro Placement! Both SRAM blocks are legally positioned along core boundaries with valid halo spacing and clean routing channels.';
  } else {
    feedback = `Good macro layout (${score}/45 XP, ${stars} Stars)! Your placement prevents routing congestion around dense memory arrays.`;
  }

  const artifacts = createDesignArtifact({
    kind: ARTIFACT_KINDS.FLOORPLAN_LAYOUT,
    sourceLevelId: 'fp-4',
    inputs: {
      macros: macros.map((m) => ({ ...m })),
      haloConcept,
    },
    measurements: {
      margin: measuredMargin,
      halo: measuredHalo,
      boundsOk,
      haloOk,
      haloConceptOk,
    },
    units: {
      margin: 'µm',
      halo: 'µm',
    },
  });

  return {
    passed,
    score,
    stars,
    feedback,
    boundsOk,
    haloOk,
    haloConceptOk,
    artifacts,
  };
}
