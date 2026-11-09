/**
 * floorplanGeometry.js
 * =====================
 * Pure deterministic physical layout and geometric calculation engine.
 * Powers Floorplanning Studio 2.0 and expanded 24-lesson curriculum.
 *
 * All coordinates and dimensions are in micrometers (µm).
 * All functions are pure with zero side-effects.
 */

/**
 * Compute core dimensions from die dimensions and uniform or per-side margins.
 * Supports both origin conventions (x=left, y=bottom or y=top).
 *
 * @param {{ width: number, height: number }} die
 * @param {number|{ top?: number, bottom?: number, left?: number, right?: number }} margins
 */
export function computeCoreArea(die, margins = 20) {
  const safeDieW = Math.max(0, Number(die?.width) || 0);
  const safeDieH = Math.max(0, Number(die?.height) || 0);

  let top, bottom, left, right;
  if (typeof margins === 'number') {
    top = bottom = left = right = Math.max(0, margins);
  } else {
    top = Math.max(0, Number(margins?.top) || 0);
    bottom = Math.max(0, Number(margins?.bottom) || 0);
    left = Math.max(0, Number(margins?.left) || 0);
    right = Math.max(0, Number(margins?.right) || 0);
  }

  const width = Math.max(0, safeDieW - left - right);
  const height = Math.max(0, safeDieH - top - bottom);
  const x = left;
  const y = bottom; // Origin y is bottom margin in standard EDA layout
  const area = Number((width * height).toFixed(2));
  const dieArea = Number((safeDieW * safeDieH).toFixed(2));

  return {
    width,
    height,
    coreWidth: width,
    coreHeight: height,
    x,
    y,
    coreX: x,
    coreY: y,
    area,
    coreArea: area,
    dieArea,
    marginTop: top,
    marginBottom: bottom,
    marginLeft: left,
    marginRight: right,
  };
}

/**
 * Inverse calculation: compute die size required from core dimensions and margins.
 */
export function computeDieFromCore(core, margins = 20) {
  const safeCoreW = Math.max(0, Number(core?.width) || 0);
  const safeCoreH = Math.max(0, Number(core?.height) || 0);

  let top, bottom, left, right;
  if (typeof margins === 'number') {
    top = bottom = left = right = Math.max(0, margins);
  } else {
    top = Math.max(0, Number(margins?.top) || 0);
    bottom = Math.max(0, Number(margins?.bottom) || 0);
    left = Math.max(0, Number(margins?.left) || 0);
    right = Math.max(0, Number(margins?.right) || 0);
  }

  const dieWidth = safeCoreW + left + right;
  const dieHeight = safeCoreH + top + bottom;
  const dieArea = Number((dieWidth * dieHeight).toFixed(2));
  const coreArea = Number((safeCoreW * safeCoreH).toFixed(2));

  return {
    dieWidth,
    dieHeight,
    dieArea,
    coreArea,
    marginTop: top,
    marginBottom: bottom,
    marginLeft: left,
    marginRight: right,
  };
}

/**
 * Calculate comprehensive utilization metrics.
 * Distinguishes Die, Core, Macro, Blockage, StdCell and Effective utilization.
 * Handles both { area } and { width, height } objects.
 *
 * @param {number} coreArea
 * @param {number} stdCellAreaUm2
 * @param {Array|Object} macros
 * @param {Array|Object} blockages
 */
