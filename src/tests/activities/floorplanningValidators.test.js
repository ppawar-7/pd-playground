import { describe, it, expect } from 'vitest';
import { validateFPIntro } from '../../activities/floorplanning/validators/validateFPIntro.js';
import { validateFPGeometry } from '../../activities/floorplanning/validators/validateFPGeometry.js';
import { validateFPPinPlacement } from '../../activities/floorplanning/validators/validateFPPinPlacement.js';
import { validateFPMacroPlacement } from '../../activities/floorplanning/validators/validateFPMacroPlacement.js';
import { validateFPKingdom } from '../../activities/floorplanning/validators/validateFPKingdom.js';

describe('Floorplanning Kingdom Activity Validators (Levels 1–5)', () => {
  describe('Level 1: validateFPIntro', () => {
    it('accepts correct core/die and power ring concepts for 30 XP (3 Stars)', () => {
      const res = validateFPIntro({
        coreDieAnswer: 'opt-die-core-margin',
        powerRingAnswer: 'opt-power-ring-ir',
      });
      expect(res.passed).toBe(true);
      expect(res.score).toBe(30);
      expect(res.stars).toBe(3);
    });
  });

  describe('Level 2: validateFPGeometry', () => {
    it('validates core dimensions and utilization metrics for 35 XP (3 Stars)', () => {
      const res = validateFPGeometry({
        coreWidth: '500',
        coreHeight: '400',
        coreArea: '200000',
        aspectRatio: '0.80',
        nominalUtil: '50.0',
        effectiveUtil: '42.9',
        congestionConcept: 'opt-routing-drc-hotspots',
      });
      expect(res.passed).toBe(true);
      expect(res.score).toBe(35);
      expect(res.stars).toBe(3);
    });
  });

  describe('Level 3: validateFPPinPlacement', () => {
    it('verifies 20 um pitch spacing and bus grouping for 40 XP (3 Stars)', () => {
      const pins = [
        { id: 'DATA0', edge: 'top', coord: 80 },
        { id: 'DATA1', edge: 'top', coord: 120 },
        { id: 'DATA2', edge: 'top', coord: 160 },
        { id: 'DATA3', edge: 'top', coord: 200 },
        { id: 'CLK',   edge: 'bottom', coord: 220 },
        { id: 'RST',   edge: 'bottom', coord: 260 },
      ];
      const res = validateFPPinPlacement({
        pins,
        esdConcept: 'opt-esd-wirebond-clearance',
      });
      expect(res.passed).toBe(true);
      expect(res.score).toBe(40);
      expect(res.stars).toBe(3);
    });
  });

  describe('Level 4: validateFPMacroPlacement', () => {
    it('accepts legal non-overlapping macro placement with halos for 45 XP (3 Stars)', () => {
      const macros = [
        { id: 'SRAM1', x: 40, y: 40, width: 120, height: 90 },
        { id: 'SRAM2', x: 40, y: 220, width: 120, height: 90 },
      ];
      const res = validateFPMacroPlacement({
        macros,
        haloConcept: 'opt-halo-routing-drc',
      });
      expect(res.passed).toBe(true);
      expect(res.score).toBe(45);
      expect(res.stars).toBe(3);
    });

    it('rejects colliding macros', () => {
      const macros = [
        { id: 'SRAM1', x: 40, y: 40, width: 120, height: 90 },
        { id: 'SRAM2', x: 60, y: 60, width: 120, height: 90 }, // collision!
      ];
      const res = validateFPMacroPlacement({ macros });
      expect(res.passed).toBe(false);
      expect(res.feedback).toContain('collision');
    });
  });

  describe('Level 5: validateFPKingdom', () => {
    it('certifies floorplan capstone for 50 XP (3 Stars)', () => {
      const macros = [
        { id: 'SRAM1', x: 40, y: 40, width: 120, height: 90 },
        { id: 'SRAM2', x: 40, y: 220, width: 120, height: 90 },
      ];
      const pins = [
        { id: 'DATA0', edge: 'top', coord: 80 },
        { id: 'DATA1', edge: 'top', coord: 120 },
        { id: 'DATA2', edge: 'top', coord: 160 },
        { id: 'DATA3', edge: 'top', coord: 200 },
        { id: 'CLK',   edge: 'bottom', coord: 220 },
        { id: 'RST',   edge: 'bottom', coord: 260 },
      ];
      const res = validateFPKingdom({
        macros,
        pins,
        powerGridConcept: 'opt-mesh-power-straps',
      });
      expect(res.passed).toBe(true);
      expect(res.score).toBe(50);
      expect(res.stars).toBe(3);
    });
  });
});
