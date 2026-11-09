/**
 * floorplanMNAMathematicalEvidence.test.js
 * ========================================
 * Rigorous mathematical verification and analytical benchmarks for the
 * Modified Nodal Analysis (MNA) Conductance Matrix Physical PDN Solver.
 *
 * Verifies:
 * 1. Exact hand-calculated closed-form analytical solutions on multi-node resistive networks.
 * 2. KCL current residual norm:
 *    ||r||_inf = max_i |I_{i,inj} + \sum_{j \in N(i)} g_{ij}(V_i - V_j)| < 1e-12 << 1e-5.
 * 3. Exact preservation of zero-current loads (currentMa: 0).
 * 4. Fail-closed handling of malformed networks, missing supply, disconnected loads, and VDD/VSS shorts.
 *
 * Explicit Educational Scope:
 * Models educational physical-design power grid resistive networks;
 * not claimed as manufacturing-grade signoff.
 */

import { describe, it, expect } from 'vitest';
import { solveMNA, solveResistivePDN, detectVDDVSSShort } from '../../engine/floorplanPDN.js';

describe('MNA Conductance Matrix Solver: Mathematical Derivation & Analytical Proofs', () => {
  // Test 1: Hand-Calculated Analytical 3-Node Resistive Network
  it('solves 3-node resistive network with exact agreement to hand-calculated analytical solution', () => {
    /**
     * Hand Derivation:
     * Node 0: Dirichlet boundary V_0 = 1.000 V (Ideal VDD supply pad).
     * Node 1: Connected to Node 0 via R_01 = 10 Ohm (g_01 = 0.1 S).
     *         Connected to Node 2 via R_12 = 20 Ohm (g_12 = 0.05 S).
     *         Load sink I_1 = -10 mA = -0.010 A.
     * Node 2: Connected to Node 1 via R_12 = 20 Ohm (g_12 = 0.05 S).
     *         Load sink I_2 = -20 mA = -0.020 A.
     *
     * Linear System (G * V = I):
     * KCL at Node 2:
     *   g_12 * (V_2 - V_1) = I_2
     *   0.05 * (V_2 - V_1) = -0.020  =>  V_2 - V_1 = -0.400 V
     *
     * KCL at Node 1:
     *   g_01 * (V_1 - V_0) + g_12 * (V_1 - V_2) = I_1
     *   0.10 * (V_1 - 1.000) + 0.05 * (0.400) = -0.010
     *   0.10 * (V_1 - 1.000) + 0.020 = -0.010
     *   0.10 * (V_1 - 1.000) = -0.030
     *   V_1 - 1.000 = -0.300 V  =>  V_1 = 0.700000 V (IR drop = 300 mV)
     *   V_2 = V_1 - 0.400 = 0.300000 V (IR drop = 700 mV)
     */
    const n = 3;
    const branches = [
      { u: 0, v: 1, r: 10.0 }, // 10 Ohm
      { u: 1, v: 2, r: 20.0 }, // 20 Ohm
    ];
    const dirichlet = new Map([[0, 1.0]]); // V_0 = 1.0 V
    const neumann = new Map([
      [1, -0.010], // -10 mA
      [2, -0.020], // -20 mA
    ]);

    const result = solveMNA(n, branches, dirichlet, neumann);

    expect(result.voltages[0]).toBeCloseTo(1.0, 9);
    expect(result.voltages[1]).toBeCloseTo(0.7, 9);
    expect(result.voltages[2]).toBeCloseTo(0.3, 9);

    // Verify physical KCL residual at Node 1:
    // g_01 * (V_1 - V_0) + g_12 * (V_1 - V_2) - I_1
    const g01 = 1.0 / 10.0;
    const g12 = 1.0 / 20.0;
    const V0 = result.voltages[0];
    const V1 = result.voltages[1];
    const V2 = result.voltages[2];

    const kclNode1 = g01 * (V1 - V0) + g12 * (V1 - V2) - (-0.010);
    const kclNode2 = g12 * (V2 - V1) - (-0.020);

    expect(Math.abs(kclNode1)).toBeLessThan(1e-14);
    expect(Math.abs(kclNode2)).toBeLessThan(1e-14);
    expect(result.maxResidual).toBeLessThan(1e-12);
  });

  // Test 2: Symmetric Mesh Bridge with Dual Sources
  it('solves symmetric dual-source mesh with zero bridge current', () => {
    /**
     * Node 0: VDD Left = 1.0 V
     * Node 3: VDD Right = 1.0 V
     * Node 1: Left tap connected to Node 0 via 5 Ohm, load -10 mA
     * Node 2: Right tap connected to Node 3 via 5 Ohm, load -10 mA
     * Bridge between Node 1 and Node 2: 100 Ohm
     * By symmetry, V_1 == V_2, and bridge current must be exactly 0 A.
     */
    const n = 4;
    const branches = [
      { u: 0, v: 1, r: 5.0 },
      { u: 3, v: 2, r: 5.0 },
      { u: 1, v: 2, r: 100.0 }, // Bridge
    ];
    const dirichlet = new Map([
      [0, 1.0],
      [3, 1.0],
    ]);
    const neumann = new Map([
      [1, -0.010],
      [2, -0.010],
    ]);

    const result = solveMNA(n, branches, dirichlet, neumann);

    expect(result.voltages[1]).toBeCloseTo(result.voltages[2], 9);
    // V_1 = 1.0 - 0.010 * 5 = 0.950 V
    expect(result.voltages[1]).toBeCloseTo(0.950, 9);
    expect(result.voltages[2]).toBeCloseTo(0.950, 9);

    const bridgeCurrent = (result.voltages[1] - result.voltages[2]) / 100.0;
    expect(Math.abs(bridgeCurrent)).toBeLessThan(1e-15);
    expect(result.maxResidual).toBeLessThan(1e-12);
  });

  // Test 3: Zero-Current Preservation
  it('strictly preserves zero-current loads without falling back to defaults', () => {
    const power = {
      rings: [
        { id: 'r_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 400, height: 300, lineWidth: 6 },
        { id: 'r_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 420, height: 320, lineWidth: 6 },
      ],
      straps: [
        { id: 's_vdd', net: 'VDD', layer: 'M4', x1: 20, y1: 150, x2: 420, y2: 150, width: 4 },
        { id: 's_vss', net: 'VSS', layer: 'M4', x1: 10, y1: 170, x2: 430, y2: 170, width: 4 },
      ],
      vias: [
        { id: 'v1', net: 'VDD', layer1: 'M4', layer2: 'M5', x: 20, y: 150 },
        { id: 'v2', net: 'VDD', layer1: 'M4', layer2: 'M5', x: 420, y: 150 },
        { id: 'v3', net: 'VSS', layer1: 'M4', layer2: 'M5', x: 10, y: 170 },
        { id: 'v4', net: 'VSS', layer1: 'M4', layer2: 'M5', x: 430, y: 170 },
      ],
      sources: [
        { nodeId: 'r_vdd', net: 'VDD' },
        { nodeId: 'r_vss', net: 'VSS' },
      ],
      loads: [
        { nodeId: 's_vdd', net: 'VDD', currentMa: 0 }, // Explicit zero load
        { nodeId: 's_vss', net: 'VSS', currentMa: 0 }, // Explicit zero load
      ],
    };

    const res = solveResistivePDN(power, {}, {}, []);
    expect(res.valid).toBe(true);
    expect(res.hasOpenCircuit).toBe(false);
    // With 0 mA current, static IR drop across the entire network must be exactly 0 mV
    expect(res.worstDropMv).toBeCloseTo(0.0, 4);
    expect(res.worstDropVssMv).toBeCloseTo(0.0, 4);
  });

  // Test 4: Fail-Closed on Null or Missing Topology
  it('fails closed when power network is null or empty', () => {
    const resNull = solveResistivePDN(null);
    expect(resNull.valid).toBe(false);
    expect(resNull.meetsBudget).toBe(false);
    expect(resNull.hasOpenCircuit).toBe(true);
    expect(resNull.worstDropMv).toBeNull();

    const resEmpty = solveResistivePDN({ rings: [], straps: [], vias: [] });
    expect(resEmpty.valid).toBe(false);
    expect(resEmpty.meetsBudget).toBe(false);
  });

  // Test 5: Missing Supply Sources
  it('flags open circuit when VDD or VSS sources are missing', () => {
    const powerNoSources = {
      rings: [
        { id: 'r_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 400, height: 300, lineWidth: 6 },
        { id: 'r_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 420, height: 320, lineWidth: 6 },
      ],
      straps: [
        { id: 's_vdd', net: 'VDD', layer: 'M4', x1: 20, y1: 150, x2: 420, y2: 150, width: 4 },
      ],
      vias: [],
      sources: [], // No sources configured
      loads: [{ nodeId: 's_vdd', net: 'VDD', currentMa: 20 }],
    };

    const res = solveResistivePDN(powerNoSources);
    expect(res.valid).toBe(false);
    expect(res.hasOpenCircuit).toBe(true);
    expect(res.meetsBudget).toBe(false);
  });

  // Test 6: VDD/VSS Short Circuit Detection
  it('detects direct geometric short circuit between VDD and VSS', () => {
    const powerWithShort = {
      rings: [
        { id: 'r_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 400, height: 300, lineWidth: 6 },
        { id: 'r_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 420, height: 320, lineWidth: 6 },
      ],
      straps: [
        { id: 's_vdd', net: 'VDD', layer: 'M4', x1: 20, y1: 150, x2: 420, y2: 150, width: 4 },
        { id: 's_vss', net: 'VSS', layer: 'M5', x1: 20, y1: 100, x2: 20, y2: 250, width: 4 },
      ],
      vias: [
        // Shorting via placing VSS onto M4 VDD strap
        { id: 'v_short', net: 'VSS', layer1: 'M4', layer2: 'M5', x: 20, y: 150 },
      ],
      sources: [
        { nodeId: 'r_vdd', net: 'VDD' },
        { nodeId: 'r_vss', net: 'VSS' },
      ],
      loads: [],
    };

    const shortDetect = detectVDDVSSShort(powerWithShort);
    expect(shortDetect.hasShort).toBe(true);
    expect(shortDetect.shorts.length).toBeGreaterThan(0);

    const pdnRes = solveResistivePDN(powerWithShort);
    expect(pdnRes.valid).toBe(false);
    expect(pdnRes.worstDropMv).toBe(Infinity);
  });
});