export function computeUtilization(coreArea, stdCellAreaUm2 = 0, macros = [], blockages = [], coreRect = null) {
  const safeCoreArea = Math.max(0, Number(coreArea) || 0);
  const safeStdCellArea = Math.max(0, Number(stdCellAreaUm2) || 0);

  const getAreaSum = (items) => {
    if (!items) return 0;
    const arr = Array.isArray(items) ? items : Object.values(items);
    return arr.reduce((acc, item) => {
      if (!item) return acc;
      if (typeof item.area === 'number') return acc + Math.max(0, item.area);
      const w = Number(item.width) || 0;
      const h = Number(item.height) || 0;
      return acc + Math.max(0, w * h);
    }, 0);
  };

  const macroArea = getAreaSum(macros);
  const blockageArea = getAreaSum(blockages);

  if (safeCoreArea <= 0) {
    return {
      coreArea: 0,
      stdCellArea: safeStdCellArea,
      macroArea,
      blockageArea,
      nominalUtilization: 0,
      rawNominalUtilization: 0,
      placeableArea: 0,
      keepoutArea: 0,
      effectiveUtilization: 0,
      overutilized: false,
      routableArea: 0,
      allNames: {
        nominal: 'Nominal Utilization = (StdCell + Macro) / CoreArea',
        effective: 'Effective Placement Utilization = StdCell / (CoreArea - Macro - Blockage)',
        routable: 'Routable Standard Cell Area = CoreArea - Macro - Blockage',
      },
    };
  }

  const rawNominal = ((safeStdCellArea + macroArea) / safeCoreArea) * 100;
  const overutilized = rawNominal > 100;
  const nominalUtilization = overutilized ? 100 : Number(rawNominal.toFixed(2));

  const routableArea = Math.max(0, safeCoreArea - macroArea - blockageArea);

  // When the core rectangle is known, compute the real placeable area: core minus the
  // union of (macro + keepout halo) and blockage rectangles, clipped to the core.
  // This avoids double counting overlaps and accounts for halo keepouts.
  let placeableArea = null;
  let keepoutArea = null;
  if (coreRect && Number(coreRect.width) > 0 && Number(coreRect.height) > 0) {
    const list = (items, withHalo) => (Array.isArray(items) ? items : Object.values(items || {}))
      .filter((it) => it && Number.isFinite(Number(it.x)) && Number.isFinite(Number(it.y)))
      .map((it) => {
        const h = withHalo ? Math.max(0, Number(it.halo) || 0) : 0;
        return { x: Number(it.x) - h, y: Number(it.y) - h, width: (Number(it.width) || 0) + 2 * h, height: (Number(it.height) || 0) + 2 * h };
      });
    keepoutArea = Number(unionAreaClipped([...list(macros, true), ...list(blockages, false)], coreRect).toFixed(2));
    placeableArea = Number(Math.max(0, safeCoreArea - keepoutArea).toFixed(2));
  }

  const denominator = placeableArea !== null ? placeableArea : routableArea;
  const rawEffective = denominator > 0 ? (safeStdCellArea / denominator) * 100 : 100;
  const effectiveUtilization = Number(rawEffective.toFixed(2));

  return {
    coreArea: Number(safeCoreArea.toFixed(2)),
    stdCellArea: Number(safeStdCellArea.toFixed(2)),
    macroArea: Number(macroArea.toFixed(2)),
    blockageArea: Number(blockageArea.toFixed(2)),
    nominalUtilization,
    rawNominalUtilization: Number(rawNominal.toFixed(2)),
    effectiveUtilization,
    overutilized,
    routableArea: Number(routableArea.toFixed(2)),
    placeableArea,
    keepoutArea,
    allNames: {
      nominal: 'Nominal Utilization = (StdCell + Macro) / CoreArea',
      effective: placeableArea !== null
        ? 'Effective Placement Utilization = StdCell / (CoreArea - ∪(Macro+Halo, Blockage))'
        : 'Effective Placement Utilization = StdCell / (CoreArea - Macro - Blockage)',
      routable: 'Routable Standard Cell Area = CoreArea - Macro - Blockage',
    },
  };
}

/**
 * Area of the union of axis-aligned rectangles, clipped to `clip`
 * (coordinate-compression sweep; exact for rectangles).
 */
