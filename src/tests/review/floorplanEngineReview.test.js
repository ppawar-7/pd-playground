/**
 * floorplanEngineReview.test.js
 * =============================
 * Independent acceptance-review regression tests for the Floorplan engine.
 * Every expected value below was calculated by hand from first principles,
 * not copied from engine output. Each `describe` block names the defect it
 * guards against.
 */

import { describe, it, expect } from 'vitest';
import {
  createDefaultProject,
  deserializeProject,
  EXAMPLE_DUAL_SRAM_CONTROLLER,
  EXAMPLE_SMALL_CONTROLLER,
  EXAMPLE_SMALL_SOC_SUBSYSTEM,
} from '../../engine/floorplanProjectModel.js';
import {
  computeUtilization,
  computeHPWL,
  transformMacroOrientation,
} from '../../engine/floorplanGeometry.js';
import {
  detectOpenConnections,
  detectVDDVSSShort,
  detectMissingVias,
  computeIRDropEstimate,
} from '../../engine/floorplanPDN.js';
import { evaluateFloorplanSignoff } from '../../engine/floorplanSignoff.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

// ─── D1: IR-drop returned NaN for every shipped project ─────────────────────
describe('IR-drop estimate (defect: NaN for project loads without currentMa)', () => {
  it('returns a finite drop for the default beginner project', () => {
    const p = createDefaultProject('t', 'beginner');
    const ir = computeIRDropEstimate(p.powerNetwork, p.powerNetwork.loads);
    expect(Number.isFinite(ir.maxDropMv)).toBe(true);
  });

  it('matches the hand-calculated distributed-load value for a strap fed at both ends', () => {
    // strap_vdd_1: M4, length 372-28 = 344 µm, width 4 µm → 86 squares
    // R = 86 × 0.08 Ω/sq = 6.88 Ω ; I = 15 mA default
    // Uniform load, fed at both ends → V_max = I·R/8 = 15 × 6.88 / 8 = 12.9 mV
    const p = createDefaultProject('t', 'beginner');
    const ir = computeIRDropEstimate(p.powerNetwork, [{ nodeId: 'strap_vdd_1', net: 'VDD' }]);
    expect(ir.perLoad[0].estimatedDropMv).toBeCloseTo(12.9, 2);
    expect(ir.perLoad[0].feedPoints).toBe(2);
  });

  it('quadruples the drop when one end via is missing (single-end feed I·R/2)', () => {
    // Dual SRAM benchmark: strap_vdd_1 20..460 = 440 µm, width 4 → 110 sq, R = 8.8 Ω
    // Only v1 at the left end: V_max = I·R/2 = 15 × 8.8 / 2 = 66 mV
    const pn = EXAMPLE_DUAL_SRAM_CONTROLLER.powerNetwork;
    const ir = computeIRDropEstimate(pn, [{ nodeId: 'strap_vdd_1', net: 'VDD' }]);
    expect(ir.perLoad[0].feedPoints).toBe(1);
    expect(ir.perLoad[0].estimatedDropMv).toBeCloseTo(66, 2);
  });

  it('reports a disconnected strap as open instead of inventing a finite drop', () => {
    const p = createDefaultProject('t', 'beginner');
    const pn = clone(p.powerNetwork);
    pn.vias = pn.vias.filter((v) => v.net !== 'VDD');
    const ir = computeIRDropEstimate(pn, [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 15 }]);
    expect(ir.perLoad[0].estimatedDropMv).toBeNull();
    expect(ir.perLoad[0].severity).toBe('open');
    expect(ir.hasOpenLoad).toBe(true);
  });

  it('uses the layer-specific sheet resistance (M5 strap uses 0.05 Ω/sq)', () => {
    // 100 µm long, 5 µm wide → 20 sq; M5 → R = 1.0 Ω ; both ends → I·R/8 = 20 mA × 1 / 8 = 2.5 mV
    const pn = {
      rings: [{ id: 'r', net: 'VDD', layer: 'M4', x: 0, y: 0, width: 100, height: 100, lineWidth: 4 }],
      straps: [{ id: 's', net: 'VDD', layer: 'M5', x1: 0, y1: 50, x2: 100, y2: 50, width: 5 }],
      vias: [
        { id: 'a', net: 'VDD', layer1: 'M4', layer2: 'M5', x: 0, y: 50 },
        { id: 'b', net: 'VDD', layer1: 'M4', layer2: 'M5', x: 100, y: 50 },
      ],
      sources: [{ nodeId: 'r', net: 'VDD' }],
      loads: [],
    };
    const ir = computeIRDropEstimate(pn, [{ nodeId: 's', net: 'VDD', currentMa: 20 }]);
    expect(ir.perLoad[0].estimatedDropMv).toBeCloseTo(2.5, 3);
  });
});

