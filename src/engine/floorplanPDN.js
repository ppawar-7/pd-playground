/**
 * floorplanPDN.js
 * ================
 * Educational Power Distribution Network (PDN) graph connectivity and integrity model.
 * Models power rings, straps, and interlayer vias.
 *
 * Checks:
 * 1. Graph connectivity from power/ground pads (sources) to strap segments (loads).
 * 2. VDD vs VSS short circuits.
 * 3. Missing via detection at orthogonal metal layer crossings.
 * 4. Analytical educational IR-Drop estimation.
 */

// ─── Shared geometric helpers ───────────────────────────────────────────────
// All PDN shapes are axis-aligned. A ring is four edge rectangles of width
// `lineWidth` centred on its outline; a strap is a rectangle of width `width`
// centred on its (x1,y1)-(x2,y2) centreline. A via is a point that joins the
// two metal layers it names (layer1/layer2).

const DEFAULT_RING_WIDTH = 6;
const DEFAULT_STRAP_WIDTH = 4;
// Snap tolerance (µm) beyond the drawn half-width used when matching a via to metal.
const SNAP_TOL = 2;

const SHEET_RES_OHM_PER_SQ = { M1: 0.125, M2: 0.125, M3: 0.125, M4: 0.08, M5: 0.05, M6: 0.03 };
const DEFAULT_CURRENT_MA = 15; // educational default block load per strap

function ringEdgeRects(ring) {
  const hw = (Number(ring.lineWidth) || DEFAULT_RING_WIDTH) / 2;
  const { x, y, width: w, height: h } = ring;
  return [
    { side: 'left', minX: x - hw, maxX: x + hw, minY: y - hw, maxY: y + h + hw },
    { side: 'right', minX: x + w - hw, maxX: x + w + hw, minY: y - hw, maxY: y + h + hw },
    { side: 'top', minX: x - hw, maxX: x + w + hw, minY: y - hw, maxY: y + hw },
    { side: 'bottom', minX: x - hw, maxX: x + w + hw, minY: y + h - hw, maxY: y + h + hw },
  ];
}

function strapRect(strap) {
  const hw = (Number(strap.width) || DEFAULT_STRAP_WIDTH) / 2;
  return {
    minX: Math.min(strap.x1, strap.x2) - hw,
    maxX: Math.max(strap.x1, strap.x2) + hw,
    minY: Math.min(strap.y1, strap.y2) - hw,
    maxY: Math.max(strap.y1, strap.y2) + hw,
  };
}

function pointInRect(px, py, r, tol = SNAP_TOL) {
  return px >= r.minX - tol && px <= r.maxX + tol && py >= r.minY - tol && py <= r.maxY + tol;
}

function rectsOverlap(a, b) {
  return Math.min(a.maxX, b.maxX) > Math.max(a.minX, b.minX) && Math.min(a.maxY, b.maxY) > Math.max(a.minY, b.minY);
}

function pointOnRing(ring, px, py, tol) {
  return ringEdgeRects(ring).some((r) => pointInRect(px, py, r, tol));
}

function pointOnStrap(strap, px, py, tol) {
  return pointInRect(px, py, strapRect(strap), tol);
}

function viaLayers(via) {
  return [via.layer1, via.layer2].filter(Boolean);
}

/** True when the via lands on metal of `layer` (or the via has no layer data — legacy). */
function viaTouchesLayer(via, layer) {
  const ls = viaLayers(via);
  return ls.length === 0 || !layer || ls.includes(layer);
}

/** True when the via electrically joins a shape on layerA to a shape on layerB. */
function viaJoinsLayers(via, layerA, layerB) {
  const ls = viaLayers(via);
  if (ls.length === 0) return true; // legacy vias without layer data
  if (layerA === layerB) return ls.includes(layerA);
  return ls.includes(layerA) && ls.includes(layerB);
}

function isHorizontal(strap) {
  return Math.abs(strap.y2 - strap.y1) <= Math.abs(strap.x2 - strap.x1);
}

/**
 * Build the via-level connectivity of one net: which ring/strap pairs each via joins.
 * Returns adjacency map plus per-strap feed via positions (vias joining the strap to a ring).
 */
function buildNetGraph(powerNetwork, targetNet) {
  const rings = (powerNetwork.rings || []).filter((r) => r.net === targetNet);
  const straps = (powerNetwork.straps || []).filter((s) => s.net === targetNet);
  const vias = (powerNetwork.vias || []).filter((v) => !v.net || v.net === targetNet);
  const shapes = [
    ...rings.map((r) => ({ id: r.id, kind: 'ring', layer: r.layer, hit: (x, y) => pointOnRing(r, x, y) })),
    ...straps.map((s) => ({ id: s.id, kind: 'strap', layer: s.layer, hit: (x, y) => pointOnStrap(s, x, y) })),
  ];

  const adj = new Map(shapes.map((sh) => [sh.id, new Set()]));
  const feeds = new Map(straps.map((s) => [s.id, []]));

  vias.forEach((via) => {
    const touched = shapes.filter((sh) => viaTouchesLayer(via, sh.layer) && sh.hit(via.x, via.y));
    for (let i = 0; i < touched.length; i++) {
      for (let j = i + 1; j < touched.length; j++) {
        const a = touched[i];
        const b = touched[j];
        if (!viaJoinsLayers(via, a.layer, b.layer)) continue;
        adj.get(a.id).add(b.id);
        adj.get(b.id).add(a.id);
        if (a.kind === 'strap' && b.kind === 'ring') feeds.get(a.id).push({ x: via.x, y: via.y, viaId: via.id });
        if (b.kind === 'strap' && a.kind === 'ring') feeds.get(b.id).push({ x: via.x, y: via.y, viaId: via.id });
      }
    }
  });

  return { adj, feeds, rings, straps };
}

function reachableFrom(adj, startIds) {
  const visited = new Set(startIds.filter((id) => adj.has(id)));
  const queue = [...visited];
  while (queue.length > 0) {
    const curr = queue.shift();
    (adj.get(curr) || new Set()).forEach((nbr) => {
      if (!visited.has(nbr)) {
        visited.add(nbr);
        queue.push(nbr);
      }
    });
  }
  return visited;
}