export function unionAreaClipped(rects = [], clip) {
  const cx0 = Number(clip.x) || 0;
  const cy0 = Number(clip.y) || 0;
  const cx1 = cx0 + (Number(clip.width) || 0);
  const cy1 = cy0 + (Number(clip.height) || 0);
  const rs = rects
    .map((r) => ({
      x0: Math.max(cx0, r.x), y0: Math.max(cy0, r.y),
      x1: Math.min(cx1, r.x + r.width), y1: Math.min(cy1, r.y + r.height),
    }))
    .filter((r) => r.x1 > r.x0 && r.y1 > r.y0);
  if (rs.length === 0) return 0;
  const xs = [...new Set(rs.flatMap((r) => [r.x0, r.x1]))].sort((a, b) => a - b);
  let area = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    const xa = xs[i];
    const xb = xs[i + 1];
    const spans = rs.filter((r) => r.x0 <= xa && r.x1 >= xb).map((r) => [r.y0, r.y1]).sort((a, b) => a[0] - b[0]);
    let covered = 0;
    let curStart = null;
    let curEnd = null;
    spans.forEach(([a, b]) => {
      if (curEnd === null || a > curEnd) {
        if (curEnd !== null) covered += curEnd - curStart;
        curStart = a;
        curEnd = b;
      } else if (b > curEnd) {
        curEnd = b;
      }
    });
    if (curEnd !== null) covered += curEnd - curStart;
    area += covered * (xb - xa);
  }
  return area;
}

/**
 * Check macro overlap and per-macro keepout halo violations.
 * CRITICAL RULE: Each macro has its own keepout halo.
 * The required minimum center-to-center edge separation is haloA + haloB!
 *
 * @param {Object} macroA - { id, x, y, width, height, halo }
 * @param {Object} macroB - { id, x, y, width, height, halo }
 */
export function checkMacroOverlap(macroA, macroB) {
  if (!macroA || !macroB) {
    return { overlaps: false, overlapArea: 0, requiredSeparation: 0, actualGapX: 0, actualGapY: 0, halosViolated: false };
  }

  const wA = Number(macroA.width) || 0;
  const hA = Number(macroA.height) || 0;
  const wB = Number(macroB.width) || 0;
  const hB = Number(macroB.height) || 0;

  if (wA <= 0 || hA <= 0 || wB <= 0 || hB <= 0) {
    return { overlaps: false, overlapArea: 0, requiredSeparation: 0, actualGapX: 0, actualGapY: 0, halosViolated: false };
  }

  const haloA = Math.max(0, Number(macroA.halo) >= 0 ? Number(macroA.halo) : 0);
  const haloB = Math.max(0, Number(macroB.halo) >= 0 ? Number(macroB.halo) : 0);
  const requiredSeparation = haloA + haloB;

  const aLeft = macroA.x;
  const aRight = macroA.x + wA;
  const aTop = macroA.y;
  const aBottom = macroA.y + hA;

  const bLeft = macroB.x;
  const bRight = macroB.x + wB;
  const bTop = macroB.y;
  const bBottom = macroB.y + hB;

  // Direct physical body overlap (open-interval: touching boundary edges does not overlap)
  const xOverlap = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));
  const yOverlap = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop));
  const directOverlap = xOverlap > 0 && yOverlap > 0;
  const overlapArea = directOverlap ? Number((xOverlap * yOverlap).toFixed(2)) : 0;

  // Actual gap between macro edges (0 if overlapping in that axis)
  let actualGapX = 0;
  if (aRight <= bLeft) actualGapX = bLeft - aRight;
  else if (bRight <= aLeft) actualGapX = aLeft - bRight;

  let actualGapY = 0;
  if (aBottom <= bTop) actualGapY = bTop - aBottom;
  else if (bBottom <= aTop) actualGapY = aTop - bBottom;

  let halosViolated = directOverlap;
  if (!directOverlap && requiredSeparation > 0) {
    const xOverlapExtent = Math.min(aRight, bRight) - Math.max(aLeft, bLeft);
    const yOverlapExtent = Math.min(aBottom, bBottom) - Math.max(aTop, bTop);

    // If they span across each other in X, Y clearance must be >= requiredSeparation
    if (xOverlapExtent > 0 && actualGapY < requiredSeparation) {
      halosViolated = true;
    }
    // If they span across each other in Y, X clearance must be >= requiredSeparation
    if (yOverlapExtent > 0 && actualGapX < requiredSeparation) {
      halosViolated = true;
    }
    // Diagonal proximity
    if (xOverlapExtent <= 0 && yOverlapExtent <= 0) {
      if (actualGapX < requiredSeparation && actualGapY < requiredSeparation) {
        halosViolated = true;
      }
    }
  }

  return {
    overlaps: directOverlap,
    overlapArea,
    requiredSeparation,
    actualGapX: Number(actualGapX.toFixed(2)),
    actualGapY: Number(actualGapY.toFixed(2)),
    halosViolated,
  };
}