// ─── D2: orientation changes compounded width/height swaps ──────────────────
describe('Macro orientation (defect: R90 → R270 and R90 → R0 produced wrong footprint)', () => {
  const base = { id: 'm', x: 0, y: 0, width: 80, height: 60, orientation: 'R0' };
  it('R0 → R90 → R270 keeps the rotated 60×80 footprint', () => {
    const r90 = transformMacroOrientation(base, 'R90');
    const r270 = transformMacroOrientation(r90, 'R270');
    expect([r270.width, r270.height]).toEqual([60, 80]);
  });
  it('R0 → R90 → R0 restores the 80×60 footprint', () => {
    const back = transformMacroOrientation(transformMacroOrientation(base, 'R90'), 'R0');
    expect([back.width, back.height]).toEqual([80, 60]);
  });
  it('R90 → MX (mirror only) restores the unrotated footprint', () => {
    const mx = transformMacroOrientation(transformMacroOrientation(base, 'R90'), 'MX');
    expect([mx.width, mx.height]).toEqual([80, 60]);
  });
});

// ─── D3: VDD/VSS short detection only looked at ring corners ────────────────
describe('VDD/VSS short detection (defect: ring edges ignored)', () => {
  it('detects a via joining the VDD ring left edge (M5) to the VSS strap (M4)', () => {
    // Beginner: VDD ring left edge at x = 28 (M5); VSS strap at y = 180 spans x 18..382 (M4).
    const p = createDefaultProject('t', 'beginner');
    const pn = clone(p.powerNetwork);
    pn.vias.push({ id: 'bad', layer1: 'M4', layer2: 'M5', x: 28, y: 180, net: 'VSS' });
    const res = detectVDDVSSShort(pn);
    expect(res.hasShort).toBe(true);
    expect(res.shorts[0].viaId).toBe('bad');
  });
  it('does not report the clean default project as shorted', () => {
    const p = createDefaultProject('t', 'beginner');
    expect(detectVDDVSSShort(p.powerNetwork).hasShort).toBe(false);
  });
});

// ─── D4: missing-via detection only handled horizontal straps ───────────────
describe('Missing-via detection (defect: vertical straps / wrong-layer vias ignored)', () => {
  it('finds both missing vias of a vertical M4 strap crossing the M5 ring top and bottom', () => {
    const p = createDefaultProject('t', 'beginner');
    const pn = clone(p.powerNetwork);
    // VDD ring: x 28..372, y 28..292
    pn.straps.push({ id: 'v_strap', net: 'VDD', layer: 'M4', x1: 200, y1: 28, x2: 200, y2: 292, width: 4 });
    const res = detectMissingVias(pn);
    const pts = res.details.filter((d) => d.strapId === 'v_strap').map((d) => [d.x, d.y]);
    expect(pts).toEqual(expect.arrayContaining([[200, 28], [200, 292]]));
    expect(pts.length).toBe(2);
  });
  it('does not accept an M1–M2 via as the connection between an M4 strap and an M5 ring', () => {
    const p = createDefaultProject('t', 'beginner');
    const pn = clone(p.powerNetwork);
    pn.vias = pn.vias.map((v) => (v.id === 'via_2' ? { ...v, layer1: 'M1', layer2: 'M2' } : v));
    const res = detectMissingVias(pn);
    expect(res.missingViaCount).toBe(1);
    expect(res.details[0]).toMatchObject({ strapId: 'strap_vdd_1', x: 372, y: 140 });
  });
  it('keeps detecting the documented Dual SRAM benchmark defect', () => {
    const res = detectMissingVias(EXAMPLE_DUAL_SRAM_CONTROLLER.powerNetwork);
    expect(res.missingViaCount).toBe(1);
    expect(res.details[0]).toMatchObject({ x: 460, y: 180, net: 'VDD' });
  });
});

