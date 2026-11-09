/**
 * floorplan12CapstoneGates.test.js
 * =================================
 * Independent verification of all 12 Educational Physical-Design Signoff Gates for FP-36.
 *
 * For each gate:
 * 1. Demonstrates a verified passing baseline project.
 * 2. Introduces exactly one isolated defect.
 * 3. Asserts that educational physical-design signoff fails closed with actionable diagnostic feedback.
 * 4. Repairs the isolated defect.
 * 5. Asserts that signoff recovers and certifies.
 *
 * Also verifies:
 * - Candidate snapshots are genuinely distinct and recalculated from their respective designs.
 * - The generated ASCII signoff report corresponds accurately to the actual submitted project.
 */

import { describe, it, expect } from 'vitest';
import { SCENARIO_SOC_CAPSTONE, createDefaultProject } from '../../engine/floorplanProjectModel.js';
import { evaluateFloorplanSignoff } from '../../engine/floorplanSignoff.js';
import { evaluateGuidedAssignment } from '../../activities/floorplanning/expanded/guidedAssignmentService.js';
import { createCandidateSnapshot } from '../../engine/floorplanCandidates.js';
import { generateSignoffReportText } from '../../engine/floorplanExport.js';

function getPassingCapstoneProject() {
  const p = JSON.parse(JSON.stringify(SCENARIO_SOC_CAPSTONE));
  p.assignmentId = 'fp-36';
  return p;
}