/**
 * Check macro containment within core boundary, taking halo keepout into account.
 */
export function checkMacroCoreContainment(macro, core) {
  if (!macro || !core) return { contained: false, haloContained: false, violations: ['Invalid macro or core'] };

  const violations = [];
  const halo = Math.max(0, Number(macro.halo) || 0);
  const coreW = Number(core.width) || 0;
  const coreH = Number(core.height) || 0;
  const coreX = Number(core.x) || 0;
  const coreY = Number(core.y) || 0;

  const mLeft = macro.x;
  const mRight = macro.x + (Number(macro.width) || 0);
  const mTop = macro.y;
  const mBottom = macro.y + (Number(macro.height) || 0);

  const contained = mLeft >= coreX && mTop >= coreY && mRight <= coreX + coreW && mBottom <= coreY + coreH;

  if (mLeft < coreX) violations.push(`Macro left edge (${mLeft}µm) is outside core left bound (${coreX}µm)`);
  if (mTop < coreY) violations.push(`Macro top edge (${mTop}µm) is outside core top bound (${coreY}µm)`);
  if (mRight > coreX + coreW) violations.push(`Macro right edge (${mRight}µm) exceeds core right bound (${coreX + coreW}µm)`);
  if (mBottom > coreY + coreH) violations.push(`Macro bottom edge (${mBottom}µm) exceeds core bottom bound (${coreY + coreH}µm)`);

  const haloContained = (mLeft - halo >= coreX) && (mTop - halo >= coreY) &&
                        (mRight + halo <= coreX + coreW) && (mBottom + halo <= coreY + coreH);

  return {
    contained,
    haloContained,
    violations,
  };
}

/**
 * Check clearance gap between two macros against required clearance.
 */
export function checkMacroToMacroClearance(macroA, macroB, requiredParam) {
  const overlapInfo = checkMacroOverlap(macroA, macroB);
  const req = typeof requiredParam === 'number' ? requiredParam : overlapInfo.requiredSeparation;

  const gap = Math.max(overlapInfo.actualGapX, overlapInfo.actualGapY);
  const adequate = !overlapInfo.overlaps && gap >= req;

  return {
    adequate,
    requiredClearance: req,
    actualGapX: overlapInfo.actualGapX,
    actualGapY: overlapInfo.actualGapY,
    gap,
    clearX: overlapInfo.actualGapX >= req,
    clearY: overlapInfo.actualGapY >= req,
    fullyCleared: adequate,
  };
}

/**
 * Physical location of an I/O pin.
 * `coord` is the offset along the edge measured from the core origin (x for top/bottom,
 * y for left/right). Without a die the pin sits on the core edge (legacy behaviour);
 * with a die the pin sits on the die boundary, which is where I/O pins physically are.
 */
export function pinLocation(p, core, die = null) {
  if (typeof p.x === 'number' && typeof p.y === 'number') return { x: p.x, y: p.y };
  const pos = typeof p.coord === 'number' ? p.coord : p.position || 0;
  const cx = Number(core?.x) || 0;
  const cy = Number(core?.y) || 0;
  const cw = Number(core?.width) || 0;
  const ch = Number(core?.height) || 0;
  const hasDie = die && Number(die.width) > 0 && Number(die.height) > 0;
  const dx = hasDie ? Number(die.x) || 0 : cx;
  const dy = hasDie ? Number(die.y) || 0 : cy;
  const left = dx;
  const right = hasDie ? dx + Number(die.width) : cx + cw;
  const top = dy;
  const bottom = hasDie ? dy + Number(die.height) : cy + ch;
  if (p.edge === 'bottom') return { x: cx + pos, y: bottom };
  if (p.edge === 'left') return { x: left, y: cy + pos };
  if (p.edge === 'right') return { x: right, y: cy + pos };
  return { x: cx + pos, y: top };
}

