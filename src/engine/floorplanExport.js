/**
 * floorplanExport.js
 * ===================
 * Standards-compliant EDA Exporters for Floorplanning Studio 3.0:
 * 1. Physical Library Exchange Format (Educational LEF 5.8 subset)
 * 2. Design Exchange Format (Educational DEF 5.8 subset)
 * 3. ASCII Signoff & Diagnostic Handoff Report
 */

import { MACRO_MASTERS_LIBRARY } from './floorplanProjectModel.js';
import { evaluateFloorplanSignoff } from './floorplanSignoff.js';

/**
 * Standard DEF 5.8 placement orientation mapping.
 * Maps internal rotation/reflection tokens (R0, R90, R180, R270, MX, MY)
 * to official DEF placement orientation standards (N, W, S, E, FS, FN, etc.).
 */
export function mapOrientationToDEF(orient) {
  if (!orient) return 'N';
  const o = String(orient).trim().toUpperCase();
  const MAP = {
    'R0': 'N',
    'N': 'N',
    'R90': 'W',
    'W': 'W',
    'R180': 'S',
    'S': 'S',
    'R270': 'E',
    'E': 'E',
    'MY': 'FN',
    'FN': 'FN',
    'MX': 'FS',
    'FS': 'FS',
    'MY90': 'FW',
    'FW': 'FW',
    'MX90': 'FE',
    'FE': 'FE',
  };
  return MAP[o] || 'N';
}

/**
 * Generates standards-compliant Physical Library Exchange Format (LEF 5.8)
 * for all macro masters instantiated in the floorplan project.
 *
 * @param {Object} project - FloorplanProject
 * @returns {string} Syntactically valid LEF string
 */
export function generateLEF(project) {
  if (!project) throw new Error('Cannot generate LEF for null project');

  const lines = [];
  lines.push('# Educational LEF 5.8 Subset Export');
  lines.push('# Validated for classroom EDA models and educational synthesis/P&R pipelines');
  lines.push('VERSION 5.8 ;');
  lines.push('BUSBITCHARS "[]" ;');
  lines.push('DIVIDERCHAR "/" ;');
  lines.push('UNITS');
  lines.push('  DATABASE MICRONS 1000 ;');
  lines.push('END UNITS');
  lines.push('');

  // Collect unique macro masters
  const mastersMap = new Map();
  (project.macros || []).forEach((m) => {
    const rawMasterId = m.masterId || m.name || m.id;
    const masterId = String(rawMasterId).replace(/[^a-zA-Z0-9_]/g, '_');
    if (!mastersMap.has(masterId)) {
      const libraryDef = MACRO_MASTERS_LIBRARY[m.masterId] || {
        id: masterId,
        name: m.name || masterId,
        width: m.width || 80,
        height: m.height || 60,
        pins: (m.pins || []).map((p) => ({ name: p.name || p.id, direction: 'INPUT', layer: 'M3' })),
      };
      mastersMap.set(masterId, { ...libraryDef, width: m.width || libraryDef.width, height: m.height || libraryDef.height });
    }
  });

  mastersMap.forEach((master, masterId) => {
    lines.push(`MACRO ${masterId}`);
    lines.push(`  CLASS BLOCK ;`);
    lines.push(`  ORIGIN 0.000 0.000 ;`);
    lines.push(`  SIZE ${Number(master.width).toFixed(3)} BY ${Number(master.height).toFixed(3)} ;`);
    lines.push(`  SYMMETRY X Y ;`);

    const pins = master.pins || [
      { name: 'clk', direction: 'INPUT', layer: 'M3', x: 10, y: 0 },
      { name: 'vdd', direction: 'INOUT', layer: 'M4', x: 0, y: 10 },
      { name: 'vss', direction: 'INOUT', layer: 'M4', x: 0, y: 20 },
    ];

    pins.forEach((p) => {
      const rawPName = p.name || p.id || 'pin';
      const pName = String(rawPName).replace(/[^a-zA-Z0-9_\[\]]/g, '_');
      const isPower = pName.toLowerCase().includes('vd');
      const isGround = pName.toLowerCase().includes('vs');
      lines.push(`  PIN ${pName}`);
      lines.push(`    DIRECTION ${p.direction || 'INPUT'} ;`);
      lines.push(`    USE ${isPower ? 'POWER' : isGround ? 'GROUND' : 'SIGNAL'} ;`);
      lines.push(`    PORT`);
      lines.push(`      LAYER ${p.layer || 'M3'} ;`);
      const px = Number(p.x || 0);
      const py = Number(p.y || 0);
      lines.push(`      RECT ${px.toFixed(3)} ${py.toFixed(3)} ${(px + 1.0).toFixed(3)} ${(py + 1.0).toFixed(3)} ;`);
      lines.push(`    END`);
      lines.push(`  END ${pName}`);
    });

    lines.push(`  OBS`);
    lines.push(`    LAYER M1 ;`);
    lines.push(`    RECT 0.000 0.000 ${Number(master.width).toFixed(3)} ${Number(master.height).toFixed(3)} ;`);
    lines.push(`    LAYER M2 ;`);
    lines.push(`    RECT 0.000 0.000 ${Number(master.width).toFixed(3)} ${Number(master.height).toFixed(3)} ;`);
    lines.push(`  END`);
    lines.push(`END ${masterId}`);
    lines.push('');
  });

  lines.push('END LIBRARY');
  return lines.join('\n');
}

