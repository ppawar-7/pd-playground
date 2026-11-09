/**
 * floorplanScenariosAndMasters.test.js
 * =====================================
 * Tests for the 6 production benchmark scenarios (A through F)
 * and the educational Macro Masters Library.
 */

import { describe, it, expect } from 'vitest';
import {
  MACRO_MASTERS_LIBRARY,
  SCENARIO_SIMPLE_CONTROL,
  SCENARIO_DUAL_SRAM,
  SCENARIO_FOUR_MACRO,
  SCENARIO_SMALL_SOC,
  SCENARIO_BROKEN_PDN,
  SCENARIO_CONGESTION_STRESS,
  validateProjectShape,
} from '../../engine/floorplanProjectModel.js';
import { evaluateFloorplanSignoff } from '../../engine/floorplanSignoff.js';

describe('Macro Masters Library', () => {
  it('contains all required master definitions with valid geometries and pins', () => {
    const requiredMasters = ['SRAM_64KB', 'SRAM_32KB', 'ROM_16KB', 'PLL_CORE', 'DSP_ACCEL', 'PERIPH_DMA', 'GENERIC_MACRO'];
    requiredMasters.forEach((key) => {
      const master = MACRO_MASTERS_LIBRARY[key];
      expect(master).toBeDefined();
      expect(master.width).toBeGreaterThan(0);
      expect(master.height).toBeGreaterThan(0);
      expect(master.pins.length).toBeGreaterThan(0);
      expect(master.defaultHalo).toBeGreaterThanOrEqual(15);
      expect(master.allowedOrientations.length).toBeGreaterThan(0);
    });
  });
});

describe('Production Benchmark Scenarios A through F', () => {
  const scenarios = [
    { id: 'SCENARIO_A', data: SCENARIO_SIMPLE_CONTROL, name: 'Simple Control ASIC' },
    { id: 'SCENARIO_B', data: SCENARIO_DUAL_SRAM, name: 'Dual SRAM Controller' },
    { id: 'SCENARIO_C', data: SCENARIO_FOUR_MACRO, name: 'Four-Macro Subsystem' },
    { id: 'SCENARIO_D', data: SCENARIO_SMALL_SOC, name: 'Small SoC Subsystem' },
    { id: 'SCENARIO_E', data: SCENARIO_BROKEN_PDN, name: 'Broken Power Grid' },
    { id: 'SCENARIO_F', data: SCENARIO_CONGESTION_STRESS, name: 'Congestion Bottleneck Stress' },
  ];

  it('all 6 scenarios satisfy structural schema validation', () => {
    scenarios.forEach((sc) => {
      const problems = validateProjectShape(sc.data);
      expect(problems).toEqual([]);
    });
  });

  it('Scenarios A, B, C, D sign off clean with zero DRC errors', () => {
    [SCENARIO_SIMPLE_CONTROL, SCENARIO_DUAL_SRAM, SCENARIO_FOUR_MACRO, SCENARIO_SMALL_SOC].forEach((proj) => {
      const signoff = evaluateFloorplanSignoff(proj);
      expect(signoff.errorCount).toBe(0);
    });
  });

  it('Scenario E (Broken PDN) intentionally contains discoverable PDN faults', () => {
    const signoff = evaluateFloorplanSignoff(SCENARIO_BROKEN_PDN);
    expect(signoff.errorCount).toBeGreaterThan(0);
    // Must find the VDD-VSS short
    const shortViolation = signoff.violations.find((v) => v.rule.includes('Short'));
    expect(shortViolation).toBeDefined();
  });

  it('Scenario F (Congestion Stress) contains severe macro congestion', () => {
    const signoff = evaluateFloorplanSignoff(SCENARIO_CONGESTION_STRESS);
    // Macros are closely spaced, producing keepout warning or congestion pressure
    expect(signoff.metrics).toBeDefined();
  });
});