/**
 * Detect open connections in VDD and VSS power distribution graphs.
 * Uses Breadth-First Search (BFS) from sources to ensure all loads are reachable.
 * Every strap of a net is treated as a load (in addition to any explicit loads),
 * so a newly added floating strap cannot escape the check. A via only joins
 * shapes whose layers it actually names.
 *
 * @param {Object} powerNetwork - { rings, straps, vias, sources, loads }
 */
export function detectOpenConnections(powerNetwork) {
  if (!powerNetwork) {
    return {
      vddOpen: true,
      vssOpen: true,
      vddDisconnectedLoads: [{ nodeId: 'all', reason: 'Missing power network configuration' }],
      vssDisconnectedLoads: [{ nodeId: 'all', reason: 'Missing power network configuration' }],
      educationalNote: 'Power network model was null or uninitialized.',
    };
  }

  const sources = Array.isArray(powerNetwork.sources) ? powerNetwork.sources : [];
  const loads = Array.isArray(powerNetwork.loads) ? powerNetwork.loads : [];

  const checkNetReachability = (netName) => {
    const { adj, straps } = buildNetGraph(powerNetwork, netName);
    const netSources = sources.filter((s) => s.net === netName).map((s) => s.nodeId);
    const loadIds = new Set([
      ...loads.filter((l) => l.net === netName).map((l) => l.nodeId),
      ...straps.map((s) => s.id),
    ]);

    if (netSources.length === 0) {
      return {
        isOpen: loadIds.size > 0,
        disconnected: [...loadIds].map((id) => ({ nodeId: id, reason: `No source pad defined for ${netName}` })),
      };
    }

    const visited = reachableFrom(adj, netSources);
    // A listed source that is not drawn anywhere is still treated as the pad itself.
    netSources.forEach((id) => visited.add(id));

    const disconnected = [...loadIds].filter((id) => !visited.has(id)).map((id) => ({
      nodeId: id,
      reason: `Node ${id} is not topologically reachable from ${netName} power pads`,
    }));

    return { isOpen: disconnected.length > 0, disconnected };
  };

  const vddCheck = checkNetReachability('VDD');
  const vssCheck = checkNetReachability('VSS');

  return {
    vddOpen: vddCheck.isOpen,
    vssOpen: vssCheck.isOpen,
    vddDisconnectedLoads: vddCheck.disconnected,
    vssDisconnectedLoads: vssCheck.disconnected,
    educationalNote: 'PDN connectivity is checked using a deterministic graph BFS from power pad sources to every strap (and any listed load). Vias only join the layers they name.',
  };
}

/**
 * Detect electrical shorts between VDD and VSS networks.
 * 1. A via that lands on VDD metal and VSS metal on the layers it joins.
 * 2. VDD and VSS shapes that overlap on the same metal layer.
 */
export function detectVDDVSSShort(powerNetwork) {
  if (!powerNetwork) return { hasShort: false, shorts: [] };

  const vias = Array.isArray(powerNetwork.vias) ? powerNetwork.vias : [];
  const rings = Array.isArray(powerNetwork.rings) ? powerNetwork.rings : [];
  const straps = Array.isArray(powerNetwork.straps) ? powerNetwork.straps : [];

  const shapes = [
    ...rings.flatMap((r) => ringEdgeRects(r).map((rect) => ({ id: r.id, net: r.net, layer: r.layer, rect }))),
    ...straps.map((s) => ({ id: s.id, net: s.net, layer: s.layer, rect: strapRect(s) })),
  ];

  const shorts = [];
  const tol = 0.5; // a via must physically sit on the metal to bridge it

  vias.forEach((v) => {
    const hits = shapes.filter((sh) => viaTouchesLayer(v, sh.layer) && pointInRect(v.x, v.y, sh.rect, tol));
    const vdd = hits.find((h) => h.net === 'VDD');
    const vss = hits.find((h) => h.net === 'VSS');
    if (vdd && vss) {
      shorts.push({
        viaId: v.id,
        net1: 'VDD',
        net2: 'VSS',
        location: `(${v.x}, ${v.y})`,
        reason: `Via ${v.id} physically bridges ${vdd.id} (VDD, ${vdd.layer}) and ${vss.id} (VSS, ${vss.layer})`,
      });
    }
  });

  const seen = new Set();
  shapes.forEach((a) => {
    if (a.net !== 'VDD') return;
    shapes.forEach((b) => {
      if (b.net !== 'VSS' || a.layer !== b.layer) return;
      const key = `${a.id}|${b.id}`;
      if (seen.has(key) || !rectsOverlap(a.rect, b.rect)) return;
      seen.add(key);
      shorts.push({
        viaId: null,
        net1: 'VDD',
        net2: 'VSS',
        location: `${a.id} ∩ ${b.id}`,
        reason: `${a.id} (VDD) and ${b.id} (VSS) overlap on ${a.layer}`,
      });
    });
  });

  return { hasShort: shorts.length > 0, shorts };
}

/**
 * Detect missing vias where a strap crosses a same-net ring edge on a different metal layer.
 * Horizontal straps are checked against the left/right ring edges, vertical straps against
 * the top/bottom edges. A via only counts if it joins the strap layer to the ring layer.
 */
