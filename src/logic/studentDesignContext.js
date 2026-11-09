/**
 * studentDesignContext.js
 * =======================
 * Pure helper module that extracts and validates student design artifacts
 * created during level play for use in Physical Design Stage Sanity Checks.
 *
 * Guarantees that sanity check certifications evaluate genuine student designs
 * rather than unearned defaults, while cleanly supporting separate demonstration drills.
 */

import {
  ARTIFACT_STATUS,
  CHECK_CLASSIFICATION,
  validateDesignArtifact,
  validateMeasurementsForCheck,
} from './designArtifactContracts.js';

export { ARTIFACT_STATUS, CHECK_CLASSIFICATION };

/**
 * Helper to safely extract verified measurements or raw artifacts from levelProgress.
 */
function getValidMeasurements(player, levelId) {
  const levelData = player?.levelProgress?.[levelId];
  if (!levelData?.completed || !levelData?.artifacts) {
    return null;
  }
  const art = levelData.artifacts;
  if (art.measurements && typeof art.measurements === 'object') {
    return art.measurements;
  }
  return art;
}

/**
 * Mapping of sanity check IDs to their prerequisite level IDs, design requirements, and classifications.
 *
 * Grounded Reality:
 * - 15 checks are CERTIFIABLE_EDUCATIONAL_CHECK (backed by actual student inputs & computed models)
 * - 11 checks are PRACTICE_ONLY (educational drills / defect exploration; zero certification XP)
 */
