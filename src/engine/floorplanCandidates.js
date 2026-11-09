/**
 * floorplanCandidates.js
 * =======================
 * Pure deterministic multi-candidate comparison, tradeoff analysis, and Pareto frontier engine.
 * Enables students to save, compare, and optimize alternative floorplanning strategies.
 */

import { computeCoreArea, computeUtilization, computeHPWL } from './floorplanGeometry.js';
import { solveResistivePDN } from './floorplanPDN.js';
import { computeCongestionMap } from './floorplanCongestion.js';
import { evaluateFloorplanSignoff } from './floorplanSignoff.js';

/**
 * Creates a lightweight, immutable snapshot of a candidate design for comparison.
 *
 * @param {Object} project - FloorplanProject
 * @param {string} candidateName - Display name for candidate
 * @returns {Object} Candidate snapshot
 */
export function createCandidateSnapshot(project, candidateName = 'Candidate') {
  if (!project || !project.core || !project.die) {
    throw new Error('Cannot create candidate snapshot from invalid project');
  }

  const signoff = evaluateFloorplanSignoff(project);
  const core = project.core;
  const die = project.die;
  const coreArea = core.width * core.height;
  const dieArea = die.width * die.height;

  const util = computeUtilization(coreArea, project.standardCellAreaUm2, project.macros, project.blockages, core);
  const hpwl = computeHPWL(project.nets, project.macros, project.pins, core, die);
  const irDrop = solveResistivePDN(project.powerNetwork, project.techProfile, project.constraints, project.macros);
  const congestion = computeCongestionMap(project);

  return {
    id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: candidateName,
    timestamp: new Date().toISOString(),
    metrics: {
      dieArea: Number(dieArea.toFixed(2)),
      coreArea: Number(coreArea.toFixed(2)),
      aspectRatio: Number((core.height / core.width).toFixed(3)),
      macroCount: (project.macros || []).length,
      pinCount: (project.pins || []).length,
      nominalUtilization: util.nominalUtilization,
      rawNominalUtilization: util.rawNominalUtilization,
      effectiveUtilization: util.effectiveUtilization,
      totalHPWL: hpwl.totalHPWL,
      worstIRDropMv: irDrop.worstDropMv !== null && Number.isFinite(irDrop.worstDropMv) ? Number(irDrop.worstDropMv.toFixed(2)) : null,
      irHasOpenLoad: irDrop.hasOpenLoad,
      maxCongestionRatio: congestion.maxRatio,
      congestionHotspots: congestion.hotspots.length,
      errorCount: signoff.errorCount,
      warningCount: signoff.warningCount,
      isClean: signoff.clean,
    },
    projectData: JSON.parse(JSON.stringify(project)),
  };
}

/**
 * Compares a list of candidate snapshots and produces a structured comparison table.
 *
 * @param {Array<Object>} candidates - List of candidate snapshots
 * @returns {Object} Comparison report
 */