export function detectMissingVias(powerNetwork) {
  if (!powerNetwork) return { missingViaCount: 0, details: [] };

  const rings = Array.isArray(powerNetwork.rings) ? powerNetwork.rings : [];
  const straps = Array.isArray(powerNetwork.straps) ? powerNetwork.straps : [];
  const vias = Array.isArray(powerNetwork.vias) ? powerNetwork.vias : [];

  const missing = [];

  straps.forEach((strap) => {
    rings.filter((r) => r.net === strap.net && r.layer !== strap.layer).forEach((ring) => {
      const crossings = [];
      if (isHorizontal(strap)) {
        const y = strap.y1;
        if (y < ring.y || y > ring.y + ring.height) return;
        const lo = Math.min(strap.x1, strap.x2);
        const hi = Math.max(strap.x1, strap.x2);
        [ring.x, ring.x + ring.width].forEach((x) => { if (lo <= x && hi >= x) crossings.push({ x, y }); });
      } else {
        const x = strap.x1;
        if (x < ring.x || x > ring.x + ring.width) return;
        const lo = Math.min(strap.y1, strap.y2);
        const hi = Math.max(strap.y1, strap.y2);
        [ring.y, ring.y + ring.height].forEach((y) => { if (lo <= y && hi >= y) crossings.push({ x, y }); });
      }

      const snap = Math.max(Number(ring.lineWidth) || DEFAULT_RING_WIDTH, Number(strap.width) || DEFAULT_STRAP_WIDTH) / 2 + SNAP_TOL;
      crossings.forEach((pt) => {
        const hasVia = vias.some((v) => (!v.net || v.net === strap.net) &&
          Math.abs(v.x - pt.x) <= snap && Math.abs(v.y - pt.y) <= snap &&
          viaJoinsLayers(v, strap.layer, ring.layer));
        if (!hasVia) {
          missing.push({
            strapId: strap.id,
            ringId: ring.id,
            net: strap.net,
            x: pt.x,
            y: pt.y,
            layer1: strap.layer,
            layer2: ring.layer,
            expectedViaLocation: `(${pt.x}, ${pt.y})`,
            layers: `${strap.layer} to ${ring.layer}`,
            reason: `Strap ${strap.id} crosses Ring ${ring.id} at (${pt.x}, ${pt.y}) without an electrical ${strap.layer}–${ring.layer} via`,
          });
        }
      });
    });
  });

  return { missingViaCount: missing.length, details: missing };
}

/**
 * Educational static IR-drop estimate for each strap load.
 *
 * Model (stated, not hidden):
 *   R_strap = (length / width) × ρ_layer          (ρ: M4 0.08 Ω/sq, M5 0.05 Ω/sq, …)
 *   Current I is drawn uniformly along the strap.
 *   Fed at both ends (≥2 ring vias):  V_max = I·R / 8  (at the midpoint)
 *   Fed at one end   (1 ring via)  :  V_max = I·R / 2  (at the far end)
 *   Not reachable from a pad       :  open — no finite drop is reported.
 * Ring resistance, via resistance and current crowding are ignored.
 *
 * @param {Object} powerNetwork
 * @param {Array<{ nodeId: string, currentMa?: number }>} loads
 */
export function computeIRDropEstimate(powerNetwork, loads = []) {
  const pn = powerNetwork || { rings: [], straps: [], vias: [], sources: [], loads: [] };
  const straps = pn.straps || [];
  const requested = Array.isArray(loads) && loads.length > 0
    ? loads
    : straps.filter((s) => s.net === 'VDD').map((s) => ({ nodeId: s.id, net: s.net }));

  const sources = pn.sources || [];
  const graphCache = new Map();
  const netInfo = (net) => {
    if (!graphCache.has(net)) {
      const g = buildNetGraph(pn, net);
      const srcIds = sources.filter((s) => s.net === net).map((s) => s.nodeId);
      graphCache.set(net, { ...g, reach: reachableFrom(g.adj, srcIds) });
    }
    return graphCache.get(net);
  };

  const perLoad = requested.map((load) => {
    const currentMa = Number.isFinite(Number(load.currentMa)) && load.currentMa !== null && load.currentMa !== ''
      ? Number(load.currentMa)
      : DEFAULT_CURRENT_MA;
    const strap = straps.find((s) => s.id === load.nodeId);
    if (!strap) {
      return { nodeId: load.nodeId, currentMa, estimatedDropMv: null, feedPoints: 0, resistanceOhm: null, severity: 'unknown',
        reason: `Load ${load.nodeId} is not a strap in this power network` };
    }

    const info = netInfo(strap.net);
    const feeds = info.feeds.get(strap.id) || [];
    const reachable = info.reach.has(strap.id);
    const length = Math.hypot(strap.x2 - strap.x1, strap.y2 - strap.y1);
    const width = Math.max(0.1, Number(strap.width) || DEFAULT_STRAP_WIDTH);
    const rho = SHEET_RES_OHM_PER_SQ[strap.layer] ?? SHEET_RES_OHM_PER_SQ.M4;
    const resistanceOhm = Number(((length / width) * rho).toFixed(4));
    const distinctFeeds = new Set(feeds.map((f) => `${f.x},${f.y}`)).size;

    if (!reachable) {
      return { nodeId: load.nodeId, currentMa, estimatedDropMv: null, feedPoints: distinctFeeds, resistanceOhm, severity: 'open',
        reason: `${strap.id} is not connected to a ${strap.net} pad — the drop is unbounded (open net)` };
    }

    const feedPoints = Math.max(1, distinctFeeds);
    const factor = feedPoints >= 2 ? 1 / 8 : 1 / 2;
    const estimatedDropMv = Number((currentMa * resistanceOhm * factor).toFixed(2));
    return {
      nodeId: load.nodeId,
      currentMa,
      estimatedDropMv,
      feedPoints,
      resistanceOhm,
      severity: estimatedDropMv > 35 ? 'critical' : estimatedDropMv > 20 ? 'moderate' : 'nominal',
    };
  });

  const finite = perLoad.filter((l) => typeof l.estimatedDropMv === 'number');
  const maxDropMv = finite.length > 0 ? Math.max(...finite.map((l) => l.estimatedDropMv)) : 0;

  return {
    maxDropMv,
    hasOpenLoad: perLoad.some((l) => l.severity === 'open'),
    perLoad,
    assumptions: 'Strap-only distributed-load model: R = (L/W)·ρ_layer (M4 0.08 Ω/sq, M5 0.05 Ω/sq); uniform current; V_max = I·R/8 when fed at both ends, I·R/2 when fed at one end; default 15 mA per strap; ring and via resistance ignored.',
    educationalDisclaimer: 'Educational simulation model — not foundry-qualified for commercial tapeout signoff.',
  };
}

/**
 * Immutable powerNetwork helper: Add a ring.
 */