export const SANITY_CHECK_REQUIREMENTS = {
  // ─── Floorplanning (3 checks) ───────────────────────────────────
  'fp-drc': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['fp-4', 'fp-5'],
    title: 'Core Margin & Macro Halo Spacing',
    description: 'Validates that your macro placement satisfies core boundary margin (>= 20 µm) and macro-to-macro keepout halos (>= 15 µm).',
    extractData: (player) => {
      const fp5 = getValidMeasurements(player, 'fp-5') || {};
      const fp4 = getValidMeasurements(player, 'fp-4') || {};
      return {
        margin: fp5.margin ?? fp4.margin,
        halo: fp5.halo ?? fp4.halo,
      };
    },
  },
  'fp-connectivity': {
    classification: CHECK_CLASSIFICATION.PRACTICE_ONLY,
    prerequisiteLevels: ['fp-5'],
    title: 'VDD/VSS Power Ring Continuity',
    description: 'Educational practice drill: Traces power and ground distribution rings around core boundary to check for open segments.',
    extractData: () => ({}),
  },
  'fp-missing-vias': {
    classification: CHECK_CLASSIFICATION.PRACTICE_ONLY,
    prerequisiteLevels: ['fp-5'],
    title: 'Power Grid Crossing Vias',
    description: 'Educational practice drill: Inspects power mesh layer intersections to confirm orthogonal strap-to-ring via connections.',
    extractData: () => ({}),
  },

  // ─── Placement (5 checks) ───────────────────────────────────────
  'pl-legality': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['pl-2', 'pl-5'],
    title: 'Cell Site Legalization & Overlap Resolution',
    description: 'Validates that placed cells snap to standard cell site rows with zero overlapping transistor active areas.',
    extractData: (player) => {
      const pl5 = getValidMeasurements(player, 'pl-5') || {};
      const pl2 = getValidMeasurements(player, 'pl-2') || {};
      return {
        cells: pl5.cells || pl2.cells,
        noOverlaps: pl5.noOverlaps ?? pl2.noOverlaps,
      };
    },
  },
  'pl-congestion': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['pl-4'],
    title: 'GCell Routing Demand Congestion',
    description: 'Checks Global Routing Cell demand ratios across your layout to ensure all bins remain below routing capacity.',
    extractData: (player) => {
      const pl4 = getValidMeasurements(player, 'pl-4') || {};
      return {
        hotspotResolved: pl4.hotspotResolved,
        maxCongestion: pl4.maxCongestion,
        peakRatio: pl4.peakRatio ?? pl4.maxCongestion,
      };
    },
  },
  'pl-drc': {
    classification: CHECK_CLASSIFICATION.PRACTICE_ONLY,
    prerequisiteLevels: ['pl-5'],
    title: 'Cell-to-Cell Spacing & Row Orientation',
    description: 'Educational practice drill: Validates standard cell row alignment, boundary clearances, and latchup well-tap pitch.',
    extractData: () => ({}),
  },
  'pl-connectivity': {
    classification: CHECK_CLASSIFICATION.PRACTICE_ONLY,
    prerequisiteLevels: ['pl-5'],
    title: 'Placement Net Connectivity',
    description: 'Educational practice drill: Ensures all logical nets connect driver cell outputs to receiver cell inputs with zero unrouted terminals.',
    extractData: () => ({}),
  },
  'pl-missing-vias': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['pl-5'],
    title: 'Standard Cell Power Rail Tie-Offs & Well-Taps',
    description: 'Verifies that placed standard cells snap to row power rails with 0 off-rail instances.',
    extractData: (player) => {
      const pl5 = getValidMeasurements(player, 'pl-5') || {};
      return {
        offRailCells: pl5.offRailCells ?? pl5.missingRailVias,
      };
    },
  },

  // ─── Clock Tree Synthesis (4 checks) ────────────────────────────
  'cts-timing-reports': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['cts-2'],
    title: 'Post-CTS Setup & Hold Timing Closure',
    description: 'Evaluates setup and hold timing slacks with real clock propagation delays and clock skew.',
    extractData: (player) => {
      const cts2 = getValidMeasurements(player, 'cts-2') || {};
      return {
        setupSlack: cts2.setupSlack,
        holdSlack: cts2.holdSlack,
        skewPs: cts2.skewPs,
        tCombNs: cts2.tCombNs,
      };
    },
  },
  'cts-power': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['cts-3', 'cts-5'],
    title: 'Clock Network Dynamic Power Dissipation',
    description: 'Checks clock buffer switching power to confirm total tree power is within budget (<= 5.0 mW).',
    extractData: (player) => {
      const cts5 = getValidMeasurements(player, 'cts-5') || {};
      return {
        powerMw: cts5.powerMw,
        maxPowerAllowed: 5.0,
      };
    },
  },
  'cts-qor': {
    classification: CHECK_CLASSIFICATION.PRACTICE_ONLY,
    prerequisiteLevels: ['cts-5'],
    title: 'Clock Tree Quality of Results (QoR)',
    description: 'Educational practice drill: Evaluates max insertion latency (<= 300 ps) and clock slew transition times (<= 80 ps).',
    extractData: () => ({}),
  },
  'cts-clock-tree-report': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['cts-5'],
    title: 'Clock Skew Balance Across Sinks',
    description: 'Measures arrival time variance between launch and capture registers to confirm clock skew <= 50 ps.',
    extractData: (player) => {
      const cts5 = getValidMeasurements(player, 'cts-5') || {};
      return {
        skewPs: cts5.skewPs,
        latencyPs: cts5.latencyPs ?? cts5.maxLatencyPs,
        stages: cts5.stages,
        sinks: cts5.sinks,
      };
    },
  },

  // ─── Routing (5 checks) ─────────────────────────────────────────
  'rt-routes': {
    classification: CHECK_CLASSIFICATION.PRACTICE_ONLY,
    prerequisiteLevels: ['rt-5'],
    title: 'Detailed Routing Net Completion',
    description: 'Educational practice drill: Verifies 100% net completion with zero unrouted antenna opens or dangling wire fragments.',
    extractData: () => ({}),
  },
  'rt-lvs': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['rt-5'],
    title: 'Layout Versus Schematic (LVS) Netlist Extraction',
    description: 'Extracts physical interconnect polygons and compares against the logical netlist for opens and shorts.',
    extractData: (player) => {
      const rt5 = getValidMeasurements(player, 'rt-5') || {};
      return {
        shorts: rt5.shorts,
        hasShorts: rt5.hasShorts,
        lvsMatch: rt5.lvsMatch,
        segments: rt5.segments,
      };
    },
  },
  'rt-timing': {
    classification: CHECK_CLASSIFICATION.PRACTICE_ONLY,
    prerequisiteLevels: ['rt-5'],
    title: 'Post-Route Parasitic RC Timing Sign-Off',
    description: 'Educational practice drill: Calculates distributed wire delays using extracted SPEF parasitic resistances and capacitances.',
    extractData: () => ({}),
  },
  'rt-design': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['rt-3'],
    title: 'Via Enclosure & Metal Spacing DRC',
    description: 'Validates metal wire width, spacing, notch rules, and via layer enclosure margins (>= 0.010 µm).',
    extractData: (player) => {
      const rt3 = getValidMeasurements(player, 'rt-3') || {};
      return {
        enclosureUm: rt3.viaEnclosureUm ?? rt3.enclosureUm,
        viaEnclosureUm: rt3.viaEnclosureUm ?? rt3.enclosureUm,
        drcErrors: rt3.drcViolations ?? 0,
      };
    },
  },
  'rt-constraints': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['rt-4'],
    title: 'Signal Integrity & Crosstalk Noise Budget',
    description: 'Evaluates dynamic cross-coupling glitch voltage (<= 50 mV) on sensitive signal nets.',
    extractData: (player) => {
      const rt4 = getValidMeasurements(player, 'rt-4') || {};
      return {
        glitchVoltageMv: rt4.glitchVoltageMv ?? rt4.maxVictimNoiseMv,
        maxVictimNoiseMv: rt4.maxVictimNoiseMv ?? rt4.glitchVoltageMv,
        maxAllowedNoiseMv: rt4.maxAllowedNoiseMv || 50,
      };
    },
  },

  // ─── Filler Cells (9 checks) ────────────────────────────────────
  'fc-legality': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['fc-5'],
    title: '100% Standard Cell Row Fill Ratio',
    description: 'Verifies that every empty site in the row is populated with legal discrete filler cells (FILL1 to FILL64).',
    extractData: (player) => {
      const fc5 = getValidMeasurements(player, 'fc-5') || {};
      const fc3 = getValidMeasurements(player, 'fc-3') || {};
      return {
        emptySites: fc5.emptySites ?? fc3.emptySites,
        totalSitesFilled: fc5.totalSitesFilled ?? fc3.totalSitesFilled,
        rowFillPercent: fc5.rowFillPercent ?? fc3.rowFillPercent,
      };
    },
  },
  'fc-drc': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['fc-5'],
    title: 'Base Layer Diffusion & Poly DRC',
    description: 'Checks diffusion notch spacing between active standard cells and adjacent filler cells.',
    extractData: (player) => {
      const fc5 = getValidMeasurements(player, 'fc-5') || {};
      const fc3 = getValidMeasurements(player, 'fc-3') || {};
      return {
        baseDrcViolations: fc5.baseDrcViolations ?? fc3.baseDrcViolations,
      };
    },
  },
  'fc-connectivity': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['fc-3'],
    title: 'Continuous N-Well & Substrate Bias',
    description: 'Checks unbroken N-well diffusion across the entire row to eliminate substrate potential fluctuations.',
    extractData: (player) => {
      const fc3 = getValidMeasurements(player, 'fc-3') || {};
      return {
        wellContinuityMet: fc3.wellContinuityMet,
      };
    },
  },
  'fc-design': {
    classification: CHECK_CLASSIFICATION.PRACTICE_ONLY,
    prerequisiteLevels: ['fc-5'],
    title: 'Physical-Only Cell Placement Integrity',
    description: 'Educational practice drill: Confirms that row endcaps terminate boundary rows and tap cells maintain latchup immunity.',
    extractData: () => ({}),
  },
  'fc-timing': {
    classification: CHECK_CLASSIFICATION.PRACTICE_ONLY,
    prerequisiteLevels: ['fc-5'],
    title: 'Filler Parasitic Interconnect Impact',
    description: 'Educational practice drill: Verifies that added decoupling capacitors do not introduce intolerable capacitive loading.',
    extractData: () => ({}),
  },
  'fc-constraints': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['fc-4'],
    title: 'Dynamic Power Rail Droop Suppression',
    description: 'Calculates dynamic IR droop under simultaneous switching current to ensure supply rail droop <= 40 mV.',
    extractData: (player) => {
      const fc4 = getValidMeasurements(player, 'fc-4') || {};
      return {
        droopMv: fc4.droopMv,
        maxAllowedDroopMv: fc4.maxAllowedDroopMv || 40,
        decapCapPf: fc4.decapCapPf,
      };
    },
  },
  'fc-power': {
    classification: CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK,
    prerequisiteLevels: ['fc-4'],
    title: 'Decap Gate Oxide Tunneling Leakage',
    description: 'Checks total gate leakage current added by MOS decap cells to confirm standby power remains within budget (<= 20 µA).',
    extractData: (player) => {
      const fc4 = getValidMeasurements(player, 'fc-4') || {};
      return {
        leakageUa: fc4.leakageUa,
        maxAllowedLeakageUa: fc4.maxAllowedLeakageUa || 20.0,
        decapCapPf: fc4.decapCapPf,
      };
    },
  },
  'fc-qor': {
    classification: CHECK_CLASSIFICATION.PRACTICE_ONLY,
    prerequisiteLevels: ['fc-5'],
    title: 'Filler Cell Quality of Results Scorecard',
    description: 'Educational practice drill: Comprehensive scorecard checking row fill legality, continuous N-well diffusion, and decap protection.',
    extractData: () => ({}),
  },
  'fc-congestion': {
    classification: CHECK_CLASSIFICATION.PRACTICE_ONLY,
    prerequisiteLevels: ['fc-5'],
    title: 'Filler Pin Blockage & Routing Track Availability',
    description: 'Educational practice drill: Ensures physical-only filler cells do not block upper metal routing tracks.',
    extractData: () => ({}),
  },
};

