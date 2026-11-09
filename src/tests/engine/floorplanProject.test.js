/**
 * floorplanProject.test.js
 * ========================
 * Unit tests for FloorplanProject data model, serialization, migration, and benchmark presets.
 */

import { describe, it, expect } from 'vitest';
import {
  SCHEMA_VERSION,
  createDefaultProject,
  serializeProject,
  deserializeProject,
  migrateProject,
  EXAMPLE_SMALL_CONTROLLER,
  EXAMPLE_DUAL_SRAM_CONTROLLER,
  EXAMPLE_SMALL_SOC_SUBSYSTEM,
} from '../../engine/floorplanProjectModel.js';
import { checkMacroOverlap, checkPinSpacing } from '../../engine/floorplanGeometry.js';
import { detectMissingVias } from '../../engine/floorplanPDN.js';

describe('floorplanProjectModel Tests', () => {
  describe('createDefaultProject', () => {
    it('creates a beginner preset project with all required schema fields', () => {
      const proj = createDefaultProject('My Test Chip', 'beginner');
      expect(proj.schemaVersion).toBe(SCHEMA_VERSION);
      expect(proj.name).toBe('My Test Chip');
      expect(proj.die.width).toBeGreaterThan(0);
      expect(proj.core.width).toBeGreaterThan(0);
      expect(proj.macros.length).toBeGreaterThan(0);
      expect(proj.pins.length).toBeGreaterThan(0);
      expect(proj.powerNetwork.rings.length).toBeGreaterThan(0);
      expect(proj.constraints).toBeDefined();
    });

    it('generates unique project IDs on successive calls', () => {
      const p1 = createDefaultProject('P1');
      const p2 = createDefaultProject('P2');
      expect(p1.projectId).not.toBe(p2.projectId);
    });

    it('supports intermediate and advanced presets', () => {
      const pInt = createDefaultProject('Intermediate', 'intermediate');
      expect(pInt.macros.length).toBe(4);

      const pAdv = createDefaultProject('SoC', 'advanced');
      expect(pAdv.macros.length).toBe(4);
      expect(pAdv.blockages.length).toBe(1);
    });
  });

  describe('serializeProject & deserializeProject round-trip', () => {
    it('round-trips project to JSON and back losslessly', () => {
      const original = createDefaultProject('Roundtrip Test', 'beginner');
      const json = serializeProject(original);
      expect(typeof json).toBe('string');

      const restored = deserializeProject(json);
      expect(restored.name).toBe(original.name);
      expect(restored.die.width).toBe(original.die.width);
      expect(restored.macros.length).toBe(original.macros.length);
      expect(restored.powerNetwork.rings.length).toBe(original.powerNetwork.rings.length);
    });

    it('throws when deserializing invalid JSON string', () => {
      expect(() => deserializeProject('{ invalid json')).toThrow();
    });
  });

  describe('migrateProject', () => {
    it('gracefully fills missing fields when given an incomplete raw object', () => {
      const partial = {
        name: 'Legacy Project',
        die: { width: 300, height: 200 },
      };
      const migrated = migrateProject(partial);
      expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
      expect(migrated.name).toBe('Legacy Project');
      expect(Array.isArray(migrated.macros)).toBe(true);
      expect(Array.isArray(migrated.pins)).toBe(true);
      expect(migrated.powerNetwork).toBeDefined();
    });

    it('recovers from null or non-object input', () => {
      const recovered = migrateProject(null);
      expect(recovered.schemaVersion).toBe(SCHEMA_VERSION);
      expect(recovered.macros.length).toBeGreaterThan(0);
    });
  });

  describe('Benchmark Presets and Defect Discoverability', () => {
    it('EXAMPLE_SMALL_CONTROLLER has an intentional macro overlap', () => {
      const proj = EXAMPLE_SMALL_CONTROLLER;
      const m1 = proj.macros.find((m) => m.id === 'SRAM1');
      const m2 = proj.macros.find((m) => m.id === 'SRAM2');
      const overlapCheck = checkMacroOverlap(m1, m2);
      expect(overlapCheck.overlaps).toBe(true);
      expect(overlapCheck.overlapArea).toBeGreaterThan(0);
    });

    it('EXAMPLE_DUAL_SRAM_CONTROLLER has an intentional missing via', () => {
      const proj = EXAMPLE_DUAL_SRAM_CONTROLLER;
      const viaCheck = detectMissingVias(proj.powerNetwork);
      expect(viaCheck.missingViaCount).toBeGreaterThan(0);
      expect(viaCheck.details.some((d) => d.net === 'VDD')).toBe(true);
    });

    it('EXAMPLE_SMALL_SOC_SUBSYSTEM has an intentional pin spacing violation', () => {
      const proj = EXAMPLE_SMALL_SOC_SUBSYSTEM;
      const pinCheck = checkPinSpacing(proj.pins, 'top', proj.constraints.minPinSpacing, proj.core.width, proj.core.height);
      expect(pinCheck.valid).toBe(false);
      expect(pinCheck.violations.length).toBeGreaterThan(0);
    });
  });
});