export function addRing(powerNetwork, ring) {
  const prev = powerNetwork || { rings: [], straps: [], vias: [], sources: [], loads: [] };
  return {
    ...prev,
    rings: [...(prev.rings || []), ring],
  };
}

/**
 * Immutable powerNetwork helper: Add a strap.
 */
export function addStrap(powerNetwork, strap) {
  const prev = powerNetwork || { rings: [], straps: [], vias: [], sources: [], loads: [] };
  return {
    ...prev,
    straps: [...(prev.straps || []), strap],
  };
}

/**
 * Immutable powerNetwork helper: Add a via.
 */
export function addVia(powerNetwork, via) {
  const prev = powerNetwork || { rings: [], straps: [], vias: [], sources: [], loads: [] };
  return {
    ...prev,
    vias: [...(prev.vias || []), via],
  };
}

/**
 * Immutable powerNetwork helper: Remove a via by ID.
 */
export function removeVia(powerNetwork, viaId) {
  if (!powerNetwork) return powerNetwork;
  return {
    ...powerNetwork,
    vias: (powerNetwork.vias || []).filter((v) => v.id !== viaId),
  };
}


/**
 * Advanced Nodal Resistive PDN Solver.
 * Evaluates strap sheet resistance, via contact resistance, multiple feed points,
 * and heterogeneous macro load currents.
 *
 * @param {Object} powerNetwork - PDN data model
 * @param {Object} techProfile - Technology assumptions
 * @returns {Object} Comprehensive electrical report
 */
/**
 * Pure Mathematical MNA (Modified Nodal Analysis) Linear Circuit Solver.
 * Solves G * V = I for linear resistor networks with Dirichlet (fixed voltage)
 * and Neumann (current injection/sink) boundary conditions using Gaussian
 * elimination with partial pivoting.
 *
 * @param {Array<{ id: number, key: string, layer: string, x: number, y: number }>} nodes
 * @param {Array<{ u: number, v: number, r: number, desc?: string }>} branches
 * @param {Map<number, number>|Object} dirichlet
 * @param {Map<number, number>|Object} neumann
 * @returns {{ voltages: number[], isSingular: boolean, disconnectedNodes: number[], maxResidual: number }}
 */