/**
 * Check whether a student has completed prerequisite levels and generated valid artifacts
 * to run a sanity check on their design.
 *
 * @param {Object} player - Player state object from PlayerContext
 * @param {string} checkId - Sanity check identifier
 * @returns {{ canCertify: boolean, isPracticeOnly: boolean, missingPrerequisites: Array<string>, status: string, reason: string, requirement: Object, designData: Object }}
 */
export function getStudentDesignForSanityCheck(player, checkId) {
  const req = SANITY_CHECK_REQUIREMENTS[checkId];
  if (!req) {
    return {
      canCertify: false,
      isPracticeOnly: false,
      missingPrerequisites: [],
      status: ARTIFACT_STATUS.UNSUPPORTED_MODEL,
      reason: `Unknown sanity check identifier: ${checkId}`,
      requirement: null,
      designData: {},
    };
  }

  const levelProgress = player?.levelProgress || {};

  // Check 1: Incomplete prerequisite levels
  const missingPrerequisites = req.prerequisiteLevels.filter(
    (lvlId) => !levelProgress[lvlId]?.completed
  );

  if (missingPrerequisites.length > 0) {
    return {
      canCertify: false,
      isPracticeOnly: req.classification === CHECK_CLASSIFICATION.PRACTICE_ONLY,
      missingPrerequisites,
      status: ARTIFACT_STATUS.MISSING_PREREQUISITE,
      reason: `Prerequisite design missing: Complete ${missingPrerequisites.join(', ')} to generate your layout geometry first.`,
      requirement: req,
      designData: {},
    };
  }

  // PRACTICE_ONLY checks can never certify, but once prerequisites are met, allow practice mode
  if (req.classification === CHECK_CLASSIFICATION.PRACTICE_ONLY) {
    return {
      canCertify: false,
      isPracticeOnly: true,
      missingPrerequisites: [],
      status: ARTIFACT_STATUS.PRACTICE_ONLY,
      reason: 'This stage check is an educational demonstration and fault drill. Certification XP is not available.',
      requirement: req,
      designData: {},
    };
  }

  // Check 2: Level marked completed, but missing design artifact envelope
  for (const lvlId of req.prerequisiteLevels) {
    const art = levelProgress[lvlId]?.artifacts;
    if (!art || typeof art !== 'object') {
      return {
        canCertify: false,
        isPracticeOnly: false,
        missingPrerequisites: [lvlId],
        status: ARTIFACT_STATUS.MISSING_ARTIFACT,
        reason: `Prerequisite level ${lvlId} is marked completed, but design artifacts are missing. Replay and complete the challenge to generate geometry.`,
        requirement: req,
        designData: {},
      };
    }

    // Validate versioned artifact envelope if version/kind metadata is present
    if (art.schemaVersion !== undefined || art.kind !== undefined || art.contractVersion !== undefined) {
      const envelopeVal = validateDesignArtifact(art);
      if (!envelopeVal.isValid) {
        return {
          canCertify: false,
          isPracticeOnly: false,
          missingPrerequisites: [],
          status: ARTIFACT_STATUS.INVALID_ARTIFACT,
          reason: `Artifact from ${lvlId} failed envelope provenance validation: ${envelopeVal.errors.join('; ')}`,
          requirement: req,
          designData: {},
        };
      }
      if (art.sourceLevelId && art.sourceLevelId !== lvlId) {
        return {
          canCertify: false,
          isPracticeOnly: false,
          missingPrerequisites: [],
          status: ARTIFACT_STATUS.INVALID_ARTIFACT,
          reason: `Artifact sourceLevelId mismatch: expected "${lvlId}", got "${art.sourceLevelId}".`,
          requirement: req,
          designData: {},
        };
      }
    }
  }

  // Check 3: Extract data and validate mandatory physical fields
  const designData = req.extractData(player);
  const measurementValidation = validateMeasurementsForCheck(checkId, designData);

  if (!measurementValidation.isValid) {
    return {
      canCertify: false,
      isPracticeOnly: false,
      missingPrerequisites: [],
      status: ARTIFACT_STATUS.INVALID_ARTIFACT,
      reason: `Extracted student design measurements for ${checkId} are incomplete or invalid: ${measurementValidation.missingFields.join(', ')}.`,
      requirement: req,
      designData: {},
    };
  }

  return {
    canCertify: true,
    isPracticeOnly: false,
    missingPrerequisites: [],
    status: ARTIFACT_STATUS.READY,
    reason: 'Student design parameters verified and ready for sign-off evaluation.',
    requirement: req,
    designData,
  };
}
