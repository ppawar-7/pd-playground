import { describe, it, expect } from 'vitest';
import {
  computeCoreArea,
  computeUtilization,
  checkMacroOverlap,
  checkMacroCoreContainment,
  checkMacroToMacroClearance,
  computeHPWL,
  computePlacementRows,
  checkPinSpacing,
  worldToViewport,
  viewportToWorld,
  snapToGrid,
  computeBoundingBox,
  transformMacroOrientation,
} from '../../engine/floorplanGeometry.js';

// ---------------------------------------------------------------------------
// computeCoreArea
// ---------------------------------------------------------------------------
describe('computeCoreArea', () => {
  it('computes core area with uniform margin on all sides', () => {
    const die = { width: 500, height: 400 };
    const margins = { top: 20, bottom: 20, left: 20, right: 20 };
    const core = computeCoreArea(die, margins);
    expect(core.width).toBe(460);   // 500 - 20 - 20
    expect(core.height).toBe(360);  // 400 - 20 - 20
    expect(core.area).toBe(460 * 360);
    expect(core.x).toBe(20);
    expect(core.y).toBe(20);
  });

  it('computes core area with per-side margins (asymmetric)', () => {
    const die = { width: 600, height: 500 };
    const margins = { top: 10, bottom: 30, left: 15, right: 25 };
    const core = computeCoreArea(die, margins);
    expect(core.width).toBe(560);   // 600 - 15 - 25
    expect(core.height).toBe(460);  // 500 - 10 - 30
    expect(core.x).toBe(15);
    expect(core.y).toBe(30);        // origin y is bottom margin
  });

  it('computes core area with zero margins (core equals die)', () => {
    const die = { width: 300, height: 200 };
    const margins = { top: 0, bottom: 0, left: 0, right: 0 };
    const core = computeCoreArea(die, margins);
    expect(core.width).toBe(300);
    expect(core.height).toBe(200);
    expect(core.area).toBe(60000);
  });

  it('returns zero or clamped dimensions when margins exceed die', () => {
    const die = { width: 100, height: 100 };
    const margins = { top: 60, bottom: 60, left: 10, right: 10 };
    const core = computeCoreArea(die, margins);
    // height would be negative — expect 0 (clamped) or handled gracefully
    expect(core.height).toBeLessThanOrEqual(0);
    expect(core.area).toBeLessThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// computeUtilization
// ---------------------------------------------------------------------------
describe('computeUtilization', () => {
  it('computes nominal utilization correctly', () => {
    // coreArea=100000, stdCell=40000, macro=20000, blockage=5000
    const result = computeUtilization(100000, 40000, [{ area: 20000 }], [{ area: 5000 }]);
    // nominal = (stdCell + macro) / core = 60%
    expect(result.nominalUtilization).toBeCloseTo(60.0, 1);
  });

  it('computes effective utilization (excludes macro and blockage area)', () => {
    const result = computeUtilization(100000, 40000, [{ area: 20000 }], [{ area: 10000 }]);
    // effective = stdCell / (core - macro - blockage) = 40000/70000 = 57.14%
    expect(result.effectiveUtilization).toBeCloseTo(57.14, 1);
  });

  it('clamps overutilized case at 100 and sets a note', () => {
    // stdCell alone exceeds core
    const result = computeUtilization(10000, 15000, [], []);
    expect(result.nominalUtilization).toBe(100);
    expect(result.overutilized).toBe(true);
  });

  it('computes utilization with zero macros', () => {
    const result = computeUtilization(80000, 40000, [], []);
    expect(result.nominalUtilization).toBeCloseTo(50.0, 1);
    expect(result.effectiveUtilization).toBeCloseTo(50.0, 1);
  });

  it('computes utilization with multiple macros summed', () => {
    const macros = [{ area: 10000 }, { area: 10000 }];
    const result = computeUtilization(100000, 30000, macros, []);
    // nominal = (30k + 20k) / 100k = 50%
    expect(result.nominalUtilization).toBeCloseTo(50.0, 1);
  });

  it('returns zero utilization when stdCellArea is zero', () => {
    const result = computeUtilization(100000, 0, [], []);
    expect(result.nominalUtilization).toBe(0);
    expect(result.effectiveUtilization).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// checkMacroOverlap
// ---------------------------------------------------------------------------
describe('checkMacroOverlap', () => {
  it('returns no overlap for well-separated macros with no halo', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 50, height: 50, halo: 0 };
    const macroB = { id: 'B', x: 100, y: 0, width: 50, height: 50, halo: 0 };
    const result = checkMacroOverlap(macroA, macroB);
    expect(result.overlaps).toBe(false);
    expect(result.halosViolated).toBe(false);
  });

  it('detects direct body overlap', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 60, height: 60, halo: 0 };
    const macroB = { id: 'B', x: 40, y: 40, width: 60, height: 60, halo: 0 };
    const result = checkMacroOverlap(macroA, macroB);
    expect(result.overlaps).toBe(true);
  });

  it('macros exactly touching edges do not overlap', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 60, height: 40, halo: 0 };
    const macroB = { id: 'B', x: 60, y: 0, width: 60, height: 40, halo: 0 };
    const result = checkMacroOverlap(macroA, macroB);
    expect(result.overlaps).toBe(false);
  });

  it('halo separation: gap >= haloA + haloB → no violation', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 60, height: 40, halo: 15 };
    const macroB = { id: 'B', x: 95, y: 0, width: 60, height: 40, halo: 15 };
    // Gap between A right edge (60) and B left edge (95) = 35µm
    // Required: haloA(15) + haloB(15) = 30µm → gap 35 >= 30 → OK
    const result = checkMacroOverlap(macroA, macroB);
    expect(result.halosViolated).toBe(false);
  });

  it('halo separation: gap < haloA + haloB triggers violation', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 60, height: 40, halo: 15 };
    const macroB = { id: 'B', x: 80, y: 0, width: 60, height: 40, halo: 15 };
    // Gap = 80-60 = 20µm < required 30µm → violated
    const result = checkMacroOverlap(macroA, macroB);
    expect(result.halosViolated).toBe(true);
  });

  it('halo violation does not imply body overlap', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 60, height: 40, halo: 15 };
    const macroB = { id: 'B', x: 80, y: 0, width: 60, height: 40, halo: 15 };
    const result = checkMacroOverlap(macroA, macroB);
    expect(result.overlaps).toBe(false);
    expect(result.halosViolated).toBe(true);
  });

  it('zero halo macros side-by-side do not trigger halo violation', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 60, height: 40, halo: 0 };
    const macroB = { id: 'B', x: 61, y: 0, width: 60, height: 40, halo: 0 };
    const result = checkMacroOverlap(macroA, macroB);
    expect(result.overlaps).toBe(false);
    expect(result.halosViolated).toBe(false);
  });

  it('asymmetric halos: each is independent (haloA=20, haloB=10, gap=25 → violated since 20+10=30>25)', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 60, height: 40, halo: 20 };
    const macroB = { id: 'B', x: 85, y: 0, width: 60, height: 40, halo: 10 };
    // gap = 85-60 = 25, required = 20+10=30 → violated
    const result = checkMacroOverlap(macroA, macroB);
    expect(result.halosViolated).toBe(true);
  });

  it('macros far apart in Y with no overlap', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 50, height: 50, halo: 5 };
    const macroB = { id: 'B', x: 0, y: 100, width: 50, height: 50, halo: 5 };
    const result = checkMacroOverlap(macroA, macroB);
    expect(result.overlaps).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkMacroCoreContainment
// ---------------------------------------------------------------------------
describe('checkMacroCoreContainment', () => {
  const core = { x: 0, y: 0, width: 400, height: 300 };

  it('macro fully within core with halo cleared → contained: true, haloContained: true', () => {
    const macro = { x: 50, y: 50, width: 100, height: 80, halo: 10 };
    const result = checkMacroCoreContainment(macro, core);
    expect(result.contained).toBe(true);
    expect(result.haloContained).toBe(true);
  });

  it('macro body outside core → contained: false', () => {
    const macro = { x: 380, y: 50, width: 100, height: 80, halo: 0 };
    const result = checkMacroCoreContainment(macro, core);
    expect(result.contained).toBe(false);
  });

  it('macro body inside core but halo extends outside → haloContained: false, body contained: true', () => {
    const macro = { x: 5, y: 5, width: 100, height: 80, halo: 10 };
    // left halo: 5-10 = -5 → outside
    const result = checkMacroCoreContainment(macro, core);
    expect(result.contained).toBe(true);
    expect(result.haloContained).toBe(false);
  });

  it('macro exactly at core origin with zero halo → contained: true', () => {
    const macro = { x: 0, y: 0, width: 400, height: 300, halo: 0 };
    const result = checkMacroCoreContainment(macro, core);
    expect(result.contained).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkMacroToMacroClearance
// ---------------------------------------------------------------------------
describe('checkMacroToMacroClearance', () => {
  it('returns adequate: true when gap exceeds required clearance', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 60, height: 40 };
    const macroB = { id: 'B', x: 110, y: 0, width: 60, height: 40 };
    const result = checkMacroToMacroClearance(macroA, macroB, 20);
    expect(result.adequate).toBe(true);
  });

  it('returns adequate: false when gap is below required clearance', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 60, height: 40 };
    const macroB = { id: 'B', x: 70, y: 0, width: 60, height: 40 };
    // gap = 10, required = 20
    const result = checkMacroToMacroClearance(macroA, macroB, 20);
    expect(result.adequate).toBe(false);
  });

  it('returns adequate: true when gap exactly equals required clearance', () => {
    const macroA = { id: 'A', x: 0, y: 0, width: 60, height: 40 };
    const macroB = { id: 'B', x: 80, y: 0, width: 60, height: 40 };
    // gap = 20, required = 20
    const result = checkMacroToMacroClearance(macroA, macroB, 20);
    expect(result.adequate).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeHPWL
// ---------------------------------------------------------------------------
describe('computeHPWL', () => {
  it('computes HPWL for a 2-terminal net', () => {
    const macros = {
      A: { x: 0, y: 0, width: 10, height: 10 },
      B: { x: 100, y: 50, width: 10, height: 10 },
    };
    const nets = [{ id: 'n1', connections: ['A', 'B'] }];
    const result = computeHPWL(nets, macros, {});
    // HPWL: bbox of centers or macro origins
    // Bounding box: x=[0..100], y=[0..50] → HPWL=100+50=150 (or variant using centers)
    expect(result.totalHPWL).toBeGreaterThan(0);
  });

  it('computes HPWL for a 3-terminal net', () => {
    const macros = {
      A: { x: 0, y: 0, width: 10, height: 10 },
      B: { x: 100, y: 0, width: 10, height: 10 },
      C: { x: 50, y: 80, width: 10, height: 10 },
    };
    const nets = [{ id: 'n1', connections: ['A', 'B', 'C'] }];
    const result = computeHPWL(nets, macros, {});
    // bbox x=[0..100], y=[0..80] → 100+80=180 (or center-based)
    expect(result.totalHPWL).toBeGreaterThan(0);
  });

  it('single-point net (all same position) has HPWL of 0', () => {
    const macros = {
      A: { x: 50, y: 50, width: 10, height: 10 },
    };
    const nets = [{ id: 'n1', connections: ['A'] }];
    const result = computeHPWL(nets, macros, {});
    expect(result.totalHPWL).toBe(0);
  });

  it('empty nets list returns totalHPWL of 0', () => {
    const result = computeHPWL([], {}, {});
    expect(result.totalHPWL).toBe(0);
  });

  it('HPWL is non-negative', () => {
    const macros = {
      A: { x: 200, y: 100, width: 10, height: 10 },
      B: { x: 10, y: 300, width: 10, height: 10 },
    };
    const nets = [{ id: 'n1', connections: ['A', 'B'] }];
    const result = computeHPWL(nets, macros, {});
    expect(result.totalHPWL).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// computePlacementRows
// ---------------------------------------------------------------------------
describe('computePlacementRows', () => {
  it('computes correct row count from core height and row height', () => {
    const core = { x: 0, y: 0, width: 400, height: 300 };
    const result = computePlacementRows(core, 0.19, 1.4);
    // rowCount = floor(300 / 1.4) = 214
    expect(result.rowCount).toBe(Math.floor(300 / 1.4));
  });

  it('each row has correct x, y, width', () => {
    const core = { x: 10, y: 20, width: 200, height: 100 };
    const siteWidth = 0.19;
    const rowHeight = 2.0;
    const result = computePlacementRows(core, siteWidth, rowHeight);
    expect(result.rows.length).toBeGreaterThan(0);
    const firstRow = result.rows[0];
    expect(firstRow.x).toBe(10);
    expect(firstRow.y).toBe(20);
    expect(firstRow.width).toBe(200);
    expect(firstRow.height).toBe(rowHeight);
  });

  it('computes correct number of sites per row', () => {
    const core = { x: 0, y: 0, width: 190, height: 10 };
    const siteWidth = 0.19;
    const rowHeight = 2.0;
    const result = computePlacementRows(core, siteWidth, rowHeight);
    expect(result.rows[0].sitesPerRow).toBe(Math.floor(190 / siteWidth));
  });

  it('zero core height returns empty rows array', () => {
    const core = { x: 0, y: 0, width: 200, height: 0 };
    const result = computePlacementRows(core, 0.19, 1.4);
    expect(result.rowCount).toBe(0);
    expect(result.rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkPinSpacing
// ---------------------------------------------------------------------------
describe('checkPinSpacing', () => {
  it('passes when all pins are adequately spaced', () => {
    const pins = [
      { id: 'p1', position: 50 },
      { id: 'p2', position: 150 },
      { id: 'p3', position: 250 },
    ];
    const result = checkPinSpacing(pins, 'left', 20, 400, 300);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('detects spacing violation when two pins are too close', () => {
    const pins = [
      { id: 'p1', position: 50 },
      { id: 'p2', position: 60 }, // only 10 apart, min=20
      { id: 'p3', position: 250 },
    ];
    const result = checkPinSpacing(pins, 'left', 20, 400, 300);
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('single pin has no spacing violation', () => {
    const pins = [{ id: 'p1', position: 100 }];
    const result = checkPinSpacing(pins, 'bottom', 20, 400, 300);
    expect(result.valid).toBe(true);
  });

  it('two pins exactly at minimum spacing pass', () => {
    const pins = [
      { id: 'p1', position: 50 },
      { id: 'p2', position: 70 }, // exactly 20 apart = minSpacing
    ];
    const result = checkPinSpacing(pins, 'top', 20, 400, 300);
    expect(result.valid).toBe(true);
  });

  it('pin beyond core dimension triggers out-of-bounds violation', () => {
    const pins = [{ id: 'p1', position: 500 }]; // beyond 300 height
    const result = checkPinSpacing(pins, 'left', 20, 400, 300);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// worldToViewport / viewportToWorld — round-trip
// ---------------------------------------------------------------------------
describe('worldToViewport and viewportToWorld', () => {
  const viewport = { x: 100, y: 50, scale: 2.0 };

  it('worldToViewport converts world coordinates to screen space', () => {
    const screen = worldToViewport(10, 20, viewport);
    expect(typeof screen.x).toBe('number');
    expect(typeof screen.y).toBe('number');
  });

  it('viewportToWorld inverts worldToViewport (round-trip)', () => {
    const wx = 42, wy = 73;
    const screen = worldToViewport(wx, wy, viewport);
    const world = viewportToWorld(screen.x, screen.y, viewport);
    expect(world.x).toBeCloseTo(wx, 5);
    expect(world.y).toBeCloseTo(wy, 5);
  });

  it('round-trip preserves origin', () => {
    const screen = worldToViewport(0, 0, viewport);
    const world = viewportToWorld(screen.x, screen.y, viewport);
    expect(world.x).toBeCloseTo(0, 5);
    expect(world.y).toBeCloseTo(0, 5);
  });

  it('scale=1 leaves world coords shifted only by viewport offset', () => {
    const vp1 = { x: 0, y: 0, scale: 1 };
    const screen = worldToViewport(55, 77, vp1);
    const world = viewportToWorld(screen.x, screen.y, vp1);
    expect(world.x).toBeCloseTo(55, 5);
    expect(world.y).toBeCloseTo(77, 5);
  });
});

// ---------------------------------------------------------------------------
// snapToGrid
// ---------------------------------------------------------------------------
describe('snapToGrid', () => {
  it('snaps value to nearest grid point (round down)', () => {
    expect(snapToGrid(14, 5)).toBe(15); // round to nearest 5
  });

  it('snaps value to nearest grid point (round down from midpoint)', () => {
    expect(snapToGrid(12, 5)).toBe(10);
  });

  it('value already on grid returns same value', () => {
    expect(snapToGrid(20, 5)).toBe(20);
  });

  it('zero snaps to 0', () => {
    expect(snapToGrid(0, 10)).toBe(0);
  });

  it('fractional grid size works correctly', () => {
    expect(snapToGrid(0.19, 0.19)).toBeCloseTo(0.19, 5);
  });

  it('negative values snap correctly', () => {
    const result = snapToGrid(-13, 5);
    expect(result % 5).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// computeBoundingBox
// ---------------------------------------------------------------------------
describe('computeBoundingBox', () => {
  it('returns correct bounding box for a single rect', () => {
    const rects = [{ x: 10, y: 20, width: 50, height: 30 }];
    const bb = computeBoundingBox(rects);
    expect(bb.x).toBe(10);
    expect(bb.y).toBe(20);
    expect(bb.width).toBe(50);
    expect(bb.height).toBe(30);
  });

  it('computes bounding box spanning multiple rects', () => {
    const rects = [
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 100, y: 80, width: 60, height: 40 },
    ];
    const bb = computeBoundingBox(rects);
    expect(bb.x).toBe(0);
    expect(bb.y).toBe(0);
    expect(bb.width).toBe(160);  // 100+60
    expect(bb.height).toBe(120); // 80+40
  });

  it('single point rect has zero area bounding box', () => {
    const rects = [{ x: 50, y: 50, width: 0, height: 0 }];
    const bb = computeBoundingBox(rects);
    expect(bb.width).toBe(0);
    expect(bb.height).toBe(0);
  });

  it('negative origin rects are handled correctly', () => {
    const rects = [
      { x: -20, y: -10, width: 40, height: 30 },
      { x: 10, y: 15, width: 20, height: 10 },
    ];
    const bb = computeBoundingBox(rects);
    expect(bb.x).toBe(-20);
    expect(bb.y).toBe(-10);
  });
});

// ---------------------------------------------------------------------------
// transformMacroOrientation
// ---------------------------------------------------------------------------
describe('transformMacroOrientation', () => {
  const macro = { width: 100, height: 40 };

  it('R0 orientation leaves width and height unchanged', () => {
    const result = transformMacroOrientation(macro, 'R0');
    expect(result.width).toBe(100);
    expect(result.height).toBe(40);
  });

  it('R90 orientation swaps width and height', () => {
    const result = transformMacroOrientation(macro, 'R90');
    expect(result.width).toBe(40);
    expect(result.height).toBe(100);
  });

  it('R180 orientation leaves width and height unchanged (180° flip)', () => {
    const result = transformMacroOrientation(macro, 'R180');
    expect(result.width).toBe(100);
    expect(result.height).toBe(40);
  });

  it('R270 orientation swaps width and height (same as R90 for w/h)', () => {
    const result = transformMacroOrientation(macro, 'R270');
    expect(result.width).toBe(40);
    expect(result.height).toBe(100);
  });

  it('square macro: all orientations produce same dimensions', () => {
    const sq = { width: 60, height: 60 };
    ['R0', 'R90', 'R180', 'R270'].forEach(orient => {
      const r = transformMacroOrientation(sq, orient);
      expect(r.width).toBe(60);
      expect(r.height).toBe(60);
    });
  });
});