// ─── D5: open-net check only covered hand-listed loads ──────────────────────
describe('PDN open detection (defect: unlisted straps never checked)', () => {
  it('flags a floating VDD strap that is not in the explicit loads list', () => {
    const p = createDefaultProject('t', 'beginner');
    const pn = clone(p.powerNetwork);
    pn.straps.push({ id: 'floating', net: 'VDD', layer: 'M4', x1: 100, y1: 100, x2: 200, y2: 100, width: 4 });
    const res = detectOpenConnections(pn);
    expect(res.vddOpen).toBe(true);
    expect(res.vddDisconnectedLoads.map((d) => d.nodeId)).toContain('floating');
  });
  it('does not let a wrong-layer via connect a strap to the ring', () => {
    const p = createDefaultProject('t', 'beginner');
    const pn = clone(p.powerNetwork);
    pn.vias = pn.vias
      .filter((v) => v.id !== 'via_1')
      .map((v) => (v.id === 'via_2' ? { ...v, layer1: 'M1', layer2: 'M2' } : v));
    expect(detectOpenConnections(pn).vddOpen).toBe(true);
  });
});

// ─── D6: nominal utilisation clamped to 100 % hid the real number ───────────
describe('Utilization reporting', () => {
  it('exposes the unclamped nominal utilization when over 100 %', () => {
    // (900 + 400) / 1000 = 130 %
    const u = computeUtilization(1000, 900, [{ width: 20, height: 20 }]);
    expect(u.overutilized).toBe(true);
    expect(u.rawNominalUtilization).toBe(130);
  });

  it('subtracts halo keepout (union, clipped to core) when a core rect is supplied', () => {
    // Beginner: core 320×240 = 76 800 µm²; two 80×60 macros, halo 15 → (110×90) = 9 900 each,
    // disjoint and inside the core → blocked 19 800 µm² ; placeable 57 000 µm²
    // effective = 28 000 / 57 000 = 49.12 %
    const p = createDefaultProject('t', 'beginner');
    const u = computeUtilization(76800, 28000, p.macros, p.blockages, p.core);
    expect(u.placeableArea).toBe(57000);
    expect(u.effectiveUtilization).toBeCloseTo(49.12, 2);
    // nominal unchanged: (28 000 + 9 600) / 76 800 = 48.96 %
    expect(u.nominalUtilization).toBeCloseTo(48.96, 2);
  });

  it('does not double count overlapping macro/halo/blockage area', () => {
    // Core 100×100. Macro 20×20 at (10,10) halo 0; blockage 20×20 at (20,20) → union 700 µm².
    const core = { x: 0, y: 0, width: 100, height: 100 };
    const u = computeUtilization(10000, 1000, [{ x: 10, y: 10, width: 20, height: 20, halo: 0 }],
      [{ x: 20, y: 20, width: 20, height: 20 }], core);
    expect(u.placeableArea).toBe(9300);
  });
});