export function solveMNA(nodes, branches, dirichlet, neumann = {}) {
  const n = typeof nodes === 'number' ? nodes : (nodes?.length || 0);
  if (n === 0) return { voltages: [], isSingular: false, disconnectedNodes: [], maxResidual: 0 };

  const adj = Array.from({ length: n }, () => []);
  branches.forEach((b) => {
    if (b.r > 0 && Number.isFinite(b.r)) {
      adj[b.u].push(b.v);
      adj[b.v].push(b.u);
    }
  });

  const dirichletIndices = new Set(
    dirichlet instanceof Map
      ? Array.from(dirichlet.keys())
      : Object.keys(dirichlet).map(Number)
  );

  const visited = new Set();
  const queue = Array.from(dirichletIndices);
  queue.forEach((idx) => visited.add(idx));
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const nxt of adj[cur] || []) {
      if (!visited.has(nxt)) {
        visited.add(nxt);
        queue.push(nxt);
      }
    }
  }

  const disconnectedNodes = [];
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      disconnectedNodes.push(i);
    }
  }

  const G = Array.from({ length: n }, () => new Float64Array(n));
  const I = new Float64Array(n);

  branches.forEach((b) => {
    if (b.r > 0 && Number.isFinite(b.r)) {
      const g = 1.0 / b.r;
      G[b.u][b.u] += g;
      G[b.v][b.v] += g;
      G[b.u][b.v] -= g;
      G[b.v][b.u] -= g;
    }
  });

  const getNeumann = (i) => (neumann instanceof Map ? (neumann.get(i) || 0) : (Number(neumann[i]) || 0));
  for (let i = 0; i < n; i++) {
    I[i] = getNeumann(i);
  }

  // Preserve copies of original G and I for numerical residual validation
  const G_orig = Array.from({ length: n }, (_, r) => new Float64Array(G[r]));
  const I_orig = new Float64Array(I);

  const getDirichlet = (i) => (dirichlet instanceof Map ? dirichlet.get(i) : dirichlet[i]);
  for (const k of dirichletIndices) {
    const vFixed = Number(getDirichlet(k));
    for (let j = 0; j < n; j++) G[k][j] = 0;
    G[k][k] = 1.0;
    I[k] = vFixed;

    for (let i = 0; i < n; i++) {
      if (i !== k && !dirichletIndices.has(i)) {
        I[i] -= G[i][k] * vFixed;
        G[i][k] = 0;
      }
    }
  }

  for (const dis of disconnectedNodes) {
    for (let j = 0; j < n; j++) G[dis][j] = 0;
    G[dis][dis] = 1.0;
    I[dis] = 0;
  }

  // Gaussian elimination with partial row pivoting
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(G[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(G[row][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }

    if (maxVal < 1e-13) continue;

    if (maxRow !== col) {
      const tmpG = G[col];
      G[col] = G[maxRow];
      G[maxRow] = tmpG;
      const tmpI = I[col];
      I[col] = I[maxRow];
      I[maxRow] = tmpI;
    }

    const pivot = G[col][col];
    for (let row = col + 1; row < n; row++) {
      const factor = G[row][col] / pivot;
      if (Math.abs(factor) > 1e-15) {
        for (let j = col; j < n; j++) {
          G[row][j] -= factor * G[col][j];
        }
        I[row] -= factor * I[col];
      }
    }
  }

  const voltages = new Float64Array(n);
  for (let row = n - 1; row >= 0; row--) {
    if (Math.abs(G[row][row]) < 1e-13) {
      voltages[row] = 0;
      continue;
    }
    let sum = I[row];
    for (let j = row + 1; j < n; j++) {
      sum -= G[row][j] * voltages[j];
    }
    voltages[row] = sum / G[row][row];
  }

  // Check numerical residuals: ||G_orig * V - I_orig||_inf for unconstrained connected nodes
  let maxResidual = 0;
  for (let i = 0; i < n; i++) {
    if (dirichletIndices.has(i) || disconnectedNodes.includes(i)) continue;
    let gv = 0;
    for (let j = 0; j < n; j++) {
      gv += G_orig[i][j] * voltages[j];
    }
    const diff = Math.abs(gv - I_orig[i]);
    if (diff > maxResidual) maxResidual = diff;
  }

  return {
    voltages: Array.from(voltages),
    isSingular: disconnectedNodes.length > 0,
    disconnectedNodes,
    maxResidual: Number(maxResidual.toExponential(3)),
  };
}

/**
 * Authentic Nodal Resistive PDN Solver.
 * Solves the actual Modified Nodal Analysis (MNA) linear system G * V = I.
 * Discretizes straps, rings, vias, and loads into an interconnected resistor mesh,
 * evaluates strap sheet resistances, via contact resistances, multiple boundary feed points,
 * and macro load currents.
 *
 * @param {Object} powerNetwork - PDN data model
 * @param {Object} techProfile - Technology assumptions
 * @param {Object} constraints - Physical design constraints
 * @param {Array} macros - Placed macro list
 * @returns {Object} Comprehensive electrical report
 */
export function solveResistivePDN(powerNetwork, techProfile = {}, constraints = {}, macros = []) {
  if (!powerNetwork || ((!powerNetwork.straps || powerNetwork.straps.length === 0) && (!powerNetwork.rings || powerNetwork.rings.length === 0))) {
    return {
      valid: false,
      evaluated: false,
      nominalVdd: Number(techProfile?.nominalVoltage) || 1.2,
      worstDropMv: null,
      maxDropMv: null,
      worstDropVssMv: null,
      budgetMv: Number(constraints?.voltageDropBudgetMv || techProfile?.voltageDropBudgetMv) || 30,
      meetsBudget: false,
      hasOpenCircuit: true,
      hasShortCircuit: false,
      reason: 'Power network not modeled: no power rings or straps present',
      nodes: [],
      perStrap: [],
    };
  }

  // Pre-check 1: Detect VDD/VSS Short Circuits
  const shortCheck = detectVDDVSSShort(powerNetwork);
  if (shortCheck && shortCheck.shorts && shortCheck.shorts.length > 0) {
    return {
      valid: false,
      evaluated: true,
      meetsBudget: false,
      worstDropMv: Infinity,
      maxDropMv: Infinity,
      worstDropVssMv: Infinity,
      nominalVdd: Number(techProfile?.nominalVoltage) || 1.2,
      budgetMv: Number(constraints?.voltageDropBudgetMv || techProfile?.voltageDropBudgetMv) || 30,
      hasOpenCircuit: false,
      hasShortCircuit: true,
      reason: `Catastrophic short circuit detected: ${shortCheck.shorts[0].reason}`,
      nodes: [],
      perStrap: [],
    };
  }

  // Pre-check 2: Verify both VDD and VSS supply topologies are present
  const hasVddStrapOrRing = (powerNetwork.straps || []).some((s) => s.net === 'VDD') || (powerNetwork.rings || []).some((r) => r.net === 'VDD');
  const hasVssStrapOrRing = (powerNetwork.straps || []).some((s) => s.net === 'VSS') || (powerNetwork.rings || []).some((r) => r.net === 'VSS');
  if (!hasVddStrapOrRing || !hasVssStrapOrRing) {
    return {
      valid: false,
      evaluated: false,
      meetsBudget: false,
      worstDropMv: null,
      maxDropMv: null,
      worstDropVssMv: null,
      hasMissingSupply: true,
      hasOpenCircuit: true,
      hasShortCircuit: false,
      reason: `Missing supply net: both VDD and VSS topologies must be modeled (found VDD: ${hasVddStrapOrRing}, VSS: ${hasVssStrapOrRing})`,
      nodes: [],
      perStrap: [],
    };
  }

  const nominalVdd = Number(techProfile?.nominalVoltage) || 1.2;
  const budgetMv = Number(constraints?.voltageDropBudgetMv || techProfile?.voltageDropBudgetMv) || 30;
  const sheetRes = { ...SHEET_RES_OHM_PER_SQ, ...(techProfile?.sheetResistances || {}) };

  const allOrphanLoads = [];
  const allInvalidVias = [];

  function solveNet(targetNet) {
    const isVdd = targetNet === 'VDD';
    const vSource = isVdd ? nominalVdd : 0.0;

    const straps = (powerNetwork.straps || []).filter((s) => s.net === targetNet);
    const rings = (powerNetwork.rings || []).filter((r) => r.net === targetNet);
    const vias = (powerNetwork.vias || []).filter((v) => !v.net || v.net === targetNet);

    const nodeMap = new Map();
    const nodes = [];
    const getNode = (layer, x, y) => {
      const rx = Math.round(x);
      const ry = Math.round(y);
      const key = `${layer}_${rx}_${ry}`;
      if (!nodeMap.has(key)) {
        const id = nodes.length;
        const nodeObj = { id, layer, x: rx, y: ry, net: targetNet, key };
        nodeMap.set(key, id);
        nodes.push(nodeObj);
      }
      return nodeMap.get(key);
    };

    const branches = [];
    const addBranch = (u, v, r, desc = '') => {
      if (u !== v && r > 0 && Number.isFinite(r)) {
        branches.push({ u, v, r, desc });
      }
    };

    // Filter and validate vias: must touch actual conductor on layer1 AND layer2
    vias.forEach((v) => {
      const l1 = v.layer1 || 'M4';
      const l2 = v.layer2 || 'M5';
      const touchesL1 = straps.some((s) => s.layer === l1 && pointOnStrap(s, v.x, v.y)) ||
                        rings.some((r) => r.layer === l1 && pointOnRing(r, v.x, v.y));
      const touchesL2 = straps.some((s) => s.layer === l2 && pointOnStrap(s, v.x, v.y)) ||
                        rings.some((r) => r.layer === l2 && pointOnRing(r, v.x, v.y));
      if (touchesL1 && touchesL2) {
        const n1 = getNode(l1, v.x, v.y);
        const n2 = getNode(l2, v.x, v.y);
        const rVia = Number(techProfile?.viaResistance) || 0.25;
        addBranch(n1, n2, Math.max(1e-4, rVia), `via_${v.id}`);
      } else {
        allInvalidVias.push({
          viaId: v.id,
          x: v.x,
          y: v.y,
          layer1: l1,
          layer2: l2,
          reason: `Via ${v.id} at (${v.x}, ${v.y}) does not connect to metal on both layers ${l1} (hit: ${touchesL1}) and ${l2} (hit: ${touchesL2})`,
        });
      }
    });

    // Straps
    const strapNodesMap = new Map();
    straps.forEach((s) => {
      const l = s.layer || 'M4';
      const w = Number(s.width) || DEFAULT_STRAP_WIDTH;
      const rho = sheetRes[l] || 0.08;

      const isHoriz = Math.abs(s.y2 - s.y1) <= Math.abs(s.x2 - s.x1);
      const minX = Math.min(s.x1, s.x2);
      const maxX = Math.max(s.x1, s.x2);
      const minY = Math.min(s.y1, s.y2);
      const maxY = Math.max(s.y1, s.y2);

      const pts = [];
      pts.push({ x: s.x1, y: s.y1 });
      pts.push({ x: s.x2, y: s.y2 });

      vias.forEach((v) => {
        if ((v.layer1 === l || v.layer2 === l) && v.x >= minX - SNAP_TOL && v.x <= maxX + SNAP_TOL && v.y >= minY - SNAP_TOL && v.y <= maxY + SNAP_TOL) {
          pts.push({ x: v.x, y: v.y });
        }
      });

      pts.sort((a, b) => isHoriz ? (a.x - b.x) : (a.y - b.y));

      const uniquePts = [];
      pts.forEach((p) => {
        if (uniquePts.length === 0 || Math.hypot(p.x - uniquePts[uniquePts.length - 1].x, p.y - uniquePts[uniquePts.length - 1].y) > 0.5) {
          uniquePts.push(p);
        }
      });

      const strapNodeIndices = [];
      for (let i = 0; i < uniquePts.length; i++) {
        const uNode = getNode(l, uniquePts[i].x, uniquePts[i].y);
        strapNodeIndices.push(uNode);
        if (i > 0) {
          const prevNode = strapNodeIndices[i - 1];
          const dist = Math.hypot(uniquePts[i].x - uniquePts[i - 1].x, uniquePts[i].y - uniquePts[i - 1].y);
          const r = (dist / w) * rho;
          addBranch(prevNode, uNode, Math.max(1e-4, r), `strap_${s.id}_seg_${i}`);
        }
      }
      strapNodesMap.set(s.id, strapNodeIndices);
    });

    // Rings with intermediate points on each edge
    rings.forEach((r) => {
      const l = r.layer || 'M5';
      const w = Number(r.lineWidth) || 6;
      const rho = sheetRes[l] || 0.05;

      const x1 = r.x;
      const x2 = r.x + r.width;
      const y1 = r.y;
      const y2 = r.y + r.height;

      const topPts = [{ x: x1, y: y1 }, { x: x2, y: y1 }];
      const bottomPts = [{ x: x1, y: y2 }, { x: x2, y: y2 }];
      const leftPts = [{ x: x1, y: y1 }, { x: x1, y: y2 }];
      const rightPts = [{ x: x2, y: y1 }, { x: x2, y: y2 }];

      vias.forEach((v) => {
        if (v.layer1 === l || v.layer2 === l) {
          if (Math.abs(v.y - y1) <= SNAP_TOL && v.x >= x1 - SNAP_TOL && v.x <= x2 + SNAP_TOL) topPts.push({ x: v.x, y: y1 });
          if (Math.abs(v.y - y2) <= SNAP_TOL && v.x >= x1 - SNAP_TOL && v.x <= x2 + SNAP_TOL) bottomPts.push({ x: v.x, y: y2 });
          if (Math.abs(v.x - x1) <= SNAP_TOL && v.y >= y1 - SNAP_TOL && v.y <= y2 + SNAP_TOL) leftPts.push({ x: x1, y: v.y });
          if (Math.abs(v.x - x2) <= SNAP_TOL && v.y >= y1 - SNAP_TOL && v.y <= y2 + SNAP_TOL) rightPts.push({ x: x2, y: v.y });
        }
      });

      const connectEdge = (edgePts, sortByX, name) => {
        edgePts.sort((a, b) => sortByX ? a.x - b.x : a.y - b.y);
        const uniq = [];
        edgePts.forEach((p) => {
          if (uniq.length === 0 || Math.hypot(p.x - uniq[uniq.length - 1].x, p.y - uniq[uniq.length - 1].y) > 0.5) uniq.push(p);
        });
        for (let i = 1; i < uniq.length; i++) {
          const u = getNode(l, uniq[i - 1].x, uniq[i - 1].y);
          const v = getNode(l, uniq[i].x, uniq[i].y);
          const dist = Math.hypot(uniq[i].x - uniq[i - 1].x, uniq[i].y - uniq[i - 1].y);
          addBranch(u, v, Math.max(1e-4, (dist / w) * rho), `${name}_${i}`);
        }
      };

      connectEdge(topPts, true, `ring_top_${r.id}`);
      connectEdge(bottomPts, true, `ring_bottom_${r.id}`);
      connectEdge(leftPts, false, `ring_left_${r.id}`);
      connectEdge(rightPts, false, `ring_right_${r.id}`);
    });

    // Dirichlet sources: explicit validated power pads / sources
    const dirichlet = {};
    const explicitSources = (powerNetwork.sources || []).filter((s) => s.net === targetNet || !s.net);

    if (explicitSources.length > 0) {
      explicitSources.forEach((src) => {
        if (src.nodeId) {
          const ring = rings.find((r) => r.id === src.nodeId);
          if (ring) {
            const l = ring.layer || 'M5';
            dirichlet[getNode(l, ring.x, ring.y)] = vSource;
            dirichlet[getNode(l, ring.x + ring.width, ring.y)] = vSource;
            dirichlet[getNode(l, ring.x + ring.width, ring.y + ring.height)] = vSource;
            dirichlet[getNode(l, ring.x, ring.y + ring.height)] = vSource;
          }
          const strap = straps.find((s) => s.id === src.nodeId);
          if (strap) {
            const l = strap.layer || 'M4';
            dirichlet[getNode(l, strap.x1, strap.y1)] = vSource;
            dirichlet[getNode(l, strap.x2, strap.y2)] = vSource;
          }
        } else if (Number.isFinite(src.x) && Number.isFinite(src.y)) {
          const l = src.layer || (rings[0]?.layer || 'M5');
          dirichlet[getNode(l, src.x, src.y)] = vSource;
        }
      });
    } else if (rings.length > 0) {
      // Default educational assumption when rings exist without explicit sources list:
      // perimeter power pads feed the 4 corners of the ring
      rings.forEach((r) => {
        const l = r.layer || 'M5';
        dirichlet[getNode(l, r.x, r.y)] = vSource;
        dirichlet[getNode(l, r.x + r.width, r.y)] = vSource;
        dirichlet[getNode(l, r.x + r.width, r.y + r.height)] = vSource;
        dirichlet[getNode(l, r.x, r.y + r.height)] = vSource;
      });
    }

    const neumann = {};
    const addSink = (nodeIdx, currentMa) => {
      const curA = (currentMa / 1000) * (isVdd ? -1 : 1);
      neumann[nodeIdx] = (neumann[nodeIdx] || 0) + curA;
    };

    const explicitLoads = (powerNetwork.loads || []).filter((ld) => ld.net === targetNet || !ld.net);
    if (explicitLoads.length > 0) {
      explicitLoads.forEach((ld) => {
        // Preserve legitimate zero-current values! Do not use Number(val) || 15
        const currentMa = (ld.currentMa !== undefined && Number.isFinite(Number(ld.currentMa)))
          ? Number(ld.currentMa)
          : DEFAULT_CURRENT_MA;
        const targetId = ld.nodeId || ld.strapId;
        const strapNodes = strapNodesMap.get(targetId);
        if (strapNodes && strapNodes.length > 0) {
          const internalNodes = strapNodes.length > 2 ? strapNodes.slice(1, -1) : strapNodes;
          const perNodeMa = currentMa / internalNodes.length;
          internalNodes.forEach((nIdx) => addSink(nIdx, perNodeMa));
        } else {
          const ring = rings.find((r) => r.id === targetId);
          if (ring) {
            const ringNode = getNode(ring.layer || 'M5', ring.x, ring.y);
            addSink(ringNode, currentMa);
          } else {
            allOrphanLoads.push({
              loadId: ld.id || targetId || 'unknown',
              reason: `Orphan load: referenced strap or ring '${targetId}' does not exist in ${targetNet} network`,
            });
          }
        }
      });
    } else if (macros && macros.length > 0) {
      // Derive real macro dynamic current loads and map to nearest power strap
      macros.forEach((m) => {
        const pwrMw = Number(m.powerMw || (m.nominalCurrentMa ? m.nominalCurrentMa * nominalVdd : 0));
        const macroMa = pwrMw > 0 ? (pwrMw / nominalVdd) : (Number(m.nominalCurrentMa) || 15);
        if (macroMa > 0) {
          const mxCenter = (Number(m.x) || 0) + (Number(m.width) || 80) / 2;
          const myCenter = (Number(m.y) || 0) + (Number(m.height) || 60) / 2;
          let bestStrap = null;
          let bestDist = Infinity;
          straps.forEach((s) => {
            const sx = (s.x1 + s.x2) / 2;
            const sy = (s.y1 + s.y2) / 2;
            const d = Math.hypot(mxCenter - sx, myCenter - sy);
            if (d < bestDist) {
              bestDist = d;
              bestStrap = s;
            }
          });
          if (bestStrap) {
            const strapNodes = strapNodesMap.get(bestStrap.id);
            if (strapNodes && strapNodes.length > 0) {
              const nodeIdx = strapNodes[Math.floor(strapNodes.length / 2)];
              addSink(nodeIdx, macroMa);
            }
          }
        }
      });
    }

    const mna = solveMNA(nodes, branches, dirichlet, neumann);

    let worstDropMv = 0;
    const nodeResults = nodes.map((n, idx) => {
      const v = mna.voltages[idx];
      const isDis = mna.disconnectedNodes.includes(idx);
      const dropMv = isDis ? Infinity : Math.abs(vSource - v) * 1000;
      if (Number.isFinite(dropMv) && dropMv > worstDropMv) {
        worstDropMv = dropMv;
      }
      return {
        id: n.id,
        key: n.key,
        layer: n.layer,
        x: n.x,
        y: n.y,
        net: targetNet,
        voltage: Number(v.toFixed(4)),
        dropMv: isDis ? null : Number(dropMv.toFixed(2)),
        isSource: dirichlet[idx] !== undefined,
        isDisconnected: isDis,
      };
    });

    const hasOpenCircuit = mna.disconnectedNodes.length > 0 || Object.keys(dirichlet).length === 0;

    return {
      worstDropMv: Number(worstDropMv.toFixed(2)),
      hasOpenCircuit,
      nodes: nodeResults,
      strapNodesMap,
      maxResidual: mna.maxResidual,
    };
  }

  const vdd = solveNet('VDD');
  const vss = solveNet('VSS');

  const worstDropMv = Math.max(vdd.worstDropMv, vss.worstDropMv);
  const hasOpenCircuit = vdd.hasOpenCircuit || vss.hasOpenCircuit;
  const hasOrphanLoads = allOrphanLoads.length > 0;

  const perStrap = (powerNetwork.straps || []).map((s) => {
    const isVdd = s.net === 'VDD';
    const netResult = isVdd ? vdd : vss;
    const strapNodes = netResult.strapNodesMap.get(s.id) || [];
    const strapDrops = strapNodes
      .map((nIdx) => netResult.nodes[nIdx]?.dropMv)
      .filter((d) => typeof d === 'number' && Number.isFinite(d));
    const maxStrapDrop = strapDrops.length > 0 ? Math.max(...strapDrops) : 0;
    const isOpen = strapNodes.some((nIdx) => netResult.nodes[nIdx]?.isDisconnected);

    const sheetR = sheetRes[s.layer] || 0.08;
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    const width = Number(s.width) || DEFAULT_STRAP_WIDTH;
    const resistanceOhms = Number(((len / width) * sheetR).toFixed(3));

    return {
      id: s.id,
      net: s.net,
      layer: s.layer,
      lengthUm: Number(len.toFixed(2)),
      widthUm: width,
      resistanceOhms,
      dropMv: isOpen ? null : Number(maxStrapDrop.toFixed(2)),
      status: isOpen ? 'open' : (maxStrapDrop > budgetMv ? 'violation' : 'clean'),
    };
  });

  const meetsBudget = !hasOpenCircuit && !hasOrphanLoads && Number.isFinite(worstDropMv) && worstDropMv <= budgetMv;

  return {
    valid: !hasOpenCircuit && !hasOrphanLoads && meetsBudget,
    evaluated: true,
    nominalVdd,
    worstDropMv: Number.isFinite(worstDropMv) ? worstDropMv : null,
    maxDropMv: Number.isFinite(worstDropMv) ? worstDropMv : null,
    worstDropVssMv: Number.isFinite(vss.worstDropMv) ? vss.worstDropMv : null,
    budgetMv,
    meetsBudget,
    hasOpenCircuit,
    hasOpenLoad: hasOpenCircuit,
    hasShortCircuit: false,
    hasOrphanLoads,
    orphanLoads: allOrphanLoads,
    invalidVias: allInvalidVias,
    maxResidual: Math.max(vdd.maxResidual || 0, vss.maxResidual || 0),
    nodes: [...vdd.nodes, ...vss.nodes],
    perStrap,
    solverMethod: 'Modified Nodal Analysis (MNA) Conductance Matrix with Gaussian Elimination',
    educationalDisclaimer: 'Educational simulation model — linear nodal resistor mesh.',
  };
}

export function generatePDNGrid(coreRect, options = {}) {
  const core = (coreRect && coreRect.core) ? coreRect.core : (coreRect || { x: 40, y: 40, width: 320, height: 240 });
  const strapWidth = Number(options.strapWidth) || 10;
  const pitchX = Number(options.pitchX) || 160;
  const pitchY = Number(options.pitchY) || 160;

  const ringVdd = {
    id: 'ring_vdd',
    net: 'VDD',
    layer: 'M5',
    x: core.x - 14,
    y: core.y - 14,
    width: core.width + 28,
    height: core.height + 28,
    lineWidth: 10,
  };
  const ringVss = {
    id: 'ring_vss',
    net: 'VSS',
    layer: 'M5',
    x: core.x - 28,
    y: core.y - 28,
    width: core.width + 56,
    height: core.height + 56,
    lineWidth: 10,
  };

  const rings = [ringVdd, ringVss];
  const straps = [];
  const vias = [];
  let idCounter = 1;

  // Horizontal straps on M4 across core connecting to ring
  const startY = core.y + 60;
  const endY = core.y + core.height - 60;
  for (let y = startY; y <= endY; y += pitchY) {
    const isVdd = (Math.round((y - startY) / pitchY) % 2) === 0;
    const net = isVdd ? 'VDD' : 'VSS';
    const targetRing = isVdd ? ringVdd : ringVss;
    const strapId = `strap_gen_${net.toLowerCase()}_h_${idCounter++}`;
    
    // Extends to connect with vertical arms of target ring
    const x1 = targetRing.x;
    const x2 = targetRing.x + targetRing.width;
    
    straps.push({
      id: strapId,
      net,
      layer: 'M4',
      x1,
      y1: y,
      x2,
      y2: y,
      width: strapWidth,
    });

    // Ring connection feed vias (joining M4 strap to M5 ring)
    vias.push({
      id: `via_feed_${strapId}_left`,
      net,
      layer1: 'M4',
      layer2: 'M5',
      x: x1,
      y,
    });
    vias.push({
      id: `via_feed_${strapId}_right`,
      net,
      layer1: 'M4',
      layer2: 'M5',
      x: x2,
      y,
    });
  }

  // Vertical straps on M5 across core connecting to ring
  const startX = core.x + 80;
  const endX = core.x + core.width - 80;
  for (let x = startX; x <= endX; x += pitchX) {
    const isVdd = (Math.round((x - startX) / pitchX) % 2) === 0;
    const net = isVdd ? 'VDD' : 'VSS';
    const targetRing = isVdd ? ringVdd : ringVss;
    const strapId = `strap_gen_${net.toLowerCase()}_v_${idCounter++}`;
    
    // Vertical straps stay within core boundary to prevent M5-M5 ring shorts
    const y1 = core.y;
    const y2 = core.y + core.height;

    straps.push({
      id: strapId,
      net,
      layer: 'M5',
      x1: x,
      y1,
      x2: x,
      y2,
      width: strapWidth,
    });
  }

  // Generate intersection vias between same-net orthogonal straps
  const hStraps = straps.filter((s) => s.layer === 'M4');
  const vStraps = straps.filter((s) => s.layer === 'M5');

  hStraps.forEach((hs) => {
    vStraps.forEach((vs) => {
      if (hs.net === vs.net) {
        vias.push({
          id: `via_mesh_${hs.net.toLowerCase()}_${Math.round(vs.x1)}_${Math.round(hs.y1)}`,
          net: hs.net,
          layer1: 'M4',
          layer2: 'M5',
          x: Math.round(vs.x1),
          y: Math.round(hs.y1),
        });
      }
    });
  });

  const sources = [
    { nodeId: 'ring_vdd', net: 'VDD' },
    { nodeId: 'ring_vss', net: 'VSS' },
  ];

  const loads = [
    { nodeId: hStraps[0]?.id || 'ring_vdd', net: 'VDD', currentMa: 15 },
    { nodeId: hStraps.find((s) => s.net === 'VSS')?.id || 'ring_vss', net: 'VSS', currentMa: 15 },
  ];

  return {
    rings,
    straps,
    vias,
    sources,
    loads,
    message: `Synthesized continuous PDN mesh: ${rings.length} rings, ${straps.length} straps, ${vias.length} vias.`,
  };
}
