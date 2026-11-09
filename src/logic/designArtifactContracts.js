/**
 * designArtifactContracts.js
 * ===========================
 * Formal, versioned engineering design artifact contracts for PD Playground.
 *
 * Establishes explicit boundaries between:
 * - Activity completion
 * - Artifact existence & schema validity
 * - Meaningful student design parameters
 * - Stage sanity check verification
 * - Stage certification awards
 *
 * Rules:
 * - Deterministic runtime validation
 * - Rejects NaN, Infinity, negative geometry, invalid arrays, and corrupt types
 * - Never replaces missing student measurements with passing defaults
 * - Keeps educational feedback separate from engineering measurements
 */

export const ARTIFACT_CONTRACT_VERSION = '2.0.0';
export const ARTIFACT_SCHEMA_VERSION = 2;
export const CURRENT_MODEL_VERSION = 2;

/**
 * Supported artifact kinds across the 8 ASIC kingdoms.
 */
export const ARTIFACT_KINDS = {
  RTL_CIRCUIT: 'rtl.circuit',
  SYNTHESIS_NETLIST: 'synthesis.netlist',
  FLOORPLAN_LAYOUT: 'floorplan.layout',
  PLACEMENT_LAYOUT: 'placement.layout',
  CTS_CLOCK_TREE: 'cts.clock_tree',
  ROUTING_INTERCONNECT: 'routing.interconnect',
  FILLER_CELLS_DENSITY: 'filler_cells.density',
  GDS_MASK_STREAM: 'gds.mask_stream',
};

/**
 * Explicit artifact and sanity check status codes.
 */
export const ARTIFACT_STATUS = {
  READY: 'READY',
  MISSING_PREREQUISITE: 'MISSING_PREREQUISITE',
  MISSING_ARTIFACT: 'MISSING_ARTIFACT',
  INVALID_ARTIFACT: 'INVALID_ARTIFACT',
  STALE_ARTIFACT: 'STALE_ARTIFACT',
  UNSUPPORTED_MODEL: 'UNSUPPORTED_MODEL',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CERTIFIED: 'CERTIFIED',
  PRACTICE_ONLY: 'PRACTICE_ONLY',
};

/**
 * Check classification policy.
 */
export const CHECK_CLASSIFICATION = {
  CERTIFIABLE_EDUCATIONAL_CHECK: 'CERTIFIABLE_EDUCATIONAL_CHECK',
  PRACTICE_ONLY: 'PRACTICE_ONLY',
  UNSUPPORTED_PENDING_MODEL: 'UNSUPPORTED_PENDING_MODEL',
};

/**
 * Mandatory physical fields required for CERTIFIABLE sanity checks.
 * If any of these fields are missing, NaN, or invalid in student mode,
 * the certification engine strictly fails closed.
 */
export const CHECK_MANDATORY_FIELDS = {
  'fp-drc': ['margin', 'halo'],
  'pl-legality': ['cells'],
  'pl-congestion': ['maxCongestion'],
  'pl-missing-vias': ['offRailCells'],
  'cts-clock-tree-report': ['skewPs', 'latencyPs'],
  'cts-timing-reports': ['setupSlack', 'holdSlack'],
  'cts-power': ['powerMw'],
  'rt-lvs': ['shorts', 'lvsMatch'],
  'rt-design': ['viaEnclosureUm', 'drcErrors'],
  'rt-constraints': ['glitchVoltageMv'],
  'fc-legality': ['emptySites'],
  'fc-drc': ['baseDrcViolations'],
  'fc-connectivity': ['wellContinuityMet'],
  'fc-constraints': ['droopMv'],
  'fc-power': ['leakageUa'],
};

/**
 * Helper to check if a value is a strictly finite number (not NaN, not Infinity).
 */
