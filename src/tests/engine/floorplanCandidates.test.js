/**
 * floorplanCandidates.test.js
 * ===========================
 * Unit tests for candidate snapshotting, multi-design comparison matrix,
 * and Pareto trade-off frontier calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  createCandidateSnapshot,
  compareCandidates,
  findParetoFrontier,
} from '../../engine/floorplanCandidates.js';
import {
  createDefaultProject,
  SCENARIO_SIMPLE_CONTROL,
  SCENARIO_DUAL_SRAM,
  SCENARIO_FOUR_MACRO,
  SCENARIO_SMALL_SOC,
} from '../../engine/floorplanProjectModel.js';

describe('floorplanCandidates Engine', () => {
  it('creates an immutable candidate snapshot with evaluated metrics', () => {
    const snap = createCandidateSnapshot(SCENARIO_SIMPLE_CONTROL, 'Candidate Alpha');
    expect(snap.id).toBeDefined();
    expect(snap.name).toBe('Candidate Alpha');
    expect(snap.metrics.dieArea).toBe(360 * 280);
    expect(snap.metrics.coreArea).toBe(300 * 220);
    expect(snap.metrics.macroCount).toBe(1);
    expect(snap.metrics.totalHPWL).toBeGreaterThan(0);
    expect(Number.isFinite(snap.metrics.worstIRDropMv)).toBe(true);
    expect(snap.metrics.isClean).toBe(true);
  });

  it('compares multiple candidate designs in a structured comparison table', () => {
    const candA = createCandidateSnapshot(SCENARIO_SIMPLE_CONTROL, 'Design A (Small)');
    const candB = createCandidateSnapshot(SCENARIO_FOUR_MACRO, 'Design B (Quad-Macro)');

    const comparison = compareCandidates([candA, candB]);
    expect(comparison.candidates.length).toBe(2);
    expect(comparison.rows.length).toBeGreaterThan(5);

    const dieAreaRow = comparison.rows.find((r) => r.key === 'dieArea');
    expect(dieAreaRow).toBeDefined();
    expect(dieAreaRow.values[0]).toBe(candA.metrics.dieArea);
    expect(dieAreaRow.values[1]).toBe(candB.metrics.dieArea);
    expect(dieAreaRow.bestIndex).toBe(0); // Smaller area is better
  });

  it('correctly calculates non-dominated Pareto frontier', () => {
    // Synthetic candidate test data:
    // Cand1: HPWL=100, IR=10 (Pareto optimal)
    // Cand2: HPWL=80, IR=20 (Pareto optimal)
    // Cand3: HPWL=120, IR=30 (Strictly dominated by Cand1 and Cand2)
    const mockCandidates = [
      { id: 'cand_1', metrics: { totalHPWL: 100, worstIRDropMv: 10 } },
      { id: 'cand_2', metrics: { totalHPWL: 80, worstIRDropMv: 20 } },
      { id: 'cand_3', metrics: { totalHPWL: 120, worstIRDropMv: 30 } },
    ];

    const frontier = findParetoFrontier(mockCandidates, ['totalHPWL', 'worstIRDropMv']);
    expect(frontier).toContain('cand_1');
    expect(frontier).toContain('cand_2');
    expect(frontier).not.toContain('cand_3');
  });
});