/**
 * Generates standards-compliant Design Exchange Format (DEF 5.8)
 * for the entire floorplan layout, including die boundaries, placed macros,
 * I/O pins, and PDN special nets.
 *
 * @param {Object} project - FloorplanProject
 * @returns {string} Syntactically valid DEF string
 */
export function generateDEF(project) {
  if (!project || !project.die) throw new Error('Cannot generate DEF for invalid project');

  const lines = [];
  const rawName = project.name || 'floorplan';
  const designName = String(rawName).trim().replace(/[^a-zA-Z0-9_]/g, '_');
  const die = project.die;
  const dbu = 1000; // 1000 DBU per micron

  lines.push('# Educational DEF 5.8 Subset Export');
  lines.push('# Educational EDA Model — Academic and Classroom Learning Subset');
  lines.push('VERSION 5.8 ;');
  lines.push('DIVIDERCHAR "/" ;');
  lines.push('BUSBITCHARS "[]" ;');
  lines.push(`DESIGN ${designName} ;`);
  lines.push(`UNITS DISTANCE MICRONS ${dbu} ;`);
  lines.push('');

  // Die Area
  const x1 = Math.round((Number(die.x) || 0) * dbu);
  const y1 = Math.round((Number(die.y) || 0) * dbu);
  const x2 = Math.round(((Number(die.x) || 0) + (Number(die.width) || 500)) * dbu);
  const y2 = Math.round(((Number(die.y) || 0) + (Number(die.height) || 400)) * dbu);
  lines.push(`DIEAREA ( ${x1} ${y1} ) ( ${x2} ${y2} ) ;`);
  lines.push('');

  // Components (Placed Macros)
  const macros = project.macros || [];
  lines.push(`COMPONENTS ${macros.length} ;`);
  macros.forEach((m) => {
    const mx = Math.round((Number(m.x) || 0) * dbu);
    const my = Math.round((Number(m.y) || 0) * dbu);
    const orient = mapOrientationToDEF(m.orientation);
    const master = String(m.masterId || m.name || m.id).replace(/[^a-zA-Z0-9_]/g, '_');
    const compId = String(m.id).replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`  - ${compId} ${master} + PLACED ( ${mx} ${my} ) ${orient} ;`);
  });
  lines.push('END COMPONENTS');
  lines.push('');

  // Pins (I/O Boundary Pins)
  const pins = project.pins || [];
  lines.push(`PINS ${pins.length} ;`);
  pins.forEach((p) => {
    const px = Math.round((Number(p.x) || 0) * dbu);
    const py = Math.round((Number(p.y) || 0) * dbu);
    const dir = p.direction || 'INPUT';
    const net = String(p.net || p.id).replace(/[^a-zA-Z0-9_]/g, '_');
    const layer = p.layer || 'M3';
    const pinId = String(p.id).replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`  - ${pinId} + NET ${net} + DIRECTION ${dir} + USE SIGNAL + LAYER ${layer} ( -500 -500 ) ( 500 500 ) + PLACED ( ${px} ${py} ) N ;`);
  });
  lines.push('END PINS');
  lines.push('');

  // Special Nets (PDN Straps & Rings & Vias)
  const power = project.powerNetwork || { rings: [], straps: [], vias: [] };
  const powerNets = ['VDD', 'VSS'];
  lines.push(`SPECIALNETS ${powerNets.length} ;`);
  powerNets.forEach((pNet) => {
    lines.push(`  - ${pNet} + USE ${pNet === 'VDD' ? 'POWER' : 'GROUND'}`);
    
    // Rings
    const rings = (power.rings || []).filter((r) => r.net === pNet);
    rings.forEach((r) => {
      const rw = Math.round((Number(r.lineWidth) || 6) * dbu);
      const layer = r.layer || 'M5';
      const rx1 = Math.round(Number(r.x) * dbu);
      const ry1 = Math.round(Number(r.y) * dbu);
      const rx2 = Math.round((Number(r.x) + Number(r.width)) * dbu);
      const ry2 = Math.round((Number(r.y) + Number(r.height)) * dbu);
      // 4 ring segments
      lines.push(`    + ROUTED ${layer} ${rw} ( ${rx1} ${ry1} ) ( ${rx2} ${ry1} )`);
      lines.push(`    + ROUTED ${layer} ${rw} ( ${rx2} ${ry1} ) ( ${rx2} ${ry2} )`);
      lines.push(`    + ROUTED ${layer} ${rw} ( ${rx2} ${ry2} ) ( ${rx1} ${ry2} )`);
      lines.push(`    + ROUTED ${layer} ${rw} ( ${rx1} ${ry2} ) ( ${rx1} ${ry1} )`);
    });

    // Straps
    const straps = (power.straps || []).filter((s) => s.net === pNet);
    straps.forEach((s) => {
      const sx1 = Math.round((Number(s.x1) || 0) * dbu);
      const sy1 = Math.round((Number(s.y1) || 0) * dbu);
      const sx2 = Math.round((Number(s.x2) || 0) * dbu);
      const sy2 = Math.round((Number(s.y2) || 0) * dbu);
      const sw = Math.round((Number(s.width) || 4) * dbu);
      lines.push(`    + ROUTED ${s.layer || 'M4'} ${sw} ( ${sx1} ${sy1} ) ( ${sx2} ${sy2} )`);
    });

    // Vias
    const vias = (power.vias || []).filter((v) => !v.net || v.net === pNet);
    vias.forEach((v) => {
      const vx = Math.round((Number(v.x) || 0) * dbu);
      const vy = Math.round((Number(v.y) || 0) * dbu);
      lines.push(`    + ROUTED ${v.layer2 || 'M5'} 0 ( ${vx} ${vy} ) via_${v.id || 'cut'}`);
    });

    lines.push(`    ;`);
  });
  lines.push('END SPECIALNETS');
  lines.push('');

  // Signal Nets
  const nets = project.nets || [];
  lines.push(`NETS ${nets.length} ;`);
  nets.forEach((n) => {
    const terms = [];
    (n.sources || []).forEach((src) => {
      if (pins.some((p) => p.id === src || p.net === src)) terms.push(`( PIN ${src} )`);
      else terms.push(`( ${src} pin )`);
    });
    (n.sinks || []).forEach((snk) => {
      if (pins.some((p) => p.id === snk || p.net === snk)) terms.push(`( PIN ${snk} )`);
      else terms.push(`( ${snk} pin )`);
    });
    const netId = String(n.id).replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`  - ${netId} ${terms.join(' ') || '( PIN )'} ;`);
  });
  lines.push('END NETS');
  lines.push('');

  lines.push('END DESIGN');
  return lines.join('\n');
}