export function compareCandidates(candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      candidates: [],
      rows: [],
      paretoFrontierIds: [],
      summary: 'No candidates provided for comparison.',
    };
  }

  // Row definition for quantitative metrics table
  const rows = [
    { key: 'dieArea', label: 'Die Area', unit: 'µm²', lowerIsBetter: true },
    { key: 'coreArea', label: 'Core Area', unit: 'µm²', lowerIsBetter: true },
    { key: 'aspectRatio', label: 'Aspect Ratio (H/W)', unit: '', lowerIsBetter: false },
    { key: 'macroCount', label: 'Macro Count', unit: '', lowerIsBetter: false },
    { key: 'nominalUtilization', label: 'Nominal Utilization', unit: '%', lowerIsBetter: false },
    { key: 'effectiveUtilization', label: 'Effective Placement Util', unit: '%', lowerIsBetter: false },
    { key: 'totalHPWL', label: 'Total Interconnect HPWL', unit: 'µm', lowerIsBetter: true },
    { key: 'worstIRDropMv', label: 'Worst Static IR Drop', unit: 'mV', lowerIsBetter: true },
    { key: 'maxCongestionRatio', label: 'Worst Congestion Ratio', unit: '', lowerIsBetter: true },
    { key: 'congestionHotspots', label: 'Congestion Hotspots (≥0.8)', unit: 'bins', lowerIsBetter: true },
    { key: 'errorCount', label: 'DRC Errors', unit: 'violations', lowerIsBetter: true },
    { key: 'warningCount', label: 'DRC Warnings', unit: 'violations', lowerIsBetter: true },
  ];

  // Populate comparison rows with delta relative to first candidate
  const evaluatedRows = rows.map((r) => {
    const values = candidates.map((c) => {
      const m = c.metrics || c;
      const v = m ? m[r.key] : null;
      return v !== undefined ? v : null;
    });
    const baseline = values[0];

    const deltas = values.map((val) => {
      if (val === null || baseline === null || typeof val !== 'number' || typeof baseline !== 'number') {
        return null;
      }
      return Number((val - baseline).toFixed(2));
    });

    // Best value determination
    let bestIdx = -1;
    if (r.lowerIsBetter) {
      const validNums = values.map((v, i) => ({ v, i })).filter((item) => typeof item.v === 'number' && !isNaN(item.v));
      if (validNums.length > 0) {
        validNums.sort((a, b) => a.v - b.v);
        bestIdx = validNums[0].i;
      }
    }

    return {
      ...r,
      values,
      deltas,
      bestIndex: bestIdx,
    };
  });

  // Calculate Pareto Frontier across HPWL vs IR-Drop vs Area
  const paretoFrontierIds = findParetoFrontier(candidates, ['totalHPWL', 'worstIRDropMv', 'coreArea']);

  return {
    candidates: candidates.map((c) => ({ id: c.id, name: c.name, timestamp: c.timestamp })),
    rows: evaluatedRows,
    paretoFrontierIds,
    summary: `Compared ${candidates.length} candidates. ${paretoFrontierIds.length} candidate(s) reside on the non-dominated Pareto frontier.`,
  };
}

/**
 * Computes non-dominated Pareto frontier across specified minimization objectives.
 *
 * @param {Array<Object>} candidates
 * @param {Array<string>} objectives - Metric keys to minimize (e.g. ['totalHPWL', 'worstIRDropMv'])
 * @returns {Array<string>} Candidate IDs on Pareto frontier
 */
export function findParetoFrontier(candidates, objectives = ['totalHPWL', 'worstIRDropMv']) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  if (candidates.length === 1) return [candidates[0].id];

  const frontier = [];

  for (let i = 0; i < candidates.length; i++) {
    const candA = candidates[i];
    let isDominated = false;

    for (let j = 0; j < candidates.length; j++) {
      if (i === j) continue;
      const candB = candidates[j];

      // B dominates A if B is <= A on all objectives AND strictly < A on at least one objective
      let atLeastAsGoodOnAll = true;
      let strictlyBetterOnOne = false;

      for (const obj of objectives) {
        const mA = candA.metrics || candA;
        const mB = candB.metrics || candB;
        const valA = mA && mA[obj] !== undefined ? mA[obj] : null;
        const valB = mB && mB[obj] !== undefined ? mB[obj] : null;

        if (valA === null || valB === null) {
          // Incomplete data cannot dominate
          atLeastAsGoodOnAll = false;
          break;
        }

        if (valB > valA) {
          atLeastAsGoodOnAll = false;
          break;
        }
        if (valB < valA) {
          strictlyBetterOnOne = true;
        }
      }

      if (atLeastAsGoodOnAll && strictlyBetterOnOne) {
        isDominated = true;
        break;
      }
    }

    if (!isDominated) {
      frontier.push(candA.id);
    }
  }

  return frontier;
}
