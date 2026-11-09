import { describe, it, expect } from 'vitest';
import {
  computeCoreGeometry,
  computeUtilization,
  checkRectCollision,
  isContainedInCore,
  validatePinPlacements,
} from '../../engine/geometryEngine.js';

describe('Geometry & Floorplanning Engine', () => {
  it('computes core dimensions and aspect ratio from die dimensions and margins', () => {
    // 500 x 400 die, 25 um margin
    const geom = computeCoreGeometry({ dieWidth: 500, dieHeight: 400, margin: 25 });
    expect(geom.coreWidth).toBe(450); // 500 - 50
    expect(geom.coreHeight).toBe(350); // 400 - 50
    expect(geom.coreArea).toBe(157500);
    expect(geom.aspectRatio).toBe(0.778); // 350 / 450
  });

  it('handles zero or negative die dimensions safely', () => {
    const geom = computeCoreGeometry({ dieWidth: 0, dieHeight: 100, margin: 25 });
    expect(geom.coreWidth).toBe(0);
    expect(geom.coreArea).toBe(0);
    expect(geom.aspectRatio).toBe(0);
  });

  it('computes nominal vs effective placement utilization accurately', () => {
    // Core area = 100,000 um^2. StdCell = 40,000 um^2. Macro = 20,000 um^2. Blockage = 10,000 um^2.
    const util = computeUtilization({
      stdCellArea: 40000,
      macroArea: 20000,
      blockageArea: 10000,
      coreArea: 100000,
    });
    expect(util.nominalUtilization).toBe(60.0); // (40k + 20k) / 100k = 60%
    expect(util.routableArea).toBe(70000); // 100k - 20k - 10k
    expect(util.effectiveUtilization).toBe(57.1); // 40k / 70k = 57.1%
  });

  it('handles zero or missing core area in utilization calculation', () => {
    const util = computeUtilization({ stdCellArea: 100, coreArea: 0 });
    expect(util.nominalUtilization).toBe(0);
    expect(util.effectiveUtilization).toBe(0);
    expect(util.routableArea).toBe(0);
  });

  it('detects rectangle overlaps, edge-touching abutment, and halo clearance', () => {
    const box1 = { x: 50, y: 50, width: 100, height: 100 };
    const box2 = { x: 120, y: 120, width: 100, height: 100 }; // Direct overlap
    const box3 = { x: 160, y: 50, width: 50, height: 50 };   // 10 um gap from box1 (150 to 160)
    const boxAbut = { x: 150, y: 50, width: 50, height: 100 }; // Exactly touches right edge of box1 (x=150)

    expect(checkRectCollision(box1, box2, 0)).toBe(true);
    expect(checkRectCollision(box1, box3, 0)).toBe(false); // No overlap without halo
    expect(checkRectCollision(box1, box3, 15)).toBe(true);  // Violates 15 um halo clearance!
    expect(checkRectCollision(box1, boxAbut, 0)).toBe(false); // Touching edges are NOT overlapping
    expect(checkRectCollision(box1, boxAbut, 5)).toBe(true);  // But violate halo clearance!
  });

  it('handles degenerate zero-width or zero-height rectangles safely', () => {
    const box1 = { x: 50, y: 50, width: 100, height: 100 };
    const degenBox = { x: 70, y: 70, width: 0, height: 50 };
    expect(checkRectCollision(box1, degenBox, 0)).toBe(false);
  });

  it('verifies boundary containment and reports out-of-core placement', () => {
    const core = { width: 500, height: 400 };
    expect(isContainedInCore({ x: 50, y: 50, width: 200, height: 150 }, core)).toBe(true);
    expect(isContainedInCore({ x: 400, y: 50, width: 150, height: 100 }, core)).toBe(false); // extends to 550 > 500
    expect(isContainedInCore({ x: -10, y: 50, width: 50, height: 50 }, core)).toBe(false);
    expect(isContainedInCore({ x: 50, y: 350, width: 50, height: 100 }, core)).toBe(false); // extends to 450 > 400
  });

  it('validates I/O pin pitch spacing and identifies violations', () => {
    const core = { width: 500, height: 500 };
    const validPins = [
      { id: 'CLK', edge: 'bottom', coord: 100 },
      { id: 'RST', edge: 'bottom', coord: 120 }, // 20 um spacing >= 10 um min
      { id: 'DATA0', edge: 'top', coord: 50 },
    ];
    expect(validatePinPlacements(validPins, 10, core).isValid).toBe(true);

    const violatingPins = [
      { id: 'D0', edge: 'top', coord: 100 },
      { id: 'D1', edge: 'top', coord: 105 }, // 5 um spacing < 10 um min
    ];
    const check = validatePinPlacements(violatingPins, 10, core);
    expect(check.isValid).toBe(false);
    expect(check.violations[0]).toContain('Pitch violation');
  });

  it('detects pins extending outside core dimensions', () => {
    const core = { width: 400, height: 300 };
    const outPins = [
      { id: 'PIN_OOB', edge: 'top', coord: 450 }, // exceeds core.width (400)
    ];
    const check = validatePinPlacements(outPins, 10, core);
    expect(check.isValid).toBe(false);
    expect(check.violations[0]).toContain('exceeds top edge boundary');
  });
});
