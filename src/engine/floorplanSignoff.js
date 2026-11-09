/**
 * floorplanSignoff.js
 * ===================
 * Single source of truth for floorplan rule checking. Used by:
 *   - Floorplan Studio diagnostics panel (live violations list)
 *   - FP-24 capstone grading (evaluates the student's real Studio project)
 *   - FP-36 advanced SoC capstone grading
 *
 * Pure function: same project in → same report out. All units µm / µm² / mV.
 */

import {
  computeUtilization,
  checkMacroOverlap,
  checkMacroCoreContainment,
  checkPinSpacing,
  computeHPWL,
} from './floorplanGeometry.js';
import {
  detectOpenConnections,
  detectVDDVSSShort,
  detectMissingVias,
  computeIRDropEstimate,
  solveResistivePDN,
} from './floorplanPDN.js';
import { computeCongestionMap } from './floorplanCongestion.js';
import { validateProjectShape } from './floorplanProjectModel.js';

/**
 * @param {Object} project - FloorplanProject
 * @returns {{ clean: boolean, errorCount: number, warningCount: number, violations: Array, metrics: Object, analysis: Object }}
 */
export function evaluateFloorplanSignoff(project) {
  if (!project || !project.core || !project.die) {
    return {
      clean: false,
      errorCount: 1,
      warningCount: 0,
      violations: [{ rule: 'Project', severity: 'error', targetId: null, targetType: null, message: 'No floorplan project available.', suggestion: 'Open the Floorplan Studio and save a project.' }],
      metrics: { macroCount: 0 },
      analysis: null,
    };
  }

  const list = [];
  const macros = project.macros || [];
  const core = project.core;
  const constraints = project.constraints || {};

  // ── Structural Schema & Boundary Verification ───────────────────────────
  const schemaProblems = validateProjectShape(project);
  if (schemaProblems.length > 0) {
    schemaProblems.forEach((prob) => {
      list.push({
        rule: 'Project Schema DRC',
        severity: 'error',
        targetId: 'project',
        targetType: 'project',
        message: prob,
        suggestion: 'Correct project boundaries and entity definitions according to Schema v2 rules.',
      });
    });
  }

  // ── Macro-to-macro overlap and keepout halos ─────────────────────────────
  for (let i = 0; i < macros.length; i++) {
    for (let j = i + 1; j < macros.length; j++) {
      const m1 = macros[i];
      const m2 = macros[j];
      const r = checkMacroOverlap(m1, m2);
      if (r.overlaps) {
        list.push({
          rule: 'Macro Overlap (DRC)',
          severity: 'error',
          targetId: m1.id,
          targetType: 'macro',
          message: `Macro ${m1.name || m1.id} physically overlaps with ${m2.name || m2.id} (Area: ${r.overlapArea} µm²).`,
          suggestion: 'Move macros apart so they do not intersect.',
        });
      } else if (r.halosViolated) {
        list.push({
          rule: 'Placement Halo Keepout Violation',
          severity: 'warning',
          targetId: m1.id,
          targetType: 'macro',
          message: `Keepout halos between ${m1.id} and ${m2.id} overlap. Gap is ${Math.max(r.actualGapX, r.actualGapY)}µm, required: ${r.requiredSeparation}µm (haloA=${m1.halo} + haloB=${m2.halo}).`,
          suggestion: `Increase separation to at least ${r.requiredSeparation}µm for pin routing access.`,
        });
      }
    }

    const containment = checkMacroCoreContainment(macros[i], core);
    if (!containment.contained) {
      list.push({
        rule: 'Core Boundary DRC',
        severity: 'error',
        targetId: macros[i].id,
        targetType: 'macro',
        message: containment.violations[0] || `Macro ${macros[i].id} exceeds core boundary limits.`,
        suggestion: 'Position macro completely inside the core boundary.',
      });
    }
  }

  // ── I/O pin pitch and edge containment ──────────────────────────────────
  const minPinSpacing = constraints.minPinSpacing || 10;
  ['top', 'bottom', 'left', 'right'].forEach((side) => {
    const pinCheck = checkPinSpacing((project.pins || []).filter((p) => p.edge === side), side, minPinSpacing, core.width, core.height);
    pinCheck.violations.forEach((v) => {
      list.push({
        rule: v.pinB ? 'I/O Pin Pitch DRC' : 'I/O Pin Edge Range',
        severity: 'error',
        targetId: v.pinA,
        targetType: 'pin',
        message: v.message,
        suggestion: v.pinB
          ? `Increase spacing along the ${side} edge to at least ${v.requiredSpacing}µm.`
          : `Keep the pin coordinate between 0 and the core ${side === 'top' || side === 'bottom' ? 'width' : 'height'}.`,
      });
    });
  });

  // ── Power network ────────────────────────────────────────────────────────
  const openNets = detectOpenConnections(project.powerNetwork);
  const shorts = detectVDDVSSShort(project.powerNetwork);
  const missingVias = detectMissingVias(project.powerNetwork);
  const irDrop = solveResistivePDN(project.powerNetwork, project.techProfile, constraints, macros);

  [['VDD', openNets.vddOpen, openNets.vddDisconnectedLoads, 'ring_vdd', 'Power'],
    ['VSS', openNets.vssOpen, openNets.vssDisconnectedLoads, 'ring_vss', 'Ground']].forEach(([net, open, nodes, ringId, word]) => {
    if (!open) return;
    const ids = (nodes || []).map((n) => n.nodeId);
    list.push({
      rule: `${net} ${word} Continuity`,
      severity: 'error',
      targetId: ids[0] && ids[0] !== 'all' ? ids[0] : ringId,
      targetType: ids[0] && ids[0] !== 'all' ? 'strap' : 'ring',
      message: `${net} mesh has unreachable segments: ${ids.join(', ') || 'unknown'}.`,
      suggestion: `Add ${net} vias joining each listed strap to the ${net} ring on the correct metal layers.`,
    });
  });

  shorts.shorts.forEach((sh) => {
    list.push({
      rule: 'VDD/VSS Short',
      severity: 'error',
      targetId: sh.viaId || null,
      targetType: sh.viaId ? 'via' : null,
      message: sh.reason,
      suggestion: sh.viaId ? 'Remove the via, or move it onto metal of a single net.' : 'Move one of the shapes to another layer or location.',
    });
  });

  missingVias.details.forEach((d) => {
    list.push({
      rule: 'Missing Power Grid Via',
      severity: 'warning',
      targetId: d.strapId,
      targetType: 'strap',
      message: d.reason,
      suggestion: `Add an electrical via at intersection ${d.expectedViaLocation} between ${d.layers}.`,
      viaFix: {
        id: `via_${String(d.net).toLowerCase()}_${d.x}_${d.y}`,
        layer1: d.layer1 || 'M4',
        layer2: d.layer2 || 'M5',
        x: d.x,
        y: d.y,
        net: d.net,
      },
    });
  });

  // Static IR-drop budget and power network electrical integrity check
  const voltageBudget = Number(constraints.voltageDropBudgetMv) || 30;
  if (irDrop.valid === false && irDrop.evaluated === false) {
    list.push({
      rule: 'Power Grid Unmodeled',
      severity: 'error',
      targetId: 'powerNetwork',
      targetType: 'power',
      message: irDrop.reason || 'Power distribution network is not properly modeled.',
      suggestion: 'Synthesize or route VDD and VSS power rings and straps with valid supply pads.',
    });
  } else if (irDrop.hasShortCircuit) {
    list.push({
      rule: 'VDD/VSS Short Circuit',
      severity: 'error',
      targetId: 'powerNetwork',
      targetType: 'power',
      message: irDrop.reason || 'Catastrophic VDD to VSS short circuit detected.',
      suggestion: 'Remove intersecting vias or separate VDD and VSS metal conductors.',
    });
  } else if (irDrop.hasMissingSupply) {
    list.push({
      rule: 'Incomplete Supply Topology',
      severity: 'error',
      targetId: 'powerNetwork',
      targetType: 'power',
      message: irDrop.reason || 'Both VDD and VSS power networks must be modeled.',
      suggestion: 'Add missing power or ground rings and straps.',
    });
  } else if (irDrop.hasOpenCircuit) {
    list.push({
      rule: 'Power Grid Open Circuit',
      severity: 'error',
      targetId: 'ring_vdd',
      targetType: 'ring',
      message: 'One or more loads/straps have no electrical connection to power sources (open circuit).',
      suggestion: 'Add power straps or feed vias to connect floating nodes to the power ring.',
    });
  } else if (typeof irDrop.worstDropMv === 'number' && irDrop.worstDropMv > voltageBudget) {
    list.push({
      rule: 'Power Grid Static IR Drop',
      severity: 'warning',
      targetId: 'ring_vdd',
      targetType: 'ring',
      message: `Worst modeled nodal IR drop (${irDrop.worstDropMv.toFixed(1)} mV) exceeds the ${voltageBudget} mV budget.`,
      suggestion: 'Add parallel power straps or feed vias to reduce grid impedance.',
    });
  }

  if (irDrop.hasOrphanLoads && irDrop.orphanLoads) {
    irDrop.orphanLoads.forEach((ol) => {
      list.push({
        rule: 'Orphan Load Reference',
        severity: 'error',
        targetId: ol.loadId,
        targetType: 'load',
        message: ol.reason,
        suggestion: 'Connect load to an existing strap or ring ID.',
      });
    });
  }

  if (irDrop.invalidVias && irDrop.invalidVias.length > 0) {
    irDrop.invalidVias.forEach((iv) => {
      list.push({
        rule: 'Floating Power Grid Via',
        severity: 'error',
        targetId: iv.viaId,
        targetType: 'via',
        message: iv.reason,
        suggestion: 'Ensure the via physically lands on metal on both designated layers.',
      });
    });
  }

  // ── Area budget ──────────────────────────────────────────────────────────
  const utilization = computeUtilization(core.width * core.height, project.standardCellAreaUm2, macros, project.blockages, core);
  const maxUtil = Number(constraints.maxUtilization) || 100;
  if (utilization.rawNominalUtilization > maxUtil) {
    list.push({
      rule: 'Utilization Budget',
      severity: 'error',
      targetId: 'core',
      targetType: 'core',
      message: `Nominal utilization ${utilization.rawNominalUtilization}% exceeds the ${maxUtil}% budget.`,
      suggestion: 'Enlarge the core or reduce macro / standard-cell area.',
    });
  }
  if (utilization.effectiveUtilization > 100) {
    list.push({
      rule: 'Placeable Area Exhausted',
      severity: 'error',
      targetId: 'core',
      targetType: 'core',
      message: `Standard cells need ${utilization.stdCellArea} µm² but only ${utilization.placeableArea ?? utilization.routableArea} µm² is placeable after macros, halos and blockages.`,
      suggestion: 'Reduce halos/blockages or enlarge the core.',
    });
  }

  const hpwl = computeHPWL(project.nets, macros, project.pins, core, project.die);
  const congestion = computeCongestionMap(project, 8, 8);

  // Critical routing track overflow check
  if (congestion.maxRatio >= 1.0) {
    list.push({
      rule: 'Routing Channel Congestion Overflow',
      severity: 'warning',
      targetId: null,
      targetType: 'congestion',
      message: `Critical routing track overflow detected (Worst ratio: ${congestion.maxRatio}).`,
      suggestion: 'Spread macros apart or remove channel blockages to relieve wire demand.',
    });
  }

  const errorCount = list.filter((v) => v.severity === 'error').length;
  const warningCount = list.length - errorCount;

  return {
    clean: list.length === 0,
    errorCount,
    warningCount,
    violations: list,
    metrics: {
      macroCount: macros.length,
      pinCount: (project.pins || []).length,
      nominalUtilization: utilization.rawNominalUtilization,
      effectiveUtilization: utilization.effectiveUtilization,
      totalHPWL: hpwl.totalHPWL,
      maxIRDropMv: irDrop.maxDropMv,
      irDropOpen: irDrop.hasOpenLoad,
      maxCongestionRatio: congestion.maxRatio,
    },
    analysis: { utilization, hpwl, pdn: { openNets, shorts, missingVias, irDrop }, congestion },
  };
}