// ─── D7: pins drawn on the die boundary must be measured there too ──────────
describe('HPWL with I/O pins on the die boundary', () => {
  it('matches hand calculation for the beginner project (die-edge pins)', () => {
    // Pin coord is measured from the core origin along the edge; the pin itself sits on the die edge.
    // net_clk : clk (200, 0), SRAM_DATA c(100,90), SRAM_INST c(300,90) → 200 + 90 = 290
    // net_data: d_in0 (0,120), d_in1 (0,160), SRAM_DATA c(100,90)      → 100 + 70 = 170
    // net_out : SRAM_DATA c(100,90), d_out0 (400,120), d_out1 (400,160)→ 300 + 70 = 370
    const p = createDefaultProject('t', 'beginner');
    const h = computeHPWL(p.nets, p.macros, p.pins, p.core, p.die);
    expect(h.totalHPWL).toBe(830);
  });
  it('keeps the legacy core-edge behaviour when no die is passed', () => {
    const p = createDefaultProject('t', 'beginner');
    expect(computeHPWL(p.nets, p.macros, p.pins, p.core).totalHPWL).toBe(710);
  });
});

// ─── D8: import accepted any JSON as a "successfully loaded" floorplan ──────
describe('Project import validation', () => {
  it('rejects JSON that is not a floorplan', () => {
    expect(() => deserializeProject('{"hello":"world"}')).toThrow(/die/i);
    expect(() => deserializeProject('[1,2,3]')).toThrow();
  });
  it('rejects non-positive die geometry', () => {
    const p = createDefaultProject('t', 'beginner');
    p.die.width = -5;
    expect(() => deserializeProject(JSON.stringify(p))).toThrow(/die/i);
  });
  it('round-trips a valid project exactly', () => {
    const p = clone(EXAMPLE_SMALL_SOC_SUBSYSTEM);
    const back = deserializeProject(JSON.stringify(p));
    expect(back.macros).toEqual(p.macros);
    expect(back.powerNetwork).toEqual(p.powerNetwork);
  });
});

// ─── Signoff engine shared by Studio diagnostics and the FP-24 capstone ─────
describe('evaluateFloorplanSignoff (deliberately invalid and valid designs)', () => {
  it('fails the overlapping Small Controller benchmark on macro overlap', () => {
    const r = evaluateFloorplanSignoff(EXAMPLE_SMALL_CONTROLLER);
    expect(r.clean).toBe(false);
    expect(r.violations.some((v) => v.rule === 'Macro Overlap (DRC)')).toBe(true);
    // SRAM1 x 30..90, y 30..70; SRAM2 x 70..130, y 45..85 → 20 × 25 = 500 µm²
    expect(r.violations.find((v) => v.rule === 'Macro Overlap (DRC)').message).toContain('500');
  });
  it('fails the Small SoC benchmark on the 3 µm pin pitch defect', () => {
    const r = evaluateFloorplanSignoff(EXAMPLE_SMALL_SOC_SUBSYSTEM);
    expect(r.violations.some((v) => v.rule === 'I/O Pin Pitch DRC')).toBe(true);
  });
  it('fails the Dual SRAM benchmark on the missing via, and passes once it is repaired', () => {
    const p = clone(EXAMPLE_DUAL_SRAM_CONTROLLER);
    expect(evaluateFloorplanSignoff(p).clean).toBe(false);
    p.powerNetwork.vias.push({ id: 'v2', layer1: 'M4', layer2: 'M5', x: 460, y: 180, net: 'VDD' });
    const r = evaluateFloorplanSignoff(p);
    expect(r.violations).toEqual([]);
    expect(r.clean).toBe(true);
    expect(r.metrics.macroCount).toBe(4);
  });
  it('flags utilization above the project constraint', () => {
    const p = createDefaultProject('t', 'beginner');
    p.standardCellAreaUm2 = 60000; // (60 000 + 9 600) / 76 800 = 90.6 % > 70 %
    const r = evaluateFloorplanSignoff(p);
    expect(r.violations.some((v) => v.rule === 'Utilization Budget')).toBe(true);
  });
});
