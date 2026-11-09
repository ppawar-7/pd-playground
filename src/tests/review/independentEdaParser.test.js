/**
 * independentEdaParser.test.js
 * =============================
 * Independent Token & BNF Grammar Verification for Exported LEF 5.8 and DEF 5.8 files.
 */

import { describe, it, expect } from 'vitest';
import { generateLEF, generateDEF } from '../../engine/floorplanExport.js';
import { createDefaultProject, SCENARIO_SOC_CAPSTONE } from '../../engine/floorplanProjectModel.js';
import edaParser from '../../../tests/independentEdaParser.cjs';

const { parseLEF58, parseDEF58, LEGAL_DEF_ORIENTATIONS } = edaParser;

describe('Independent EDA Parser — LEF 5.8 & DEF 5.8 BNF Grammar Acceptance', () => {
  it('parses exported LEF 5.8 with 0 syntax errors and valid macro blocks', () => {
    const project = createDefaultProject('eda_lef_test');
    const lef = generateLEF(project);

    expect(lef).toBeDefined();
    expect(typeof lef).toBe('string');

    const parsed = parseLEF58(lef);
    expect(parsed.errors).toEqual([]);
    expect(parsed.version).toBe('5.8');
    expect(parsed.busbitchars).toBe('"[]"');
    expect(parsed.dividerchar).toBe('"/"');
    expect(parsed.unitsMicrons).toBe(1000);
    expect(parsed.macros.length).toBeGreaterThanOrEqual(1);

    parsed.macros.forEach((m) => {
      expect(m.name).toBeDefined();
      expect(m.class).toBe('BLOCK');
      expect(m.size[0]).toBeGreaterThan(0);
      expect(m.size[1]).toBeGreaterThan(0);
      expect(m.origin).toEqual([0, 0]);
      expect(m.pins.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('parses exported DEF 5.8 with 0 syntax errors, exact component counts, and valid coordinates', () => {
    const project = createDefaultProject('eda_def_test');
    const def = generateDEF(project);

    expect(def).toBeDefined();
    expect(typeof def).toBe('string');

    const parsed = parseDEF58(def);
    expect(parsed.errors).toEqual([]);
    expect(parsed.version).toBe('5.8');
    expect(parsed.design).toBe('eda_def_test');
    expect(parsed.unitsDistance).toBe(1000);
    expect(parsed.dieArea).toBeDefined();
    expect(parsed.dieArea.x2).toBeGreaterThan(parsed.dieArea.x1);
    expect(parsed.dieArea.y2).toBeGreaterThan(parsed.dieArea.y1);

    // Exact component count match
    expect(parsed.declaredComponents).toBe(project.macros.length);
    expect(parsed.components.length).toBe(project.macros.length);

    // Orientations must be in official DEF 5.8 standard set
    parsed.components.forEach((c) => {
      expect(LEGAL_DEF_ORIENTATIONS.has(c.orient)).toBe(true);
      expect(Number.isInteger(c.x)).toBe(true);
      expect(Number.isInteger(c.y)).toBe(true);
    });

    // Pins match
    expect(parsed.declaredPins).toBe(project.pins.length);
    expect(parsed.pins.length).toBe(project.pins.length);

    // Special nets (VDD and VSS)
    expect(parsed.declaredSpecialNets).toBe(2);
    expect(parsed.specialNets.length).toBe(2);
  });

  it('verifies complex 6-macro SoC Capstone floorplan parses cleanly under BNF grammar', () => {
    const project = JSON.parse(JSON.stringify(SCENARIO_SOC_CAPSTONE));
    project.name = 'soc_capstone_signoff';

    const lef = generateLEF(project);
    const def = generateDEF(project);

    const parsedLEF = parseLEF58(lef);
    expect(parsedLEF.errors).toEqual([]);
    expect(parsedLEF.macros.length).toBeGreaterThanOrEqual(2);

    const parsedDEF = parseDEF58(def);
    expect(parsedDEF.errors).toEqual([]);
    expect(parsedDEF.declaredComponents).toBe(6);
    expect(parsedDEF.components.length).toBe(6);

    const uniqueMasters = new Set(parsedDEF.components.map((c) => c.master));
    expect(uniqueMasters.size).toBeGreaterThanOrEqual(2);

    // Verify coordinates within die area
    parsedDEF.components.forEach((c) => {
      expect(c.x).toBeGreaterThanOrEqual(parsedDEF.dieArea.x1);
      expect(c.x).toBeLessThan(parsedDEF.dieArea.x2);
      expect(c.y).toBeGreaterThanOrEqual(parsedDEF.dieArea.y1);
      expect(c.y).toBeLessThan(parsedDEF.dieArea.y2);
      expect(LEGAL_DEF_ORIENTATIONS.has(c.orient)).toBe(true);
    });
  });

  it('verifies all 8 DEF orientations (N, W, S, E, FN, FS, FW, FE) map cleanly and pass parser', () => {
    const orientations = ['R0', 'R90', 'R180', 'R270', 'MY', 'MX', 'MY90', 'MX90'];
    const project = createDefaultProject('orientations_test');
    project.macros = orientations.map((orient, idx) => ({
      id: `MACRO_${idx}`,
      name: `MACRO_${idx}`,
      masterId: 'SRAM_16KB',
      x: 50 + idx * 40,
      y: 50,
      width: 30,
      height: 30,
      orientation: orient,
    }));

    const def = generateDEF(project);
    const parsed = parseDEF58(def);
    expect(parsed.errors).toEqual([]);
    expect(parsed.components.length).toBe(8);

    const mappedOrients = parsed.components.map((c) => c.orient);
    expect(mappedOrients).toEqual(['N', 'W', 'S', 'E', 'FN', 'FS', 'FW', 'FE']);
  });
});