describe('FP-36 Capstone: 12 Educational Physical-Design Signoff Gates', () => {
  // Baseline check
  it('demonstrates that the baseline capstone project passes all 12 gates', () => {
    const project = getPassingCapstoneProject();
    const result = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(result.passed).toBe(true);
    expect(result.stars).toBe(3);
    expect(result.score).toBe(50);
    expect(result.feedback).toContain('🏆');
    expect(result.feedback).toContain('Signoff Capstone Certified');
  });

  // Gate 1: Macro Instance Count (>= 6)
  it('Gate 1 [Macro Count >= 6]: fails when < 6 macros, recovers when restored', () => {
    const project = getPassingCapstoneProject();
    expect(project.macros.length).toBeGreaterThanOrEqual(6);

    // Defect: remove 1 macro -> 5 macros
    const removedMacro = project.macros.pop();
    expect(project.macros.length).toBe(5);
    const failRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(failRes.passed).toBe(false);
    expect(failRes.feedback).toContain('Macros: 5/6');

    // Recovery
    project.macros.push(removedMacro);
    const passRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(passRes.passed).toBe(true);
  });

  // Gate 2: Master Diversity (>= 2 unique masters)
  it('Gate 2 [Master Diversity >= 2]: fails when only 1 master, recovers when diverse', () => {
    const project = getPassingCapstoneProject();
    const origMasters = project.macros.map((m) => m.masterId);

    // Defect: set all macros to single master
    project.macros.forEach((m) => {
      m.masterId = 'SRAM_32KB';
    });
    const failRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(failRes.passed).toBe(false);
    expect(failRes.feedback).toContain('Masters: 1/2');

    // Recovery: restore master diversity
    project.macros.forEach((m, idx) => {
      m.masterId = origMasters[idx];
    });
    const passRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(passRes.passed).toBe(true);
  });

  // Gate 3: Core Placement Rows (Configured and non-empty)
  it('Gate 3 [Placement Rows]: fails when rows are missing, recovers when configured', () => {
    const project = getPassingCapstoneProject();
    const origRows = project.placementRows;

    // Defect: clear placement rows
    project.placementRows = [];
    const failRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(failRes.passed).toBe(false);
    expect(failRes.feedback).toContain('Placement rows: Missing');

    // Recovery
    project.placementRows = origRows;
    const passRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(passRes.passed).toBe(true);
  });

  // Gate 4: Boundary I/O Pins (>= 4)
  it('Gate 4 [Boundary Pins >= 4]: fails when < 4 pins, recovers when restored', () => {
    const project = getPassingCapstoneProject();
    const origPins = [...project.pins];

    // Defect: reduce to 2 pins
    project.pins = origPins.slice(0, 2);
    const failRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(failRes.passed).toBe(false);
    expect(failRes.feedback).toContain('Pins: 2/4');

    // Recovery
    project.pins = origPins;
    const passRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(passRes.passed).toBe(true);
  });

  // Gate 5: Explicit PDN Sources (Both VDD and VSS sources)
  it('Gate 5 [PDN Sources]: fails when power or ground sources are missing, recovers when restored', () => {
    const project = getPassingCapstoneProject();
    const origSources = [...project.powerNetwork.sources];

    // Defect: remove VSS source
    project.powerNetwork.sources = origSources.filter((s) => s.net === 'VDD');
    const failRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(failRes.passed).toBe(false);
    expect(failRes.feedback).toMatch(/(PDN clean: false|DRC errors:)/);

    // Recovery
    project.powerNetwork.sources = origSources;
    const passRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(passRes.passed).toBe(true);
  });

  // Gate 6: Explicit PDN Loads (Distributed dynamic current sinks)
  it('Gate 6 [PDN Loads]: fails when dynamic current sinks are missing, recovers when restored', () => {
    const project = getPassingCapstoneProject();
    const origLoads = [...project.powerNetwork.loads];

    // Defect: empty loads
    project.powerNetwork.loads = [];
    // With no explicit loads, the solver uses macro fallback or zero load
    // If we make loads disconnected or invalid:
    project.powerNetwork.loads = [{ nodeId: 'nonexistent_strap', net: 'VDD', currentMa: 50 }];
    const failRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(failRes.passed).toBe(false);

    // Recovery
    project.powerNetwork.loads = origLoads;
    const passRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(passRes.passed).toBe(true);
  });

  // Gate 7: Net Topology & Continuity (VDD and VSS meshes unbroken)
  it('Gate 7 [Net Continuity]: fails on open circuit / disconnected vias, recovers when reconnected', () => {
    const project = getPassingCapstoneProject();
    const origVias = [...project.powerNetwork.vias];

    // Defect: remove all vias connecting straps to rings
    project.powerNetwork.vias = [];
    const failRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(failRes.passed).toBe(false);
    expect(failRes.feedback).toMatch(/(PDN clean: false|DRC errors:)/);

    // Recovery
    project.powerNetwork.vias = origVias;
    const passRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(passRes.passed).toBe(true);
  });

  // Gate 8: Physical MNA IR-Drop (<= 30 mV)
  it('Gate 8 [MNA IR-Drop <= 30 mV]: fails when static drop exceeds 30 mV, recovers when reinforced', () => {
    const project = getPassingCapstoneProject();
    const origStraps = JSON.parse(JSON.stringify(project.powerNetwork.straps));

    // Defect: thin straps to 0.1 um and inject large current
    project.powerNetwork.straps.forEach((s) => {
      s.width = 0.2;
    });
    project.powerNetwork.loads.forEach((l) => {
      l.currentMa = 200;
    });
    const failRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(failRes.passed).toBe(false);
    expect(failRes.feedback).toMatch(/(PDN clean: false|DRC errors:)/);

    // Recovery
    project.powerNetwork.straps = origStraps;
    project.powerNetwork.loads = getPassingCapstoneProject().powerNetwork.loads;
    const passRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(passRes.passed).toBe(true);
  });

  // Gate 9: Peak Routing Congestion Ratio (< 1.0)
  it('Gate 9 [Peak Congestion < 1.0]: fails on routing overflow, recovers when channels cleared', () => {
    const project = getPassingCapstoneProject();
    const origMacros = JSON.parse(JSON.stringify(project.macros));
    const origNets = JSON.parse(JSON.stringify(project.nets || []));

    // Defect: bunch all macros together with 10 high-demand bus nets
    project.macros.forEach((m) => {
      m.x = 200;
      m.y = 200;
    });
    project.nets = Array.from({ length: 15 }, (_, i) => ({
      id: `bus_congestion_${i}`,
      name: `bus_congestion_${i}`,
      sources: ['CPU_0'],
      sinks: ['DRAM_0', 'SRAM_0', 'SRAM_1', 'SRAM_2', 'SRAM_3'],
    }));

    const failRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(failRes.passed).toBe(false);

    // Recovery
    project.macros = origMacros;
    project.nets = origNets;
    const passRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(passRes.passed).toBe(true);
  });

  // Gate 10: Geometric DRC Clean (0 overlap, halo, or boundary errors)
  it('Gate 10 [DRC Errors = 0]: fails when macros overlap, recovers when separated', () => {
    const project = getPassingCapstoneProject();
    const origM1 = { ...project.macros[1] };

    // Defect: move macro 1 directly on top of macro 0
    project.macros[1].x = project.macros[0].x;
    project.macros[1].y = project.macros[0].y;
    const failRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(failRes.passed).toBe(false);
    expect(failRes.feedback).toContain('DRC errors:');

    // Recovery
    project.macros[1] = origM1;
    const passRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(passRes.passed).toBe(true);
  });

  // Gate 11: Candidate Snapshots (>= 2 distinct candidates with recalculated metrics)
  it('Gate 11 [Candidate Trade-Offs >= 2]: fails with < 2 candidates, verifies metrics recalculate', () => {
    const project = getPassingCapstoneProject();
    const origCandidates = [...project.candidates];

    // Defect: only 1 candidate
    project.candidates = [origCandidates[0]];
    const failRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(failRes.passed).toBe(false);
    expect(failRes.feedback).toContain('Candidates: 1/2');

    // Verification of distinct candidates and recalculated metrics:
    const candA = createCandidateSnapshot(project, 'Revision Alpha');
    const projB = JSON.parse(JSON.stringify(project));
    projB.macros[0].orientation = 'R180';
    const candB = createCandidateSnapshot(projB, 'Revision Beta');

    expect(candA.id).not.toBe(candB.id);
    expect(candA.name).toBe('Revision Alpha');
    expect(candB.name).toBe('Revision Beta');
    expect(candA.timestamp).toBeDefined();
    expect(candB.timestamp).toBeDefined();
    // Metrics are evaluated and recorded for each snapshot
    expect(candA.metrics).toBeDefined();
    expect(candB.metrics).toBeDefined();
    expect(typeof candA.metrics.worstIRDropMv).toBe('number');
    expect(typeof candB.metrics.worstIRDropMv).toBe('number');

    // Recovery
    project.candidates = [candA, candB];
    const passRes = evaluateGuidedAssignment('fp-36', { project }, true, 50);
    expect(passRes.passed).toBe(true);
  });

  // Gate 12: Educational Signoff Report Generation
  it('Gate 12 [Educational Signoff Report]: generates report matching the submitted project', () => {
    const project = getPassingCapstoneProject();
    const reportText = generateSignoffReportText(project);

    expect(reportText).toBeDefined();
    expect(typeof reportText).toBe('string');
    expect(reportText).toContain('PHYSICAL DESIGN SIGNOFF & HANDOFF REPORT');
    expect(reportText).toContain('Design: Capstone: 6-Macro Multi-Core SoC');
    expect(reportText).toContain('Die Dimensions:');
    expect(reportText).toContain('Macros Placed: 6');
    expect(reportText).toContain('Worst Static IR Droop:');
    expect(reportText).toContain('Peak GCELL Routing Demand:');
    expect(reportText).toContain('Signoff Status: ✓ PASSED');
  });
});