/**
 * Generates an ASCII Signoff & Diagnostic Handoff Report.
 *
 * @param {Object} project - FloorplanProject
 * @returns {string} Human-readable plain text report
 */
export function generateSignoffReportText(project) {
  if (!project) return 'No project provided.';
  const report = evaluateFloorplanSignoff(project);
  const m = report.metrics;

  const lines = [];
  lines.push('========================================================================');
  lines.push(`  PHYSICAL DESIGN SIGNOFF & HANDOFF REPORT`);
  lines.push(`  Design: ${project.name || 'Unnamed'}`);
  lines.push(`  Timestamp: ${new Date().toISOString()}`);
  lines.push('========================================================================');
  lines.push('');
  lines.push(`  Signoff Status: ${report.clean ? '✓ PASSED (Ready for Placement & CTS)' : '⚠️ FAILED (Violations Detected)'}`);
  lines.push(`  Total Violations: ${report.violations.length} (${report.errorCount} Errors, ${report.warningCount} Warnings)`);
  lines.push('');
  lines.push('  --- GEOMETRY & AREA METRICS ---');
  lines.push(`  Die Dimensions: ${project.die?.width} x ${project.die?.height} µm (${(project.die?.width * project.die?.height).toLocaleString()} µm²)`);
  lines.push(`  Core Dimensions: ${project.core?.width} x ${project.core?.height} µm (${(project.core?.width * project.core?.height).toLocaleString()} µm²)`);
  lines.push(`  Macros Placed: ${m.macroCount}`);
  lines.push(`  I/O Pins Configured: ${m.pinCount}`);
  lines.push(`  Raw Core Utilization: ${m.rawNominalUtilization}%`);
  lines.push(`  Effective Placeable Utilization: ${m.effectiveUtilization}%`);
  lines.push(`  Total Net HPWL: ${m.totalHPWL} µm`);
  lines.push('');
  lines.push('  --- POWER DISTRIBUTION & ELECTRICAL SIGN-OFF ---');
  lines.push(`  Worst Static IR Droop: ${m.maxIRDropMv !== undefined ? m.maxIRDropMv + ' mV' : 'N/A'}`);
  lines.push(`  Static IR Budget: <= ${project.constraints?.voltageDropBudgetMv || 30} mV`);
  lines.push(`  PDN Open Circuit: ${m.irDropOpen ? 'YES (CRITICAL)' : 'NO (Continuous)'}`);
  lines.push('');
  lines.push('  --- ROUTING CONGESTION ESTIMATE ---');
  lines.push(`  Peak GCELL Routing Demand: ${m.maxCongestionRatio ? (m.maxCongestionRatio * 100).toFixed(1) + '%' : 'N/A'}`);
  lines.push(`  Critical Overflow Bins: ${m.criticalCongestionBins || 0}`);
  lines.push('');

  if (report.violations.length > 0) {
    lines.push('  --- VIOLATION DETAILS ---');
    report.violations.forEach((v, idx) => {
      lines.push(`  [${idx + 1}] [${v.severity.toUpperCase()}] ${v.rule}`);
      lines.push(`      Target: ${v.targetType || 'Design'} (${v.targetId || 'N/A'})`);
      lines.push(`      Issue: ${v.message}`);
      lines.push(`      Fix: ${v.suggestion}`);
    });
    lines.push('');
  }

  lines.push('========================================================================');
  lines.push('  Handoff Target: Stage 4 — Standard Cell Placement & Clock Tree Synthesis');
  lines.push('========================================================================');
  return lines.join('\n');
}