/**
 * Compute Half-Perimeter Wirelength (HPWL) for nets across macros and pins.
 * Supports both array and dictionary shapes for macros/pins/nets.
 *
 * @param {Array} nets
 * @param {Array|Object} macros
 * @param {Array|Object} pins
 * @param {Object} core
 * @param {Object|null} die - when given, pins sit on the die boundary (physical I/O location)
 */
export function computeHPWL(nets = [], macros = [], pins = [], core = { x: 0, y: 0, width: 400, height: 300 }, die = null) {
  const macroMap = new Map();
  if (Array.isArray(macros)) {
    macros.forEach((m) => macroMap.set(m.id, m));
  } else if (macros && typeof macros === 'object') {
    Object.entries(macros).forEach(([k, v]) => macroMap.set(k, { ...v, id: k }));
  }

  const pinMap = new Map();
  if (Array.isArray(pins)) {
    pins.forEach((p) => pinMap.set(p.id, p));
  } else if (pins && typeof pins === 'object') {
    Object.entries(pins).forEach(([k, v]) => pinMap.set(k, { ...v, id: k }));
  }

  const getNodeCoord = (nodeId) => {
    if (macroMap.has(nodeId)) {
      const m = macroMap.get(nodeId);
      // Support center coordinate
      return { x: m.x + (m.width || 0) / 2, y: m.y + (m.height || 0) / 2 };
    }
    if (pinMap.has(nodeId)) {
      const p = pinMap.get(nodeId);
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        return { x: p.x, y: p.y };
      }
      return pinLocation(p, core, die);
    }
    return null;
  };

  let totalHPWL = 0;
  const perNet = (nets || []).map((net) => {
    const nodes = [
      ...(net.sources || []),
      ...(net.sinks || []),
      ...(net.connections || []),
    ];
    const coords = nodes.map(getNodeCoord).filter(Boolean);

    if (coords.length < 2) {
      return { netId: net.id, hpwl: 0, bbox: null };
    }

    const xs = coords.map((c) => c.x);
    const ys = coords.map((c) => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const hpwl = Number(((maxX - minX) + (maxY - minY)).toFixed(2));
    totalHPWL += hpwl;

    return {
      netId: net.id,
      hpwl,
      bbox: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY },
    };
  });

  return {
    totalHPWL: Number(totalHPWL.toFixed(2)),
    perNet,
  };
}

/**
 * Generate standard cell placement rows inside core.
 * Returns an object with { rowCount, rows } where rows also matches the array structure.
 */
export function computePlacementRows(core, siteWidth = 0.46, rowHeight = 2.72) {
  const safeCoreW = Math.max(0, Number(core?.width) || 0);
  const safeCoreH = Math.max(0, Number(core?.height) || 0);
  const coreX = Number(core?.x) || 0;
  const coreY = Number(core?.y) || 0;

  if (rowHeight <= 0 || safeCoreH <= 0 || safeCoreW <= 0) {
    const emptyResult = [];
    emptyResult.rowCount = 0;
    emptyResult.rows = [];
    return emptyResult;
  }

  const numRows = Math.floor(safeCoreH / rowHeight);
  const numSites = Math.floor(safeCoreW / siteWidth);
  const rows = [];

  for (let i = 0; i < numRows; i++) {
    rows.push({
      rowIndex: i,
      x: coreX,
      y: Number((coreY + i * rowHeight).toFixed(2)),
      width: safeCoreW,
      height: rowHeight,
      siteWidth,
      sitesPerRow: numSites,
      numSites,
      orientation: i % 2 === 0 ? 'FS' : 'N',
    });
  }

  // Dual return type: can be treated as array or as { rowCount, rows }
  rows.rowCount = numRows;
  rows.rows = rows;
  return rows;
}

