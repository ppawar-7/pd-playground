/**
 * floorplanNodalPDN.test.js
 * =========================
 * Rigorous mathematical and numerical validation of the Modified Nodal Analysis (MNA)
 * Conductance Matrix PDN solver against closed-form analytical circuit solutions.
 */

import { describe, it, expect } from 'vitest';
import { solveMNA, solveResistivePDN } from '../../engine/floorplanPDN.js';

describe('Nodal Resistive PDN Solver — Mathematical & Analytical Verification', () => {
  describe('solveMNA Pure Mathematical Linear Circuit Solver', () => {
    it('solves simple 2-node single-resistor circuit matching exact Ohm Law V = I * R', () => {
      // Node 0: Dirichlet 1.200 V (Fixed Power Pad)
      // Node 1: Current Sink -10 mA (-0.010 A)
      // Branch 0-1: R = 2.500 Ohms
      // Expected Voltage Drop: ΔV = I * R = 0.010 A * 2.500 Ω = 0.025 V = 25.0 mV
      // Expected Node 1 Voltage: 1.200 - 0.025 = 1.175 V
      const nodes = [{ id: 0 }, { id: 1 }];
      const branches = [{ u: 0, v: 1, r: 2.5 }];
      const dirichlet = { 0: 1.2 };
      const neumann = { 1: -0.010 };

      const result = solveMNA(nodes, branches, dirichlet, neumann);
      expect(result.isSingular).toBe(false);
      expect(result.disconnectedNodes.length).toBe(0);
      expect(result.voltages[0]).toBeCloseTo(1.200, 6);
      expect(result.voltages[1]).toBeCloseTo(1.175, 6);
      const dropMv = (1.200 - result.voltages[1]) * 1000;
      expect(dropMv).toBeCloseTo(25.0, 4);
      expect(result.maxResidual).toBeLessThan(1e-5);
    });

    it('solves parallel resistor network matching equivalent resistance R_eq = R1 || R2', () => {
      // Node 0: Dirichlet 1.200 V
      // Branch 0-1 (Path A): R1 = 10.0 Ω
      // Branch 0-1 (Path B): R2 = 10.0 Ω
      // Parallel equivalent R_eq = (10 * 10) / (10 + 10) = 5.0 Ω
      // Node 1: Current sink -20 mA (-0.020 A)
      // Expected ΔV = 20 mA * 5.0 Ω = 100 mV
      // Expected Node 1 Voltage: 1.200 - 0.100 = 1.100 V
      const nodes = [{ id: 0 }, { id: 1 }];
      const branches = [
        { u: 0, v: 1, r: 10.0 },
        { u: 0, v: 1, r: 10.0 },
      ];
      const dirichlet = { 0: 1.2 };
      const neumann = { 1: -0.020 };

      const result = solveMNA(nodes, branches, dirichlet, neumann);
      expect(result.voltages[0]).toBeCloseTo(1.200, 6);
      expect(result.voltages[1]).toBeCloseTo(1.100, 6);
      const dropMv = (1.200 - result.voltages[1]) * 1000;
      expect(dropMv).toBeCloseTo(100.0, 4);
    });

    it('solves 3-node resistor ladder network matching KCL current summation at all nodes', () => {
      // Node 0: Dirichlet 1.200 V
      // Node 1: Sink -5 mA (-0.005 A), Branch 0-1 R = 2.0 Ω
      // Node 2: Sink -10 mA (-0.010 A), Branch 1-2 R = 1.0 Ω
      // Analytical derivation:
      // Current through branch 1-2: I_12 = 10 mA -> ΔV_12 = 10 mA * 1.0 Ω = 10 mV
      // Current through branch 0-1: I_01 = 5 mA + 10 mA = 15 mA -> ΔV_01 = 15 mA * 2.0 Ω = 30 mV
      // Node 1 voltage: 1.200 - 0.030 = 1.170 V (30 mV drop)
      // Node 2 voltage: 1.170 - 0.010 = 1.160 V (40 mV drop)
      const nodes = [{ id: 0 }, { id: 1 }, { id: 2 }];
      const branches = [
        { u: 0, v: 1, r: 2.0 },
        { u: 1, v: 2, r: 1.0 },
      ];
      const dirichlet = { 0: 1.2 };
      const neumann = { 1: -0.005, 2: -0.010 };

      const result = solveMNA(nodes, branches, dirichlet, neumann);
      expect(result.voltages[0]).toBeCloseTo(1.200, 6);
      expect(result.voltages[1]).toBeCloseTo(1.170, 6);
      expect(result.voltages[2]).toBeCloseTo(1.160, 6);
    });

    it('identifies disconnected nodes and flags open circuit', () => {
      // Node 0: Dirichlet 1.2V
      // Node 1: Connected to Node 0 with R = 2.0 Ω
      // Node 2: Completely disconnected island with load -10 mA
      const nodes = [{ id: 0 }, { id: 1 }, { id: 2 }];
      const branches = [{ u: 0, v: 1, r: 2.0 }];
      const dirichlet = { 0: 1.2 };
      const neumann = { 2: -0.010 };

      const result = solveMNA(nodes, branches, dirichlet, neumann);
      expect(result.isSingular).toBe(true);
      expect(result.disconnectedNodes).toContain(2);
    });
  });

  describe('solveResistivePDN Full Layout Mesh Integration', () => {
    it('solves realistic orthogonal strap network with vias and power rings', () => {
      const pdn = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 360, height: 260, lineWidth: 6 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 380, height: 280, lineWidth: 6 },
        ],
        straps: [
          { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 20, y1: 150, x2: 380, y2: 150, width: 4 },
          { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 10, y1: 180, x2: 390, y2: 180, width: 4 },
        ],
        vias: [
          { id: 'v1', layer1: 'M4', layer2: 'M5', x: 20, y: 150, net: 'VDD' },
          { id: 'v2', layer1: 'M4', layer2: 'M5', x: 380, y: 150, net: 'VDD' },
          { id: 'v3', layer1: 'M4', layer2: 'M5', x: 10, y: 180, net: 'VSS' },
          { id: 'v4', layer1: 'M4', layer2: 'M5', x: 390, y: 180, net: 'VSS' },
        ],
        sources: [
          { nodeId: 'ring_vdd', net: 'VDD' },
          { nodeId: 'ring_vss', net: 'VSS' },
        ],
        loads: [
          { nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 15 },
          { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 15 },
        ],
      };

      const result = solveResistivePDN(pdn, { nominalVoltage: 1.2, voltageDropBudgetMv: 30 });
      expect(result.valid).toBe(true);
      expect(result.hasOpenCircuit).toBe(false);
      expect(result.meetsBudget).toBe(true);
      expect(result.worstDropMv).toBeGreaterThan(0);
      expect(result.worstDropMv).toBeLessThanOrEqual(30);
      expect(result.solverMethod).toContain('Modified Nodal Analysis (MNA)');
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('preserves legitimate zero-current values without substituting default 15 mA', () => {
      const pdn = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 360, height: 260, lineWidth: 6 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 380, height: 280, lineWidth: 6 },
        ],
        straps: [
          { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 20, y1: 150, x2: 380, y2: 150, width: 4 },
          { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 10, y1: 180, x2: 390, y2: 180, width: 4 },
        ],
        vias: [
          { id: 'v1', layer1: 'M4', layer2: 'M5', x: 20, y: 150, net: 'VDD' },
          { id: 'v2', layer1: 'M4', layer2: 'M5', x: 380, y: 150, net: 'VDD' },
          { id: 'v3', layer1: 'M4', layer2: 'M5', x: 10, y: 180, net: 'VSS' },
          { id: 'v4', layer1: 'M4', layer2: 'M5', x: 390, y: 180, net: 'VSS' },
        ],
        sources: [
          { nodeId: 'ring_vdd', net: 'VDD' },
          { nodeId: 'ring_vss', net: 'VSS' },
        ],
        loads: [
          // Explicit zero current load:
          { nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 0 },
          { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 0 },
        ],
      };

      const result = solveResistivePDN(pdn, { nominalVoltage: 1.2 });
      expect(result.valid).toBe(true);
      expect(result.worstDropMv).toBe(0);
      expect(result.meetsBudget).toBe(true);
    });

    it('flags orphan load referencing a non-existent strap as error', () => {
      const pdn = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 360, height: 260, lineWidth: 6 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 380, height: 280, lineWidth: 6 },
        ],
        straps: [
          { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 20, y1: 150, x2: 380, y2: 150, width: 4 },
          { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 10, y1: 180, x2: 390, y2: 180, width: 4 },
        ],
        vias: [],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [
          { nodeId: 'non_existent_ghost_strap', net: 'VDD', currentMa: 25 },
        ],
      };

      const result = solveResistivePDN(pdn);
      expect(result.hasOrphanLoads).toBe(true);
      expect(result.meetsBudget).toBe(false);
      expect(result.orphanLoads.length).toBeGreaterThan(0);
    });

    it('rejects power grid with missing VSS supply topology', () => {
      const pdn = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 360, height: 260, lineWidth: 6 },
          // VSS ring and straps completely missing!
        ],
        straps: [
          { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 20, y1: 150, x2: 380, y2: 150, width: 4 },
        ],
        vias: [],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }],
        loads: [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 15 }],
      };

      const result = solveResistivePDN(pdn);
      expect(result.valid).toBe(false);
      expect(result.hasMissingSupply).toBe(true);
      expect(result.meetsBudget).toBe(false);
    });

    it('detects open circuit when feed vias are missing', () => {
      const pdn = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 360, height: 260, lineWidth: 6 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 380, height: 280, lineWidth: 6 },
        ],
        straps: [
          { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 20, y1: 150, x2: 380, y2: 150, width: 4 },
          { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 10, y1: 180, x2: 390, y2: 180, width: 4 },
        ],
        vias: [], // No vias connecting M4 straps to M5 rings!
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [
          { nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 15 },
          { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 15 },
        ],
      };

      const result = solveResistivePDN(pdn);
      expect(result.hasOpenCircuit).toBe(true);
      expect(result.meetsBudget).toBe(false);
    });

    it('rejects invalid via placed in empty air without touching metal on both layers', () => {
      const pdn = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 360, height: 260, lineWidth: 6 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 380, height: 280, lineWidth: 6 },
        ],
        straps: [
          { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 20, y1: 150, x2: 380, y2: 150, width: 4 },
          { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 10, y1: 180, x2: 390, y2: 180, width: 4 },
        ],
        vias: [
          // Floating via placed out at (500, 500) where no metal exists!
          { id: 'floating_via', layer1: 'M4', layer2: 'M5', x: 500, y: 500, net: 'VDD' },
        ],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [],
      };

      const result = solveResistivePDN(pdn);
      expect(result.invalidVias.length).toBeGreaterThan(0);
      expect(result.invalidVias[0].viaId).toBe('floating_via');
    });
  });
});