export function isFiniteNumber(val) {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Create a validated design artifact envelope.
 *
 * @param {Object} spec
 * @param {string} spec.kind - One of ARTIFACT_KINDS
 * @param {string} spec.sourceLevelId - e.g. 'fp-5', 'pl-5'
 * @param {Object} spec.inputs - Student-chosen design parameters
 * @param {Object} spec.measurements - Deterministic engine-derived measurements
 * @param {Object} [spec.units={}] - Measurement units
 * @param {string} [spec.contractVersion=ARTIFACT_CONTRACT_VERSION]
 * @param {number} [spec.schemaVersion=ARTIFACT_SCHEMA_VERSION]
 * @param {number} [spec.modelVersion=CURRENT_MODEL_VERSION]
 * @returns {Object} Validated design artifact
 */
export function createDesignArtifact({
  kind,
  sourceLevelId,
  inputs = {},
  measurements = {},
  units = {},
  contractVersion = ARTIFACT_CONTRACT_VERSION,
  schemaVersion = ARTIFACT_SCHEMA_VERSION,
  modelVersion = CURRENT_MODEL_VERSION,
}) {
  const artifact = {
    contractVersion,
    schemaVersion,
    kind,
    sourceLevelId,
    modelVersion,
    inputs: inputs && typeof inputs === 'object' ? { ...inputs } : {},
    measurements: measurements && typeof measurements === 'object' ? { ...measurements } : {},
    units: units && typeof units === 'object' ? { ...units } : {},
    createdAt: new Date().toISOString(),
  };

  const validation = validateDesignArtifact(artifact);
  if (!validation.isValid) {
    throw new Error(`Invalid design artifact creation: ${validation.errors.join('; ')}`);
  }

  return artifact;
}

/**
 * Deterministic runtime validator for any design artifact envelope.
 *
 * @param {any} artifact
 * @param {string} [expectedKind=null]
 * @returns {{ isValid: boolean, status: string, errors: string[] }}
 */
export function validateDesignArtifact(artifact, expectedKind = null) {
  const errors = [];

  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
    return {
      isValid: false,
      status: ARTIFACT_STATUS.INVALID_ARTIFACT,
      errors: ['Artifact must be a non-null object.'],
    };
  }

  // Schema version enforcement: accept 1 or 2, reject unknown/future versions
  if (!Number.isInteger(artifact.schemaVersion) || artifact.schemaVersion < 1 || artifact.schemaVersion > 2) {
    errors.push(`artifact.schemaVersion must be 1 or 2 (received: ${artifact.schemaVersion}).`);
  }

  // Contract version
  if (artifact.contractVersion && typeof artifact.contractVersion !== 'string') {
    errors.push('artifact.contractVersion must be a valid string if present.');
  }

  // Kind
  const knownKinds = Object.values(ARTIFACT_KINDS);
  if (!knownKinds.includes(artifact.kind)) {
    errors.push(`Unknown artifact kind: "${artifact.kind}".`);
  } else if (expectedKind && artifact.kind !== expectedKind) {
    errors.push(`Kind mismatch: expected "${expectedKind}", received "${artifact.kind}".`);
  }

  // Source Level ID
  if (typeof artifact.sourceLevelId !== 'string' || !artifact.sourceLevelId.trim()) {
    errors.push('artifact.sourceLevelId must be a non-empty string.');
  }

  // Inputs & measurements containers
  if (!artifact.inputs || typeof artifact.inputs !== 'object') {
    errors.push('artifact.inputs must be an object.');
  }
  if (!artifact.measurements || typeof artifact.measurements !== 'object') {
    errors.push('artifact.measurements must be an object.');
  }

  // Deep inspection of measurements: reject NaN, Infinity, and invalid geometry
  if (artifact.measurements && typeof artifact.measurements === 'object') {
    for (const [key, val] of Object.entries(artifact.measurements)) {
      if (typeof val === 'number') {
        if (!Number.isFinite(val)) {
          errors.push(`Measurement "${key}" must be a finite number (received: ${val}).`);
        }
        // Negative dimension check for physical bounds
        if (
          (key.includes('margin') ||
            key.includes('halo') ||
            key.includes('Width') ||
            key.includes('Height') ||
            key.includes('Pitch') ||
            key.includes('Clearance') ||
            key.includes('emptySites')) &&
          val < 0
        ) {
          errors.push(`Physical dimension "${key}" must be non-negative (received: ${val}).`);
        }
      }
    }

    // Inspect cells array if present
    if (Array.isArray(artifact.measurements.cells)) {
      artifact.measurements.cells.forEach((cell, idx) => {
        if (!cell || typeof cell !== 'object') {
          errors.push(`Cell at index ${idx} must be a valid object.`);
          return;
        }
        if (!Number.isFinite(cell.x) || !Number.isFinite(cell.y)) {
          errors.push(`Cell "${cell.id || idx}" has invalid coordinates (x: ${cell.x}, y: ${cell.y}).`);
        }
        if (typeof cell.width === 'number' && (!Number.isFinite(cell.width) || cell.width <= 0)) {
          errors.push(`Cell "${cell.id || idx}" has invalid width (${cell.width}). Width must be positive.`);
        }
        if (typeof cell.height === 'number' && (!Number.isFinite(cell.height) || cell.height <= 0)) {
          errors.push(`Cell "${cell.id || idx}" has invalid height (${cell.height}). Height must be positive.`);
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    status: errors.length === 0 ? ARTIFACT_STATUS.READY : ARTIFACT_STATUS.INVALID_ARTIFACT,
    errors,
  };
}

/**
 * Validate that extracted measurements meet mandatory field requirements for a specific check.
 *
 * @param {string} checkId
 * @param {Object} measurements
 * @returns {{ isValid: boolean, missingFields: string[], errors: string[] }}
 */
export function validateMeasurementsForCheck(checkId, measurements) {
  const mandatory = CHECK_MANDATORY_FIELDS[checkId];
  if (!mandatory) {
    // If not in mandatory list, it's either PRACTICE_ONLY or unknown
    return { isValid: false, missingFields: [], errors: [`Check ${checkId} is not a certifiable check.`] };
  }

  if (!measurements || typeof measurements !== 'object') {
    return { isValid: false, missingFields: mandatory, errors: ['Measurements container is missing or invalid.'] };
  }

  const missingFields = [];
  const errors = [];

  for (const field of mandatory) {
    const val = measurements[field];
    if (val === undefined || val === null) {
      missingFields.push(field);
    } else if (typeof val === 'number') {
      if (!Number.isFinite(val)) {
        errors.push(`Field "${field}" is not a finite number.`);
      } else if (
        (field.includes('margin') ||
          field.includes('halo') ||
          field.includes('viaEnclosure') ||
          field.includes('droop') ||
          field.includes('leakage') ||
          field.includes('Congestion') ||
          field.includes('emptySites') ||
          field.includes('drcErrors') ||
          field.includes('baseDrcViolations') ||
          field.includes('shorts') ||
          field.includes('offRailCells') ||
          field.includes('glitchVoltage') ||
          field.includes('powerMw') ||
          field.includes('skewPs') ||
          field.includes('latencyPs')) &&
        val < 0
      ) {
        errors.push(`Field "${field}" must be non-negative (received: ${val}).`);
      }
    } else if (field === 'cells') {
      if (!Array.isArray(val) || val.length === 0) {
        errors.push(`Field "cells" must be a non-empty array.`);
      }
    } else if (field === 'wellContinuityMet' || field === 'lvsMatch') {
      if (typeof val !== 'boolean') {
        errors.push(`Field "${field}" must be a boolean.`);
      }
    }
  }

  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors,
  };
}