/**
 * Check placement blockage intersections.
 */
export function checkBlockageIntersection(blockages = []) {
  const pairs = [];
  for (let i = 0; i < blockages.length; i++) {
    for (let j = i + 1; j < blockages.length; j++) {
      const b1 = blockages[i];
      const b2 = blockages[j];
      const overlapX = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
      const overlapY = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));
      if (overlapX > 0 && overlapY > 0) {
        pairs.push({ a: b1.id, b: b2.id, overlapArea: Number((overlapX * overlapY).toFixed(2)) });
      }
    }
  }

  return {
    hasOverlap: pairs.length > 0,
    pairs,
  };
}

/**
 * Validate I/O pin spacing along a core edge.
 * Supports both { position } and { coord }.
 */
export function checkPinSpacing(pins = [], side = 'top', minSpacing = 10, coreWidth = 400, coreHeight = 300) {
  const edgePins = pins.filter((p) => !p.edge || p.edge === side);
  const getPos = (p) => (typeof p.coord === 'number' ? p.coord : p.position || 0);

  edgePins.sort((a, b) => getPos(a) - getPos(b));

  const violations = [];
  const maxCoord = side === 'top' || side === 'bottom' ? coreWidth : coreHeight;

  // Boundary check
  edgePins.forEach((p) => {
    const pos = getPos(p);
    if (pos < 0 || pos > maxCoord) {
      violations.push({
        pinA: p.id,
        pinB: null,
        actualSpacing: 0,
        requiredSpacing: minSpacing,
        message: `Pin ${p.id} coordinate ${pos} exceeds boundary max ${maxCoord}`,
      });
    }
  });

  // Pitch spacing check
  for (let i = 0; i < edgePins.length - 1; i++) {
    const p1 = edgePins[i];
    const p2 = edgePins[i + 1];
    const actualSpacing = getPos(p2) - getPos(p1);

    if (actualSpacing < minSpacing) {
      violations.push({
        pinA: p1.id,
        pinB: p2.id,
        actualSpacing: Number(actualSpacing.toFixed(2)),
        requiredSpacing: minSpacing,
        message: `Pins ${p1.id} and ${p2.id} on ${side} edge are spaced ${actualSpacing}µm apart (minimum: ${minSpacing}µm)`,
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Check if a pin is contained within die edge boundaries.
 */
export function checkPinContainment(pin, die) {
  if (!pin || !die) return { contained: false, violation: 'Null pin or die' };
  const maxCoord = pin.edge === 'top' || pin.edge === 'bottom' ? die.width : die.height;
  const coord = typeof pin.coord === 'number' ? pin.coord : pin.position || 0;

  if (coord < 0 || coord > maxCoord) {
    return {
      contained: false,
      violation: `Pin ${pin.id} coordinate (${coord}µm) exceeds ${pin.edge} edge boundary [0, ${maxCoord}µm]`,
    };
  }

  return { contained: true };
}

/**
 * Transform macro dimensions & coordinates for orientation (R0, R90, R180, R270, MX, MY, etc.)
 */
export function transformMacroOrientation(macro, orientation = 'R0') {
  if (!macro) return null;
  const w = Number(macro.width) || 0;
  const h = Number(macro.height) || 0;

  // The stored width/height already reflect the macro's current orientation, so the
  // footprint only swaps when the change flips between a 0°/180° family and a 90°/270° family.
  const isQuarterTurn = (o) => o === 'R90' || o === 'R270' || o === 'MXR90' || o === 'MYR90';
  const swapsDimensions = isQuarterTurn(macro.orientation || 'R0') !== isQuarterTurn(orientation);

  return {
    ...macro,
    width: swapsDimensions ? h : w,
    height: swapsDimensions ? w : h,
    orientation,
  };
}

/**
 * Viewport / World Coordinate Transformations.
 * Supports both { x, y, scale } and { offsetX, offsetY, zoom }.
 */
export function worldToViewport(x, y, viewport) {
  const scale = typeof viewport?.scale === 'number' ? viewport.scale : viewport?.zoom || 1;
  const offsetX = typeof viewport?.x === 'number' ? viewport.x : viewport?.offsetX || 0;
  const offsetY = typeof viewport?.y === 'number' ? viewport.y : viewport?.offsetY || 0;

  const px = (x * scale) + offsetX;
  const py = (y * scale) + offsetY;

  return {
    x: px,
    y: py,
    px,
    py,
  };
}

export function viewportToWorld(px, py, viewport) {
  const scale = typeof viewport?.scale === 'number' ? viewport.scale : viewport?.zoom || 1;
  const offsetX = typeof viewport?.x === 'number' ? viewport.x : viewport?.offsetX || 0;
  const offsetY = typeof viewport?.y === 'number' ? viewport.y : viewport?.offsetY || 0;

  const x = (px - offsetX) / scale;
  const y = (py - offsetY) / scale;

  return {
    x,
    y,
  };
}

/**
 * Compute enclosing bounding box for rectangles.
 * Returns { x, y, width, height, minX, minY, maxX, maxY }.
 */
export function computeBoundingBox(rects = []) {
  if (!rects || rects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  rects.forEach((r) => {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + (r.width || 0));
    maxY = Math.max(maxY, r.y + (r.height || 0));
  });

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    x: minX,
    y: minY,
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
  };
}

/**
 * Snap coordinate value to grid.
 */
export function snapToGrid(value, gridSize = 5) {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Aspect ratio helper.
 */
export function computeAspectRatio(width, height) {
  const w = Math.max(0, Number(width) || 0);
  const h = Math.max(0, Number(height) || 0);
  if (w <= 0) return { ratio: 0, isLandscape: false, isPortrait: false, isSquare: false };
  const ratio = Number((h / w).toFixed(3));
  return {
    ratio,
    isLandscape: ratio < 0.95,
    isPortrait: ratio > 1.05,
    isSquare: ratio >= 0.95 && ratio <= 1.05,
  };
}


/**
 * Transform a pin offset (px, py) on a macro master into world coordinates
 * based on macro position, dimensions, and orientation.
 */
export function transformMacroPin(macro, pin, masterDim = null) {
  if (!macro || !pin) return { x: 0, y: 0, worldX: 0, worldY: 0 };

  const mx = Number(macro.x) || 0;
  const my = Number(macro.y) || 0;
  const px = Number(pin.x) || 0;
  const py = Number(pin.y) || 0;
  const orientation = macro.orientation || 'R0';

  const isQuarterTurn = orientation === 'R90' || orientation === 'R270' || orientation === 'MXR90' || orientation === 'MYR90';
  const masterW = masterDim?.width || (isQuarterTurn ? macro.height : macro.width) || 80;
  const masterH = masterDim?.height || (isQuarterTurn ? macro.width : macro.height) || 60;

  let localX = px;
  let localY = py;

  switch (orientation) {
    case 'R0':
      localX = px;
      localY = py;
      break;
    case 'R90':
      localX = masterH - py;
      localY = px;
      break;
    case 'R180':
      localX = masterW - px;
      localY = masterH - py;
      break;
    case 'R270':
      localX = py;
      localY = masterW - px;
      break;
    case 'MX':
      localX = px;
      localY = masterH - py;
      break;
    case 'MY':
      localX = masterW - px;
      localY = py;
      break;
    default:
      localX = px;
      localY = py;
  }

  const worldX = Number((mx + localX).toFixed(2));
  const worldY = Number((my + localY).toFixed(2));

  return {
    x: worldX,
    y: worldY,
    worldX,
    worldY,
    localX,
    localY,
  };
}

/**
 * Automated Assistant: Macro Legalizer.
 */
export function assistedMacroLegalization(project, gridStep = 5) {
  if (!project || !project.core || !Array.isArray(project.macros)) {
    return { success: false, modifiedMacros: [], message: 'Invalid project data.' };
  }

  const core = project.core;
  const macros = project.macros.map((m) => ({ ...m }));
  const blockages = project.blockages || [];
  let modifiedCount = 0;

  for (let i = 0; i < macros.length; i++) {
    const m = macros[i];
    if (m.fixed) continue;

    const containment = checkMacroCoreContainment(m, core);
    let hasViolation = !containment.contained;

    if (!hasViolation) {
      for (let j = 0; j < macros.length; j++) {
        if (i === j) continue;
        const ov = checkMacroOverlap(m, macros[j]);
        if (ov.overlaps || ov.halosViolated) {
          hasViolation = true;
          break;
        }
      }
    }

    if (!hasViolation) continue;

    const halo = Number(m.halo) || 15;
    const minX = core.x + halo;
    const maxX = core.x + core.width - m.width - halo;
    const minY = core.y + halo;
    const maxY = core.y + core.height - m.height - halo;

    let foundLegal = false;
    let bestX = m.x;
    let bestY = m.y;
    let minDistance = Infinity;

    for (let x = minX; x <= maxX; x += gridStep) {
      for (let y = minY; y <= maxY; y += gridStep) {
        const candidate = { ...m, x, y };

        let conflict = false;
        for (let j = 0; j < macros.length; j++) {
          if (i === j) continue;
          const ov = checkMacroOverlap(candidate, macros[j]);
          if (ov.overlaps || ov.halosViolated) {
            conflict = true;
            break;
          }
        }

        if (!conflict) {
          for (const blk of blockages) {
            if (blk.type === 'placement_hard') {
              const xOv = Math.max(0, Math.min(x + m.width, blk.x + blk.width) - Math.max(x, blk.x));
              const yOv = Math.max(0, Math.min(y + m.height, blk.y + blk.height) - Math.max(y, blk.y));
              if (xOv > 0 && yOv > 0) {
                conflict = true;
                break;
              }
            }
          }
        }

        if (!conflict) {
          const dist = Math.hypot(x - m.x, y - m.y);
          if (dist < minDistance) {
            minDistance = dist;
            bestX = x;
            bestY = y;
            foundLegal = true;
          }
        }
      }
    }

    if (foundLegal) {
      m.x = bestX;
      m.y = bestY;
      modifiedCount++;
    }
  }

  return {
    success: modifiedCount > 0,
    modifiedMacros: macros,
    macros,
    movedCount: modifiedCount,
    message: modifiedCount > 0
      ? `Successfully legalized ${modifiedCount} macro(s) on a ${gridStep}µm grid.`
      : 'All macros are already legal, or no conflict-free placement could be found.',
  };
}

/**
 * Automated Assistant: Pin Legalizer.
 */
export function assistedPinLegalization(project, minPitch = 5) {
  if (!project || !project.core || !Array.isArray(project.pins)) {
    return { success: false, modifiedPins: [], message: 'Invalid project data.' };
  }

  const core = project.core;
  const pins = project.pins.map((p) => ({ ...p }));
  let adjustedCount = 0;

  ['top', 'bottom', 'left', 'right'].forEach((edge) => {
    const edgeLength = edge === 'top' || edge === 'bottom' ? core.width : core.height;
    const edgePins = pins.filter((p) => (p.edge || 'top') === edge);
    if (edgePins.length <= 1) return;

    edgePins.sort((a, b) => (Number(a.coord) || 0) - (Number(b.coord) || 0));

    const margin = Math.min(20, edgeLength * 0.1);
    const availableSpan = edgeLength - 2 * margin;
    const spacing = Math.max(minPitch, availableSpan / Math.max(1, edgePins.length - 1));

    edgePins.forEach((p, idx) => {
      const targetCoord = Math.round(margin + idx * spacing);
      if (Math.abs(p.coord - targetCoord) > 0.5) {
        p.coord = targetCoord;
        adjustedCount++;
      }
    });
  });

  return {
    success: adjustedCount > 0,
    modifiedPins: pins,
    pins,
    adjustedCount,
    message: adjustedCount > 0
      ? `Legalized ${adjustedCount} pin(s) with minimum ${minPitch}µm pitch.`
      : 'All pins currently meet pitch constraints.',
  };
}
