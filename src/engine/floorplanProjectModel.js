/**
 * floorplanProjectModel.js
 * =========================
 * FloorplanProject Schema v2 and lifecycle utilities.
 * Defines canonical data model for Floorplanning 3.0, Floorplan Studio,
 * educational macro master libraries, and benchmark scenarios.
 *
 * All coordinates and dimensions are in micrometers (µm).
 * Fully backwards-compatible with Schema v1 projects.
 */

export const SCHEMA_VERSION = 1;
export const SCHEMA_VERSION_V1 = 1;
export const SCHEMA_VERSION_V2 = 2;

/**
 * Standard Educational Technology Profile (SkyWater 130nm approximation).
 */
export const DEFAULT_TECH_PROFILE = {
  name: 'sky130_educational',
  description: 'SkyWater 130nm High-Density Educational Technology Profile',
  siteWidth: 0.46,
  rowHeight: 2.72,
  minMacroHalo: 15,
  minPinSpacing: 5,
  defaultUtilization: 70,
  gridSnapUm: 5,
  availableMetalLayers: ['M1', 'M2', 'M3', 'M4', 'M5'],
  layerDirections: {
    M1: 'horizontal',
    M2: 'vertical',
    M3: 'horizontal',
    M4: 'horizontal',
    M5: 'vertical',
  },
  sheetResistances: {
    M1: 0.125,
    M2: 0.125,
    M3: 0.125,
    M4: 0.08,
    M5: 0.05,
  },
  viaResistance: 0.5, // 0.5 ohms per cut
  voltageDropBudgetMv: 30, // 30mV static IR drop budget
  congestionThreshold: 0.8, // Bins with ratio >= 0.8 are flagged
};

/**
 * Educational Macro Masters Library.
 * Provides reusable hard macro master definitions with native dimensions,
 * terminal pin definitions, allowed orientations, and power consumption profiles.
 */
export const MACRO_MASTERS_LIBRARY = {
  SRAM_64KB: {
    id: 'SRAM_64KB',
    name: 'SRAM 64KB High-Density Cache',
    category: 'Memory',
    width: 160,
    height: 120,
    pins: [
      { id: 'CLK', x: 20, y: 0, edge: 'bottom', layer: 'M3', net: 'clk' },
      { id: 'CS_N', x: 40, y: 0, edge: 'bottom', layer: 'M3', net: 'cs_n' },
      { id: 'WE_N', x: 60, y: 0, edge: 'bottom', layer: 'M3', net: 'we_n' },
      { id: 'ADDR[0]', x: 80, y: 0, edge: 'bottom', layer: 'M3', net: 'addr[0]' },
      { id: 'DATA[0]', x: 100, y: 0, edge: 'bottom', layer: 'M3', net: 'data[0]' },
      { id: 'DATA[1]', x: 120, y: 0, edge: 'bottom', layer: 'M3', net: 'data[1]' },
      { id: 'VDD_CORE', x: 0, y: 60, edge: 'left', layer: 'M4', net: 'VDD' },
      { id: 'VSS_CORE', x: 160, y: 60, edge: 'right', layer: 'M4', net: 'VSS' },
    ],
    defaultHalo: 15,
    allowedOrientations: ['R0', 'R90', 'R180', 'R270', 'MX', 'MY'],
    nominalCurrentMa: 25,
  },
  SRAM_32KB: {
    id: 'SRAM_32KB',
    name: 'SRAM 32KB Sub-Block',
    category: 'Memory',
    width: 110,
    height: 90,
    pins: [
      { id: 'CLK', x: 0, y: 20, edge: 'left', layer: 'M3', net: 'clk' },
      { id: 'WE_N', x: 0, y: 40, edge: 'left', layer: 'M3', net: 'we_n' },
      { id: 'DATA[0]', x: 0, y: 60, edge: 'left', layer: 'M3', net: 'data[0]' },
      { id: 'DATA[1]', x: 0, y: 80, edge: 'left', layer: 'M3', net: 'data[1]' },
      { id: 'VDD_CORE', x: 55, y: 90, edge: 'top', layer: 'M4', net: 'VDD' },
      { id: 'VSS_CORE', x: 55, y: 0, edge: 'bottom', layer: 'M4', net: 'VSS' },
    ],
    defaultHalo: 15,
    allowedOrientations: ['R0', 'R90', 'R180', 'R270', 'MX', 'MY'],
    nominalCurrentMa: 15,
  },
  ROM_16KB: {
    id: 'ROM_16KB',
    name: 'Boot ROM 16KB',
    category: 'Memory',
    width: 80,
    height: 70,
    pins: [
      { id: 'CLK', x: 20, y: 0, edge: 'bottom', layer: 'M3', net: 'clk' },
      { id: 'ADDR[0]', x: 40, y: 0, edge: 'bottom', layer: 'M3', net: 'addr[0]' },
      { id: 'DOUT[0]', x: 60, y: 0, edge: 'bottom', layer: 'M3', net: 'dout[0]' },
      { id: 'VDD_CORE', x: 40, y: 70, edge: 'top', layer: 'M4', net: 'VDD' },
    ],
    defaultHalo: 15,
    allowedOrientations: ['R0', 'R90', 'R180', 'R270', 'MX', 'MY'],
    nominalCurrentMa: 8,
  },
  PLL_CORE: {
    id: 'PLL_CORE',
    name: 'Analog Clock PLL & Clock Generator',
    category: 'Analog',
    width: 70,
    height: 70,
    pins: [
      { id: 'REF_CLK', x: 0, y: 35, edge: 'left', layer: 'M3', net: 'ref_clk' },
      { id: 'OUT_CLK', x: 70, y: 35, edge: 'right', layer: 'M3', net: 'clk' },
      { id: 'AVDD', x: 35, y: 70, edge: 'top', layer: 'M4', net: 'VDD' },
      { id: 'AVSS', x: 35, y: 0, edge: 'bottom', layer: 'M4', net: 'VSS' },
    ],
    defaultHalo: 20,
    isAnalog: true,
    allowedOrientations: ['R0', 'R180'],
    nominalCurrentMa: 12,
  },
  DSP_ACCEL: {
    id: 'DSP_ACCEL',
    name: 'DSP / Vector Multiply-Accumulate Accelerator',
    category: 'Compute',
    width: 140,
    height: 110,
    pins: [
      { id: 'CLK', x: 30, y: 0, edge: 'bottom', layer: 'M3', net: 'clk' },
      { id: 'IN_A[0]', x: 60, y: 0, edge: 'bottom', layer: 'M3', net: 'in_a[0]' },
      { id: 'IN_B[0]', x: 90, y: 0, edge: 'bottom', layer: 'M3', net: 'in_b[0]' },
      { id: 'OUT_P[0]', x: 120, y: 0, edge: 'bottom', layer: 'M3', net: 'out_p[0]' },
      { id: 'VDD_CORE', x: 0, y: 55, edge: 'left', layer: 'M4', net: 'VDD' },
      { id: 'VSS_CORE', x: 140, y: 55, edge: 'right', layer: 'M4', net: 'VSS' },
    ],
    defaultHalo: 20,
    allowedOrientations: ['R0', 'R90', 'R180', 'R270', 'MX', 'MY'],
    nominalCurrentMa: 35,
  },
  PERIPH_DMA: {
    id: 'PERIPH_DMA',
    name: 'Direct Memory Access Controller',
    category: 'Peripheral',
    width: 90,
    height: 80,
    pins: [
      { id: 'CLK', x: 20, y: 0, edge: 'bottom', layer: 'M3', net: 'clk' },
      { id: 'REQ', x: 45, y: 0, edge: 'bottom', layer: 'M3', net: 'dma_req' },
      { id: 'ACK', x: 70, y: 0, edge: 'bottom', layer: 'M3', net: 'dma_ack' },
      { id: 'VDD_CORE', x: 45, y: 80, edge: 'top', layer: 'M4', net: 'VDD' },
    ],
    defaultHalo: 15,
    allowedOrientations: ['R0', 'R90', 'R180', 'R270', 'MX', 'MY'],
    nominalCurrentMa: 15,
  },
  GENERIC_MACRO: {
    id: 'GENERIC_MACRO',
    name: 'Generic Educational Macro Block',
    category: 'Custom',
    width: 80,
    height: 60,
    pins: [
      { id: 'IN', x: 0, y: 30, edge: 'left', layer: 'M3', net: 'in' },
      { id: 'OUT', x: 80, y: 30, edge: 'right', layer: 'M3', net: 'out' },
      { id: 'VDD', x: 40, y: 60, edge: 'top', layer: 'M4', net: 'VDD' },
      { id: 'VSS', x: 40, y: 0, edge: 'bottom', layer: 'M4', net: 'VSS' },
    ],
    defaultHalo: 15,
    allowedOrientations: ['R0', 'R90', 'R180', 'R270', 'MX', 'MY'],
    nominalCurrentMa: 15,
  },
};

/**
 * Creates a brand new default FloorplanProject.
 *
 * @param {string} name
 * @param {'beginner'|'intermediate'|'advanced'|'empty'} preset
 * @returns {Object}
 */
export function createDefaultProject(name = 'Untitled Floorplan', preset = 'beginner') {
  const projectId = `fp_proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (preset === 'empty') {
    return {
      schemaVersion: SCHEMA_VERSION,
      projectId,
      name,
      technologyProfile: { ...DEFAULT_TECH_PROFILE },
      die: { x: 0, y: 0, width: 400, height: 320 },
      core: { x: 40, y: 40, width: 320, height: 240 },
      standardCellAreaUm2: 20000,
      macros: [],
      pins: [],
      nets: [],
      placementRows: [
        { x: 40, y: 40, width: 320, height: 240, siteWidth: 0.46, rowHeight: 2.72 },
      ],
      blockages: [],
      placementRegions: [],
      powerNetwork: {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 28, y: 28, width: 344, height: 264, lineWidth: 6 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 18, y: 18, width: 364, height: 284, lineWidth: 6 },
        ],
        straps: [],
        vias: [],
        sources: [
          { nodeId: 'ring_vdd', net: 'VDD' },
          { nodeId: 'ring_vss', net: 'VSS' },
        ],
        loads: [],
      },
      constraints: {
        maxUtilization: 70,
        minMacroHalo: 15,
        minPinSpacing: 10,
        targetAspectRatio: 1.0,
        voltageDropBudgetMv: 30,
        congestionThreshold: 0.8,
      },
    };
  }

  if (preset === 'intermediate') {
    return {
      schemaVersion: SCHEMA_VERSION,
      projectId,
      name,
      technologyProfile: { ...DEFAULT_TECH_PROFILE },
      die: { x: 0, y: 0, width: 560, height: 460 },
      core: { x: 40, y: 40, width: 480, height: 380 },
      standardCellAreaUm2: 60000,
      macros: [
        { id: 'MEM_BANK0', masterId: 'SRAM_32KB', name: 'MEM Bank 0', x: 60, y: 60, width: 100, height: 80, orientation: 'R0', halo: 15, fixed: false },
        { id: 'MEM_BANK1', masterId: 'SRAM_32KB', name: 'MEM Bank 1', x: 60, y: 280, width: 100, height: 80, orientation: 'R0', halo: 15, fixed: false },
        { id: 'MEM_BANK2', masterId: 'SRAM_32KB', name: 'MEM Bank 2', x: 400, y: 60, width: 100, height: 80, orientation: 'MY', halo: 15, fixed: false },
        { id: 'MEM_BANK3', masterId: 'SRAM_32KB', name: 'MEM Bank 3', x: 400, y: 280, width: 100, height: 80, orientation: 'MY', halo: 15, fixed: false },
      ],
      pins: [
        { id: 'clk_sys', net: 'clk_sys', edge: 'top', coord: 200, layer: 'M3' },
        { id: 'clk_mem', net: 'clk_mem', edge: 'top', coord: 240, layer: 'M3' },
        { id: 'd_in[0]', net: 'd_in[0]', edge: 'left', coord: 120, layer: 'M4' },
        { id: 'd_in[1]', net: 'd_in[1]', edge: 'left', coord: 140, layer: 'M4' },
        { id: 'd_out[0]', net: 'd_out[0]', edge: 'right', coord: 120, layer: 'M4' },
        { id: 'd_out[1]', net: 'd_out[1]', edge: 'right', coord: 140, layer: 'M4' },
      ],
      nets: [
        { id: 'net_clk_sys', name: 'clk_sys', type: 'clock', sources: ['clk_sys'], sinks: ['MEM_BANK0', 'MEM_BANK1'] },
        { id: 'net_clk_mem', name: 'clk_mem', type: 'clock', sources: ['clk_mem'], sinks: ['MEM_BANK2', 'MEM_BANK3'] },
      ],
      placementRows: [{ x: 40, y: 40, width: 480, height: 380, siteWidth: 0.46, rowHeight: 2.72 }],
      blockages: [],
      placementRegions: [],
      powerNetwork: {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 28, y: 28, width: 504, height: 404, lineWidth: 8 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 16, y: 16, width: 528, height: 428, lineWidth: 8 },
        ],
        straps: [
          { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 28, y1: 200, x2: 532, y2: 200, width: 6 },
          { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 16, y1: 250, x2: 544, y2: 250, width: 6 },
        ],
        vias: [
          { id: 'via_1', layer1: 'M4', layer2: 'M5', x: 28, y: 200, net: 'VDD' },
          { id: 'via_2', layer1: 'M4', layer2: 'M5', x: 532, y: 200, net: 'VDD' },
          { id: 'via_3', layer1: 'M4', layer2: 'M5', x: 16, y: 250, net: 'VSS' },
          { id: 'via_4', layer1: 'M4', layer2: 'M5', x: 544, y: 250, net: 'VSS' },
        ],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 20 }, { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 20 }],
      },
      constraints: { maxUtilization: 75, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
    };
  }

  if (preset === 'advanced') {
    return {
      schemaVersion: SCHEMA_VERSION,
      projectId,
      name,
      technologyProfile: { ...DEFAULT_TECH_PROFILE },
      die: { x: 0, y: 0, width: 720, height: 540 },
      core: { x: 50, y: 50, width: 620, height: 440 },
      standardCellAreaUm2: 120000,
      macros: [
        { id: 'CPU_ROM', masterId: 'ROM_16KB', name: 'Boot ROM', x: 70, y: 70, width: 100, height: 80, orientation: 'R0', halo: 15, fixed: false },
        { id: 'CPU_SRAM', masterId: 'SRAM_64KB', name: 'L1 Data SRAM', x: 70, y: 310, width: 120, height: 100, orientation: 'R0', halo: 20, fixed: false },
        { id: 'PERIPH_SRAM', masterId: 'SRAM_32KB', name: 'DMA Buffer', x: 520, y: 70, width: 120, height: 100, orientation: 'MY', halo: 15, fixed: false },
        { id: 'DSP_ACCEL', masterId: 'DSP_ACCEL', name: 'MAC Accelerator', x: 500, y: 310, width: 140, height: 110, orientation: 'MY', halo: 20, fixed: false },
      ],
      pins: [
        { id: 'clk_core', net: 'clk_core', edge: 'top', coord: 220, layer: 'M3' },
        { id: 'rst_sys_n', net: 'rst_sys_n', edge: 'top', coord: 250, layer: 'M3' },
      ],
      nets: [],
      placementRows: [{ x: 50, y: 50, width: 620, height: 440, siteWidth: 0.46, rowHeight: 2.72 }],
      blockages: [{ id: 'blk_pll', name: 'Analog PLL Keepout', x: 300, y: 60, width: 80, height: 60, type: 'placement_hard' }],
      placementRegions: [{ id: 'reg_mem', name: 'Memory Subsystem Region', x: 60, y: 60, width: 220, height: 360, allowedMasters: ['SRAM_64KB', 'SRAM_32KB', 'ROM_16KB'] }],
      powerNetwork: {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 35, y: 35, width: 650, height: 470, lineWidth: 10 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 20, y: 20, width: 680, height: 500, lineWidth: 10 },
        ],
        straps: [
          { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 35, y1: 200, x2: 685, y2: 200, width: 6 },
          { id: 'strap_vdd_2', net: 'VDD', layer: 'M4', x1: 35, y1: 360, x2: 685, y2: 360, width: 6 },
          { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 20, y1: 260, x2: 700, y2: 260, width: 6 },
          { id: 'strap_vss_2', net: 'VSS', layer: 'M4', x1: 20, y1: 420, x2: 700, y2: 420, width: 6 },
        ],
        vias: [
          { id: 'via_1', layer1: 'M4', layer2: 'M5', x: 35, y: 200, net: 'VDD' },
          { id: 'via_2', layer1: 'M4', layer2: 'M5', x: 685, y: 200, net: 'VDD' },
          { id: 'via_3', layer1: 'M4', layer2: 'M5', x: 35, y: 360, net: 'VDD' },
          { id: 'via_4', layer1: 'M4', layer2: 'M5', x: 685, y: 360, net: 'VDD' },
          { id: 'via_5', layer1: 'M4', layer2: 'M5', x: 20, y: 260, net: 'VSS' },
          { id: 'via_6', layer1: 'M4', layer2: 'M5', x: 700, y: 260, net: 'VSS' },
          { id: 'via_7', layer1: 'M4', layer2: 'M5', x: 20, y: 420, net: 'VSS' },
          { id: 'via_8', layer1: 'M4', layer2: 'M5', x: 700, y: 420, net: 'VSS' },
        ],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 25 }, { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 25 }],
      },
      constraints: { maxUtilization: 80, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
    };
  }

  // Beginner Default
  return {
    schemaVersion: SCHEMA_VERSION,
    projectId,
    name,
    technologyProfile: { ...DEFAULT_TECH_PROFILE },
    die: { x: 0, y: 0, width: 400, height: 320 },
    core: { x: 40, y: 40, width: 320, height: 240 },
    standardCellAreaUm2: 28000,
    macros: [
      { id: 'SRAM_DATA', masterId: 'GENERIC_MACRO', name: 'SRAM Data (80×60)', x: 60, y: 60, width: 80, height: 60, orientation: 'R0', halo: 15, fixed: false },
      { id: 'SRAM_INST', masterId: 'GENERIC_MACRO', name: 'SRAM Inst (80×60)', x: 260, y: 60, width: 80, height: 60, orientation: 'R0', halo: 15, fixed: false },
    ],
    pins: [
      { id: 'clk', net: 'clk', edge: 'top', coord: 160, layer: 'M3' },
      { id: 'rst_n', net: 'rst_n', edge: 'top', coord: 180, layer: 'M3' },
      { id: 'data_in[0]', net: 'data_in[0]', edge: 'left', coord: 80, layer: 'M4' },
      { id: 'data_in[1]', net: 'data_in[1]', edge: 'left', coord: 120, layer: 'M4' },
      { id: 'data_out[0]', net: 'data_out[0]', edge: 'right', coord: 80, layer: 'M4' },
      { id: 'data_out[1]', net: 'data_out[1]', edge: 'right', coord: 120, layer: 'M4' },
    ],
    nets: [
      { id: 'net_clk', name: 'clk', type: 'clock', sources: ['clk'], sinks: ['SRAM_DATA', 'SRAM_INST'] },
      { id: 'net_data', name: 'data_bus', type: 'signal', sources: ['data_in[0]', 'data_in[1]'], sinks: ['SRAM_DATA'] },
      { id: 'net_out', name: 'out_bus', type: 'signal', sources: ['SRAM_DATA'], sinks: ['data_out[0]', 'data_out[1]'] },
    ],
    placementRows: [
      { x: 40, y: 40, width: 320, height: 240, siteWidth: 0.46, rowHeight: 2.72 },
    ],
    blockages: [],
    placementRegions: [],
    powerNetwork: {
      rings: [
        { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 28, y: 28, width: 344, height: 264, lineWidth: 6 },
        { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 18, y: 18, width: 364, height: 284, lineWidth: 6 },
      ],
      straps: [
        { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 28, y1: 140, x2: 372, y2: 140, width: 4 },
        { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 18, y1: 180, x2: 382, y2: 180, width: 4 },
      ],
      vias: [
        { id: 'via_1', layer1: 'M4', layer2: 'M5', x: 28, y: 140, net: 'VDD' },
        { id: 'via_2', layer1: 'M4', layer2: 'M5', x: 372, y: 140, net: 'VDD' },
        { id: 'via_3', layer1: 'M4', layer2: 'M5', x: 18, y: 180, net: 'VSS' },
        { id: 'via_4', layer1: 'M4', layer2: 'M5', x: 382, y: 180, net: 'VSS' },
      ],
      sources: [
        { nodeId: 'ring_vdd', net: 'VDD' },
        { nodeId: 'ring_vss', net: 'VSS' },
      ],
      loads: [
        { nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 15 },
        { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 15 },
      ],
    },
    constraints: {
      maxUtilization: 70,
      minMacroHalo: 15,
      minPinSpacing: 10,
      targetAspectRatio: 1.0,
      voltageDropBudgetMv: 30,
      congestionThreshold: 0.8,
    },
  };
}

/**
 * Serialize a project to deterministic formatted JSON.
 */
export function serializeProject(project) {
  if (!project) throw new Error('Cannot serialize null or undefined project');
  return JSON.stringify(project, null, 2);
}

/**
 * Deserialize JSON to a FloorplanProject, applying migrations if necessary.
 */
export function deserializeProject(json) {
  if (typeof json !== 'string') {
    throw new Error('Project JSON must be a string');
  }
  const parsed = JSON.parse(json);
  const problems = validateProjectShape(parsed);
  if (problems.length > 0) {
    throw new Error(`Not a valid floorplan project: ${problems.join('; ')}`);
  }
  return migrateProject(parsed);
}

/**
 * Structural validation for imported/loaded projects.
 * Returns a list of descriptive problems (empty when the JSON is a usable floorplan).
 */
export function validateProjectShape(raw) {
  const problems = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['top-level value must be a JSON object'];
  }

  // Validate rectangles (die and core)
  const rect = (r, label) => {
    if (!r || typeof r !== 'object') {
      problems.push(`missing ${label} rectangle`);
      return;
    }
    ['width', 'height'].forEach((k) => {
      const v = Number(r[k]);
      if (!Number.isFinite(v) || v <= 0) {
        problems.push(`${label}.${k} must be a positive number`);
      }
    });
    ['x', 'y'].forEach((k) => {
      if (r[k] !== undefined && !Number.isFinite(Number(r[k]))) {
        problems.push(`${label}.${k} must be numeric`);
      }
    });
  };

  rect(raw.die, 'die');
  rect(raw.core, 'core');

  // Verify core is completely within die boundaries
  if (raw.die && raw.core && raw.die.width > 0 && raw.core.width > 0) {
    const dieX = Number(raw.die.x || 0);
    const dieY = Number(raw.die.y || 0);
    const dieW = Number(raw.die.width);
    const dieH = Number(raw.die.height);
    const coreX = Number(raw.core.x || 0);
    const coreY = Number(raw.core.y || 0);
    const coreW = Number(raw.core.width);
    const coreH = Number(raw.core.height);

    if (coreW > dieW || coreH > dieH) {
      problems.push('core dimensions cannot exceed die dimensions');
    }
    if (coreX < dieX) {
      problems.push(`core.x (${coreX}) is outside die left boundary (${dieX})`);
    }
    if (coreY < dieY) {
      problems.push(`core.y (${coreY}) is outside die top boundary (${dieY})`);
    }
    if (coreX + coreW > dieX + dieW) {
      problems.push(`core right edge (${coreX + coreW}) exceeds die right boundary (${dieX + dieW})`);
    }
    if (coreY + coreH > dieY + dieH) {
      problems.push(`core bottom edge (${coreY + coreH}) exceeds die bottom boundary (${dieY + dieH})`);
    }
  }

  // Validate macros array
  const seenMacroIds = new Set();
  const validOrientations = ['R0', 'R90', 'R180', 'R270', 'MX', 'MY', 'N', 'W', 'S', 'E', 'FN', 'FS'];
  if (raw.macros !== undefined && !Array.isArray(raw.macros)) {
    problems.push('macros must be an array');
  } else if (Array.isArray(raw.macros)) {
    raw.macros.forEach((m, i) => {
      if (!m) {
        problems.push(`macros[${i}] cannot be null`);
        return;
      }
      if (!m.id) {
        problems.push(`macros[${i}] needs an id`);
      } else {
        if (seenMacroIds.has(m.id)) problems.push(`duplicate macro id '${m.id}'`);
        seenMacroIds.add(m.id);
      }
      const w = Number(m.width);
      const h = Number(m.height);
      if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
        problems.push(`macros[${i}] needs positive width and height`);
      }
      const mx = Number(m.x);
      const my = Number(m.y);
      if (!Number.isFinite(mx) || !Number.isFinite(my)) {
        problems.push(`macros[${i}] needs finite numeric x and y coordinates`);
      }
      if (m.orientation && !validOrientations.includes(m.orientation)) {
        problems.push(`macros[${i}].orientation '${m.orientation}' is not supported`);
      }
    });
  }

  // Validate pins array
  const seenPinIds = new Set();
  if (raw.pins !== undefined && !Array.isArray(raw.pins)) {
    problems.push('pins must be an array');
  } else if (Array.isArray(raw.pins)) {
    raw.pins.forEach((p, i) => {
      if (!p || !p.id) {
        problems.push(`pins[${i}] needs an id`);
        return;
      }
      if (seenPinIds.has(p.id)) {
        problems.push(`duplicate pin id '${p.id}'`);
      }
      seenPinIds.add(p.id);
      if (p.edge && !['top', 'bottom', 'left', 'right'].includes(p.edge)) {
        problems.push(`pins[${i}].edge must be top/bottom/left/right`);
      }
    });
  }

  // Validate powerNetwork if present
  if (raw.powerNetwork && typeof raw.powerNetwork === 'object') {
    const pn = raw.powerNetwork;
    if (pn.vias && Array.isArray(pn.vias)) {
      pn.vias.forEach((v, i) => {
        if (!v || !Number.isFinite(Number(v.x)) || !Number.isFinite(Number(v.y))) {
          problems.push(`powerNetwork.vias[${i}] missing valid x or y coordinate`);
        }
      });
    }
  }

  return problems;
}

/**
 * Migrate older or incomplete project shapes to Schema v2.
 */
export function migrateProject(raw) {
  if (!raw || typeof raw !== 'object') {
    return createDefaultProject('Recovered Project', 'beginner');
  }

  const base = createDefaultProject(raw.name || 'Migrated Project', 'beginner');

  // Retain technology profile or initialize defaults
  const techProfile = raw.technologyProfile
    ? { ...DEFAULT_TECH_PROFILE, ...raw.technologyProfile }
    : { ...DEFAULT_TECH_PROFILE };

  return {
    schemaVersion: raw.schemaVersion || base.schemaVersion || SCHEMA_VERSION,
    projectId: raw.projectId || base.projectId,
    name: raw.name || base.name,
    technologyProfile: techProfile,
    technologyPreset: raw.technologyPreset || 'sky130_educational',
    die: raw.die ? { ...raw.die } : base.die,
    core: raw.core ? { ...raw.core } : base.core,
    standardCellAreaUm2: Number(raw.standardCellAreaUm2) || base.standardCellAreaUm2,
    macros: Array.isArray(raw.macros) ? raw.macros.map((m) => {
      const macroObj = {
        id: m.id || `macro_${Math.random().toString(36).substring(2, 6)}`,
        name: m.name || m.id,
        x: Number(m.x) || 0,
        y: Number(m.y) || 0,
        width: Number(m.width) || 60,
        height: Number(m.height) || 40,
        orientation: m.orientation || 'R0',
        halo: Number(m.halo) >= 0 ? Number(m.halo) : 15,
        fixed: Boolean(m.fixed),
      };
      if (m.masterId !== undefined) macroObj.masterId = m.masterId;
      if (m.region !== undefined) macroObj.region = m.region;
      if (m.pins !== undefined) macroObj.pins = m.pins;
      return macroObj;
    }) : [],
    pins: Array.isArray(raw.pins) ? raw.pins.map((p) => {
      const pinObj = {
        id: p.id,
        net: p.net || p.id,
        edge: p.edge || 'top',
        coord: Number(p.coord) || 0,
        layer: p.layer || 'M3',
      };
      if (p.group !== undefined) pinObj.group = p.group;
      if (p.isFixed !== undefined) pinObj.isFixed = p.isFixed;
      return pinObj;
    }) : [],
    nets: Array.isArray(raw.nets) ? raw.nets.map((n) => ({
      id: n.id || `net_${Math.random().toString(36).substring(2, 6)}`,
      name: n.name || n.id,
      type: n.type || 'signal',
      sources: Array.isArray(n.sources) ? n.sources : [],
      sinks: Array.isArray(n.sinks) ? n.sinks : [],
      weight: Number(n.weight) || 1.0,
      criticality: n.criticality || 'normal',
    })) : [],
    placementRows: Array.isArray(raw.placementRows) ? raw.placementRows : base.placementRows,
    blockages: Array.isArray(raw.blockages) ? raw.blockages.map((b) => ({
      id: b.id || `blk_${Math.random().toString(36).substring(2, 6)}`,
      name: b.name || b.id,
      x: Number(b.x) || 0,
      y: Number(b.y) || 0,
      width: Number(b.width) || 40,
      height: Number(b.height) || 40,
      type: b.type || 'placement_hard',
    })) : [],
    placementRegions: Array.isArray(raw.placementRegions) ? raw.placementRegions.map((r) => ({
      id: r.id || `reg_${Math.random().toString(36).substring(2, 6)}`,
      name: r.name || r.id,
      x: Number(r.x) || 0,
      y: Number(r.y) || 0,
      width: Number(r.width) || 100,
      height: Number(r.height) || 100,
      allowedMasters: Array.isArray(r.allowedMasters) ? r.allowedMasters : [],
    })) : [],
    powerNetwork: raw.powerNetwork ? {
      rings: Array.isArray(raw.powerNetwork.rings) ? raw.powerNetwork.rings : [],
      straps: Array.isArray(raw.powerNetwork.straps) ? raw.powerNetwork.straps : [],
      vias: Array.isArray(raw.powerNetwork.vias) ? raw.powerNetwork.vias : [],
      sources: Array.isArray(raw.powerNetwork.sources) ? raw.powerNetwork.sources : [],
      loads: Array.isArray(raw.powerNetwork.loads) ? raw.powerNetwork.loads.map((l) => ({ ...l })) : [],
    } : base.powerNetwork,
    constraints: raw.constraints ? {
      maxUtilization: Number(raw.constraints.maxUtilization) || 70,
      minMacroHalo: Number(raw.constraints.minMacroHalo) || 15,
      minPinSpacing: Number(raw.constraints.minPinSpacing) || 10,
      targetAspectRatio: Number(raw.constraints.targetAspectRatio) || 1.0,
      voltageDropBudgetMv: Number(raw.constraints.voltageDropBudgetMv) || 30,
      congestionThreshold: Number(raw.constraints.congestionThreshold) || 0.8,
    } : base.constraints,
    candidates: Array.isArray(raw.candidates) ? raw.candidates.map((c) => ({ ...c })) : (base.candidates || []),
    assignmentId: raw.assignmentId || base.assignmentId,
  };
}

// ─── SIX PRODUCTION BENCHMARK SCENARIOS (A THROUGH F) ───────────────────────

/**
 * Scenario A: Simple Control ASIC (Beginner)
 * Single SRAM macro, basic I/O pins, clean power mesh.
 */
export const SCENARIO_SIMPLE_CONTROL = {
  schemaVersion: SCHEMA_VERSION,
  projectId: 'scenario_simple_control',
  name: 'Scenario A: Simple Control ASIC',
  scenarioId: 'SCENARIO_A',
  learningGoals: 'Understand core/die boundaries, simple macro placement, and basic pin routing.',
  technologyProfile: { ...DEFAULT_TECH_PROFILE },
  die: { x: 0, y: 0, width: 360, height: 280 },
  core: { x: 30, y: 30, width: 300, height: 220 },
  standardCellAreaUm2: 18000,
  macros: [
    { id: 'SRAM_MAIN', masterId: 'SRAM_32KB', name: 'Main SRAM', x: 50, y: 50, width: 110, height: 90, orientation: 'R0', halo: 15, fixed: false },
  ],
  pins: [
    { id: 'clk', net: 'clk', edge: 'top', coord: 150, layer: 'M3' },
    { id: 'rst_n', net: 'rst_n', edge: 'top', coord: 180, layer: 'M3' },
    { id: 'din[0]', net: 'din[0]', edge: 'left', coord: 60, layer: 'M4' },
    { id: 'din[1]', net: 'din[1]', edge: 'left', coord: 100, layer: 'M4' },
    { id: 'dout[0]', net: 'dout[0]', edge: 'right', coord: 60, layer: 'M4' },
    { id: 'dout[1]', net: 'dout[1]', edge: 'right', coord: 100, layer: 'M4' },
  ],
  nets: [
    { id: 'net_clk', name: 'clk', type: 'clock', sources: ['clk'], sinks: ['SRAM_MAIN'] },
    { id: 'net_din', name: 'data_in', type: 'signal', sources: ['din[0]', 'din[1]'], sinks: ['SRAM_MAIN'] },
    { id: 'net_dout', name: 'data_out', type: 'signal', sources: ['SRAM_MAIN'], sinks: ['dout[0]', 'dout[1]'] },
  ],
  placementRows: [{ x: 30, y: 30, width: 300, height: 220, siteWidth: 0.46, rowHeight: 2.72 }],
  blockages: [],
  placementRegions: [],
  powerNetwork: {
    rings: [
      { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 320, height: 240, lineWidth: 6 },
      { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 340, height: 260, lineWidth: 6 },
    ],
    straps: [
      { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 20, y1: 140, x2: 340, y2: 140, width: 4 },
      { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 10, y1: 170, x2: 350, y2: 170, width: 4 },
    ],
    vias: [
      { id: 'v1', layer1: 'M4', layer2: 'M5', x: 20, y: 140, net: 'VDD' },
      { id: 'v2', layer1: 'M4', layer2: 'M5', x: 340, y: 140, net: 'VDD' },
      { id: 'v3', layer1: 'M4', layer2: 'M5', x: 10, y: 170, net: 'VSS' },
      { id: 'v4', layer1: 'M4', layer2: 'M5', x: 350, y: 170, net: 'VSS' },
    ],
    sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
    loads: [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 15 }, { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 15 }],
  },
  constraints: { maxUtilization: 70, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
};

/**
 * Scenario B: Dual SRAM Controller
 * Two symmetric memory banks, data buses, halos, and standard cell channel.
 */
export const SCENARIO_DUAL_SRAM = {
  schemaVersion: SCHEMA_VERSION,
  projectId: 'scenario_dual_sram',
  name: 'Scenario B: Dual SRAM Controller',
  scenarioId: 'SCENARIO_B',
  learningGoals: 'Optimize channel width between macros and align I/O buses to memory terminals.',
  technologyProfile: { ...DEFAULT_TECH_PROFILE },
  die: { x: 0, y: 0, width: 480, height: 360 },
  core: { x: 30, y: 30, width: 420, height: 300 },
  standardCellAreaUm2: 35000,
  macros: [
    { id: 'SRAM_LEFT', masterId: 'SRAM_32KB', name: 'Left Memory Bank', x: 50, y: 50, width: 110, height: 90, orientation: 'R0', halo: 15, fixed: false },
    { id: 'SRAM_RIGHT', masterId: 'SRAM_32KB', name: 'Right Memory Bank', x: 320, y: 50, width: 110, height: 90, orientation: 'MY', halo: 15, fixed: false },
  ],
  pins: [
    { id: 'clk_sys', net: 'clk_sys', edge: 'top', coord: 180, layer: 'M3' },
    { id: 'rst_sys_n', net: 'rst_sys_n', edge: 'top', coord: 220, layer: 'M3' },
    { id: 'd_in[0]', net: 'd_in[0]', edge: 'left', coord: 60, layer: 'M4' },
    { id: 'd_in[1]', net: 'd_in[1]', edge: 'left', coord: 90, layer: 'M4' },
    { id: 'd_out[0]', net: 'd_out[0]', edge: 'right', coord: 60, layer: 'M4' },
    { id: 'd_out[1]', net: 'd_out[1]', edge: 'right', coord: 90, layer: 'M4' },
  ],
  nets: [
    { id: 'net_clk', name: 'clk_sys', type: 'clock', sources: ['clk_sys'], sinks: ['SRAM_LEFT', 'SRAM_RIGHT'] },
    { id: 'net_in', name: 'data_in', type: 'signal', sources: ['d_in[0]', 'd_in[1]'], sinks: ['SRAM_LEFT'] },
    { id: 'net_out', name: 'data_out', type: 'signal', sources: ['SRAM_RIGHT'], sinks: ['d_out[0]', 'd_out[1]'] },
  ],
  placementRows: [{ x: 30, y: 30, width: 420, height: 300, siteWidth: 0.46, rowHeight: 2.72 }],
  blockages: [],
  placementRegions: [],
  powerNetwork: {
    rings: [
      { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 440, height: 320, lineWidth: 6 },
      { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 460, height: 340, lineWidth: 6 },
    ],
    straps: [
      { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 20, y1: 180, x2: 460, y2: 180, width: 4 },
      { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 10, y1: 210, x2: 470, y2: 210, width: 4 },
    ],
    vias: [
      { id: 'v1', layer1: 'M4', layer2: 'M5', x: 20, y: 180, net: 'VDD' },
      { id: 'v2', layer1: 'M4', layer2: 'M5', x: 460, y: 180, net: 'VDD' },
      { id: 'v3', layer1: 'M4', layer2: 'M5', x: 10, y: 210, net: 'VSS' },
      { id: 'v4', layer1: 'M4', layer2: 'M5', x: 470, y: 210, net: 'VSS' },
    ],
    sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
    loads: [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 20 }, { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 20 }],
  },
  constraints: { maxUtilization: 72, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
};

/**
 * Scenario C: Four-Macro Subsystem
 * Multi-macro placement optimization lab with interconnect flylines.
 */
export const SCENARIO_FOUR_MACRO = {
  schemaVersion: SCHEMA_VERSION,
  projectId: 'scenario_four_macro',
  name: 'Scenario C: Four-Macro Subsystem',
  scenarioId: 'SCENARIO_C',
  learningGoals: 'Evaluate HPWL reduction and flyline crossing optimization across 4 interacting macros.',
  technologyProfile: { ...DEFAULT_TECH_PROFILE },
  die: { x: 0, y: 0, width: 560, height: 440 },
  core: { x: 40, y: 40, width: 480, height: 360 },
  standardCellAreaUm2: 45000,
  macros: [
    { id: 'ROM_BOOT', masterId: 'ROM_16KB', name: 'Boot ROM', x: 60, y: 60, width: 80, height: 70, orientation: 'R0', halo: 15, fixed: false },
    { id: 'SRAM_DATA', masterId: 'SRAM_32KB', name: 'Data Memory', x: 60, y: 230, width: 110, height: 90, orientation: 'R0', halo: 15, fixed: false },
    { id: 'DMA_CORE', masterId: 'PERIPH_DMA', name: 'DMA Engine', x: 370, y: 60, width: 90, height: 80, orientation: 'MY', halo: 15, fixed: false },
    { id: 'MAC_ACCEL', masterId: 'DSP_ACCEL', name: 'DSP Coprocessor', x: 340, y: 210, width: 140, height: 110, orientation: 'MY', halo: 20, fixed: false },
  ],
  pins: [
    { id: 'clk_osc', net: 'clk_osc', edge: 'top', coord: 200, layer: 'M3' },
    { id: 'rst_sys', net: 'rst_sys', edge: 'top', coord: 240, layer: 'M3' },
    { id: 'host_tx[0]', net: 'host_tx[0]', edge: 'left', coord: 100, layer: 'M4' },
    { id: 'host_tx[1]', net: 'host_tx[1]', edge: 'left', coord: 130, layer: 'M4' },
    { id: 'host_rx[0]', net: 'host_rx[0]', edge: 'right', coord: 100, layer: 'M4' },
    { id: 'host_rx[1]', net: 'host_rx[1]', edge: 'right', coord: 130, layer: 'M4' },
  ],
  nets: [
    { id: 'net_clk', name: 'clk_osc', type: 'clock', sources: ['clk_osc'], sinks: ['ROM_BOOT', 'SRAM_DATA', 'DMA_CORE', 'MAC_ACCEL'] },
    { id: 'net_dma_sram', name: 'dma_bus', type: 'signal', sources: ['DMA_CORE'], sinks: ['SRAM_DATA'], weight: 2.0 },
    { id: 'net_dsp_sram', name: 'dsp_bus', type: 'signal', sources: ['MAC_ACCEL'], sinks: ['SRAM_DATA'], weight: 3.0 },
  ],
  placementRows: [{ x: 40, y: 40, width: 480, height: 360, siteWidth: 0.46, rowHeight: 2.72 }],
  blockages: [],
  placementRegions: [],
  powerNetwork: {
    rings: [
      { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 26, y: 26, width: 508, height: 388, lineWidth: 8 },
      { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 14, y: 14, width: 532, height: 412, lineWidth: 8 },
    ],
    straps: [
      { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 26, y1: 180, x2: 534, y2: 180, width: 5 },
      { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 14, y1: 240, x2: 546, y2: 240, width: 5 },
    ],
    vias: [
      { id: 'v1', layer1: 'M4', layer2: 'M5', x: 26, y: 180, net: 'VDD' },
      { id: 'v2', layer1: 'M4', layer2: 'M5', x: 534, y: 180, net: 'VDD' },
      { id: 'v3', layer1: 'M4', layer2: 'M5', x: 14, y: 240, net: 'VSS' },
      { id: 'v4', layer1: 'M4', layer2: 'M5', x: 546, y: 240, net: 'VSS' },
    ],
    sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
    loads: [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 25 }, { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 25 }],
  },
  constraints: { maxUtilization: 72, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
};

/**
 * Scenario D: Small SoC Subsystem
 * Heterogeneous architecture with placement regions, analog keepouts, and bus routing.
 */
export const SCENARIO_SMALL_SOC = {
  schemaVersion: SCHEMA_VERSION,
  projectId: 'scenario_small_soc',
  name: 'Scenario D: Small SoC Subsystem',
  scenarioId: 'SCENARIO_D',
  learningGoals: 'Coordinate multi-region placement, analog PLL isolation, and dense multi-metal PDN grid.',
  technologyProfile: { ...DEFAULT_TECH_PROFILE },
  die: { x: 0, y: 0, width: 720, height: 540 },
  core: { x: 40, y: 40, width: 640, height: 460 },
  standardCellAreaUm2: 95000,
  macros: [
    { id: 'CPU_CORE', masterId: 'DSP_ACCEL', name: 'RISC-V Core', x: 55, y: 55, width: 140, height: 110, orientation: 'R0', halo: 15, fixed: false },
    { id: 'DCACHE', masterId: 'SRAM_64KB', name: 'Data Cache', x: 55, y: 320, width: 160, height: 120, orientation: 'R0', halo: 15, fixed: false },
    { id: 'ICACHE', masterId: 'SRAM_32KB', name: 'Inst Cache', x: 510, y: 55, width: 110, height: 90, orientation: 'MY', halo: 15, fixed: false },
    { id: 'SYS_DMA', masterId: 'PERIPH_DMA', name: 'DMA Ctrl', x: 510, y: 320, width: 90, height: 80, orientation: 'MY', halo: 15, fixed: false },
    { id: 'ANALOG_PLL', masterId: 'PLL_CORE', name: 'System PLL', x: 300, y: 55, width: 70, height: 70, orientation: 'R0', halo: 20, fixed: true },
  ],
  pins: [
    { id: 'pin_irq0', net: 'irq0', edge: 'top', coord: 120, layer: 'M3' },
    { id: 'pin_irq1', net: 'irq1', edge: 'top', coord: 135, layer: 'M3' },
    { id: 'clk_osc', net: 'clk_osc', edge: 'top', coord: 200, layer: 'M3' },
    { id: 'rst_top', net: 'rst_top', edge: 'top', coord: 230, layer: 'M3' },
    { id: 'gpio_0', net: 'gpio_0', edge: 'bottom', coord: 150, layer: 'M3' },
    { id: 'gpio_1', net: 'gpio_1', edge: 'bottom', coord: 180, layer: 'M3' },
  ],
  nets: [
    { id: 'net_clk', name: 'clk_osc', type: 'clock', sources: ['clk_osc'], sinks: ['CPU_CORE', 'DCACHE', 'ICACHE', 'SYS_DMA'] },
    { id: 'net_dcache', name: 'dcache_bus', type: 'signal', sources: ['CPU_CORE'], sinks: ['DCACHE'], weight: 3.0 },
    { id: 'net_icache', name: 'icache_bus', type: 'signal', sources: ['CPU_CORE'], sinks: ['ICACHE'], weight: 2.5 },
  ],
  placementRows: [{ x: 40, y: 40, width: 640, height: 460, siteWidth: 0.46, rowHeight: 2.72 }],
  blockages: [
    { id: 'blk_analog', name: 'Analog Isolation Barrier', x: 280, y: 45, width: 110, height: 90, type: 'placement_hard' },
  ],
  placementRegions: [
    { id: 'reg_cpu', name: 'CPU Subsystem Fence', x: 45, y: 45, width: 220, height: 420, allowedMasters: ['DSP_ACCEL', 'SRAM_64KB'] },
  ],
  powerNetwork: {
    rings: [
      { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 26, y: 26, width: 668, height: 488, lineWidth: 8 },
      { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 14, y: 14, width: 692, height: 512, lineWidth: 8 },
    ],
    straps: [
      { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 26, y1: 220, x2: 694, y2: 220, width: 6 },
      { id: 'strap_vdd_2', net: 'VDD', layer: 'M4', x1: 26, y1: 380, x2: 694, y2: 380, width: 6 },
      { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 14, y1: 280, x2: 706, y2: 280, width: 6 },
      { id: 'strap_vss_2', net: 'VSS', layer: 'M4', x1: 14, y1: 440, x2: 706, y2: 440, width: 6 },
    ],
    vias: [
      { id: 'v1', layer1: 'M4', layer2: 'M5', x: 26, y: 220, net: 'VDD' },
      { id: 'v2', layer1: 'M4', layer2: 'M5', x: 694, y: 220, net: 'VDD' },
      { id: 'v3', layer1: 'M4', layer2: 'M5', x: 26, y: 380, net: 'VDD' },
      { id: 'v4', layer1: 'M4', layer2: 'M5', x: 694, y: 380, net: 'VDD' },
      { id: 'v5', layer1: 'M4', layer2: 'M5', x: 14, y: 280, net: 'VSS' },
      { id: 'v6', layer1: 'M4', layer2: 'M5', x: 706, y: 280, net: 'VSS' },
      { id: 'v7', layer1: 'M4', layer2: 'M5', x: 14, y: 440, net: 'VSS' },
      { id: 'v8', layer1: 'M4', layer2: 'M5', x: 706, y: 440, net: 'VSS' },
    ],
    sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
    loads: [
      { nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 30 },
      { nodeId: 'strap_vdd_2', net: 'VDD', currentMa: 25 },
      { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 30 },
      { nodeId: 'strap_vss_2', net: 'VSS', currentMa: 25 },
    ],
  },
  constraints: { maxUtilization: 75, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
};

/**
 * Scenario E: Broken PDN (Diagnostic Benchmark)
 * Contains intentional physical and electrical faults:
 * - Floating strap (no via connection)
 * - Wrong-layer via (M1-M2 via placed on M4-M5 mesh)
 * - VDD-to-VSS short via
 */
export const SCENARIO_BROKEN_PDN = {
  schemaVersion: SCHEMA_VERSION,
  projectId: 'scenario_broken_pdn',
  name: 'Scenario E: Broken Power Grid Lab',
  scenarioId: 'SCENARIO_E',
  learningGoals: 'Identify and repair floating straps, short circuits, and layer mismatch vias.',
  technologyProfile: { ...DEFAULT_TECH_PROFILE },
  die: { x: 0, y: 0, width: 440, height: 340 },
  core: { x: 30, y: 30, width: 380, height: 280 },
  standardCellAreaUm2: 25000,
  macros: [
    { id: 'SRAM_FAULT', masterId: 'SRAM_32KB', name: 'Faulty SRAM', x: 50, y: 50, width: 110, height: 90, orientation: 'R0', halo: 15, fixed: false },
  ],
  pins: [
    { id: 'clk', net: 'clk', edge: 'top', coord: 150, layer: 'M3' },
  ],
  nets: [],
  placementRows: [{ x: 30, y: 30, width: 380, height: 280, siteWidth: 0.46, rowHeight: 2.72 }],
  blockages: [],
  placementRegions: [],
  powerNetwork: {
    rings: [
      { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 400, height: 300, lineWidth: 6 },
      { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 420, height: 320, lineWidth: 6 },
    ],
    straps: [
      { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 10, y1: 140, x2: 420, y2: 140, width: 4 },
      // Floating VSS strap: x1 starts inside at 50, not reaching ring at 10
      { id: 'strap_vss_floating', net: 'VSS', layer: 'M4', x1: 50, y1: 180, x2: 380, y2: 180, width: 4 },
    ],
    vias: [
      { id: 'via_vdd_left', layer1: 'M4', layer2: 'M5', x: 20, y: 140, net: 'VDD' },
      // Intentional fault 1: Wrong layer via (M1-M2 specified instead of M4-M5)
      { id: 'via_wrong_layer', layer1: 'M1', layer2: 'M2', x: 420, y: 140, net: 'VDD' },
      // Intentional fault 2: VDD-VSS short via! Via labeled VDD placed on VSS ring
      { id: 'via_short_bridge', layer1: 'M4', layer2: 'M5', x: 10, y: 140, net: 'VDD' },
    ],
    sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
    loads: [
      { nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 20 },
      { nodeId: 'strap_vss_floating', net: 'VSS', currentMa: 20 },
    ],
  },
  constraints: { maxUtilization: 70, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
};

/**
 * Scenario F: Congestion Stress Design
 * Heavily clustered macros and pins creating an acute routing bottleneck corridor.
 * Moving macros apart relieves the congestion hotspot below the 0.8 threshold.
 */
export const SCENARIO_CONGESTION_STRESS = {
  schemaVersion: SCHEMA_VERSION,
  projectId: 'scenario_congestion_stress',
  name: 'Scenario F: Congestion Bottleneck Stress Lab',
  scenarioId: 'SCENARIO_F',
  learningGoals: 'Alleviate severe routing channel congestion by relocating bottleneck macros.',
  technologyProfile: { ...DEFAULT_TECH_PROFILE },
  die: { x: 0, y: 0, width: 480, height: 380 },
  core: { x: 30, y: 30, width: 420, height: 320 },
  standardCellAreaUm2: 38000,
  macros: [
    // Two large macros squeezed into a 25µm corridor in the center
    { id: 'MACRO_A', masterId: 'SRAM_32KB', name: 'SRAM Cluster A', x: 120, y: 100, width: 110, height: 90, orientation: 'R0', halo: 15, fixed: false },
    { id: 'MACRO_B', masterId: 'DSP_ACCEL', name: 'DSP Cluster B', x: 245, y: 100, width: 140, height: 110, orientation: 'R0', halo: 15, fixed: false },
  ],
  pins: [
    { id: 'bus_in[0]', net: 'bus_in[0]', edge: 'left', coord: 80, layer: 'M4' },
    { id: 'bus_in[1]', net: 'bus_in[1]', edge: 'left', coord: 95, layer: 'M4' },
    { id: 'bus_in[2]', net: 'bus_in[2]', edge: 'left', coord: 110, layer: 'M4' },
    { id: 'bus_out[0]', net: 'bus_out[0]', edge: 'right', coord: 80, layer: 'M4' },
    { id: 'bus_out[1]', net: 'bus_out[1]', edge: 'right', coord: 95, layer: 'M4' },
    { id: 'bus_out[2]', net: 'bus_out[2]', edge: 'right', coord: 110, layer: 'M4' },
  ],
  nets: [
    { id: 'n_bus0', name: 'bus_0', type: 'signal', sources: ['bus_in[0]'], sinks: ['MACRO_A', 'MACRO_B', 'bus_out[0]'], weight: 3.0 },
    { id: 'n_bus1', name: 'bus_1', type: 'signal', sources: ['bus_in[1]'], sinks: ['MACRO_A', 'MACRO_B', 'bus_out[1]'], weight: 3.0 },
    { id: 'n_bus2', name: 'bus_2', type: 'signal', sources: ['bus_in[2]'], sinks: ['MACRO_A', 'MACRO_B', 'bus_out[2]'], weight: 3.0 },
  ],
  placementRows: [{ x: 30, y: 30, width: 420, height: 320, siteWidth: 0.46, rowHeight: 2.72 }],
  blockages: [
    { id: 'blk_corridor', name: 'Channel Obstruction', x: 232, y: 80, width: 12, height: 140, type: 'placement_hard' },
  ],
  placementRegions: [],
  powerNetwork: {
    rings: [
      { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 440, height: 340, lineWidth: 6 },
      { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 460, height: 360, lineWidth: 6 },
    ],
    straps: [
      { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 20, y1: 160, x2: 460, y2: 160, width: 4 },
      { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 10, y1: 220, x2: 470, y2: 220, width: 4 },
    ],
    vias: [
      { id: 'v1', layer1: 'M4', layer2: 'M5', x: 20, y: 160, net: 'VDD' },
      { id: 'v2', layer1: 'M4', layer2: 'M5', x: 460, y: 160, net: 'VDD' },
      { id: 'v3', layer1: 'M4', layer2: 'M5', x: 10, y: 220, net: 'VSS' },
      { id: 'v4', layer1: 'M4', layer2: 'M5', x: 470, y: 220, net: 'VSS' },
    ],
    sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
    loads: [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 20 }, { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 20 }],
  },
  constraints: { maxUtilization: 72, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
};

/**
 * Scenario Capstone: 6-Macro Multi-Core SoC
 * Complete production-ready multi-macro SoC floorplan ready for signoff and CTS handoff.
 */
export const SCENARIO_SOC_CAPSTONE = {
  schemaVersion: SCHEMA_VERSION,
  projectId: 'scenario_soc_capstone',
  name: 'Capstone: 6-Macro Multi-Core SoC',
  scenarioId: 'SCENARIO_CAPSTONE',
  learningGoals: 'Full SoC physical design sign-off: 6 macros, DRC clean, PDN continuity, IR drop <= 30 mV, and placement handoff.',
  technologyProfile: { ...DEFAULT_TECH_PROFILE },
  die: { x: 0, y: 0, width: 720, height: 540 },
  core: { x: 40, y: 40, width: 640, height: 460 },
  standardCellAreaUm2: 85000,
  macros: [
    { id: 'CPU_CORE', masterId: 'DSP_ACCEL', name: 'CPU', x: 55, y: 55, width: 140, height: 110, orientation: 'R0', halo: 15, fixed: false },
    { id: 'DCACHE', masterId: 'SRAM_64KB', name: 'DCache', x: 55, y: 320, width: 140, height: 110, orientation: 'R0', halo: 15, fixed: false },
    { id: 'ICACHE', masterId: 'SRAM_32KB', name: 'ICache', x: 510, y: 55, width: 110, height: 90, orientation: 'MY', halo: 15, fixed: false },
    { id: 'SYS_DMA', masterId: 'PERIPH_DMA', name: 'DMA', x: 510, y: 320, width: 90, height: 80, orientation: 'MY', halo: 15, fixed: false },
    { id: 'BOOT_ROM', masterId: 'ROM_16KB', name: 'ROM', x: 230, y: 55, width: 100, height: 80, orientation: 'R0', halo: 15, fixed: false },
    { id: 'PLL', masterId: 'PLL_CORE', name: 'PLL', x: 370, y: 55, width: 70, height: 70, orientation: 'R0', halo: 20, fixed: true },
  ],
  pins: [
    { id: 'clk', net: 'clk', edge: 'top', coord: 180, layer: 'M3' },
    { id: 'rst_n', net: 'rst_n', edge: 'top', coord: 210, layer: 'M3' },
    { id: 'din[0]', net: 'din[0]', edge: 'left', coord: 120, layer: 'M4' },
    { id: 'dout[0]', net: 'dout[0]', edge: 'right', coord: 120, layer: 'M4' },
  ],
  nets: [
    { id: 'n1', sources: ['clk'], sinks: ['CPU_CORE', 'DCACHE', 'ICACHE'] },
  ],
  placementRows: [{ x: 40, y: 40, width: 640, height: 460, siteWidth: 0.46, rowHeight: 2.72 }],
  blockages: [],
  placementRegions: [],
  powerNetwork: {
    rings: [
      { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 26, y: 26, width: 668, height: 488, lineWidth: 10 },
      { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 14, y: 14, width: 692, height: 512, lineWidth: 10 },
    ],
    straps: [
      { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 26, y1: 220, x2: 694, y2: 220, width: 10 },
      { id: 'strap_vdd_2', net: 'VDD', layer: 'M4', x1: 26, y1: 380, x2: 694, y2: 380, width: 10 },
      { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 14, y1: 280, x2: 706, y2: 280, width: 10 },
      { id: 'strap_vss_2', net: 'VSS', layer: 'M4', x1: 14, y1: 440, x2: 706, y2: 440, width: 10 },
    ],
    vias: [
      { id: 'v1', layer1: 'M4', layer2: 'M5', x: 26, y: 220, net: 'VDD' },
      { id: 'v2', layer1: 'M4', layer2: 'M5', x: 694, y: 220, net: 'VDD' },
      { id: 'v3', layer1: 'M4', layer2: 'M5', x: 26, y: 380, net: 'VDD' },
      { id: 'v4', layer1: 'M4', layer2: 'M5', x: 694, y: 380, net: 'VDD' },
      { id: 'v5', layer1: 'M4', layer2: 'M5', x: 14, y: 280, net: 'VSS' },
      { id: 'v6', layer1: 'M4', layer2: 'M5', x: 706, y: 280, net: 'VSS' },
      { id: 'v7', layer1: 'M4', layer2: 'M5', x: 14, y: 440, net: 'VSS' },
      { id: 'v8', layer1: 'M4', layer2: 'M5', x: 706, y: 440, net: 'VSS' },
    ],
    sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
    loads: [
      { nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 15 },
      { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 15 },
    ],
  },
  candidates: [
    { id: 'cand_1', name: 'Seed Arch', hpwl: 1800, worstDropMv: 24 },
    { id: 'cand_2', name: 'Optimized Dual Core', hpwl: 1400, worstDropMv: 18 },
  ],
  constraints: { maxUtilization: 75, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
};

// ─── THREE PRESERVED HISTORICAL BENCHMARK EXAMPLES ──────────────────────────

export const EXAMPLE_SMALL_CONTROLLER = {
  schemaVersion: SCHEMA_VERSION_V1,
  projectId: 'example_small_controller',
  name: 'Small Controller (Benchmark)',
  technologyPreset: 'sky130_educational',
  die: { x: 0, y: 0, width: 240, height: 200 },
  core: { x: 20, y: 20, width: 200, height: 160 },
  standardCellAreaUm2: 12000,
  macros: [
    { id: 'SRAM1', name: 'SRAM1 (60×40)', x: 30, y: 30, width: 60, height: 40, orientation: 'R0', halo: 15, fixed: false },
    { id: 'SRAM2', name: 'SRAM2 (60×40)', x: 70, y: 45, width: 60, height: 40, orientation: 'R0', halo: 15, fixed: false },
  ],
  pins: [
    { id: 'clk', net: 'clk', edge: 'top', coord: 60, layer: 'M3' },
    { id: 'rst_n', net: 'rst_n', edge: 'top', coord: 100, layer: 'M3' },
    { id: 'in[0]', net: 'in[0]', edge: 'left', coord: 40, layer: 'M4' },
    { id: 'in[1]', net: 'in[1]', edge: 'left', coord: 80, layer: 'M4' },
    { id: 'out[0]', net: 'out[0]', edge: 'right', coord: 40, layer: 'M4' },
    { id: 'out[1]', net: 'out[1]', edge: 'right', coord: 80, layer: 'M4' },
    { id: 'out[2]', net: 'out[2]', edge: 'bottom', coord: 60, layer: 'M3' },
    { id: 'out[3]', net: 'out[3]', edge: 'bottom', coord: 100, layer: 'M3' },
  ],
  nets: [
    { id: 'n_clk', name: 'clk', type: 'clock', sources: ['clk'], sinks: ['SRAM1', 'SRAM2'] },
  ],
  placementRows: [{ x: 20, y: 20, width: 200, height: 160, siteWidth: 0.46, rowHeight: 2.72 }],
  blockages: [],
  placementRegions: [],
  powerNetwork: {
    rings: [
      { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 12, y: 12, width: 216, height: 176, lineWidth: 4 },
      { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 6, y: 6, width: 228, height: 188, lineWidth: 4 },
    ],
    straps: [
      { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 12, y1: 100, x2: 228, y2: 100, width: 3 },
      { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 6, y1: 130, x2: 234, y2: 130, width: 3 },
    ],
    vias: [
      { id: 'v1', layer1: 'M4', layer2: 'M5', x: 12, y: 100, net: 'VDD' },
      { id: 'v2', layer1: 'M4', layer2: 'M5', x: 228, y: 100, net: 'VDD' },
      { id: 'v3', layer1: 'M4', layer2: 'M5', x: 6, y: 130, net: 'VSS' },
      { id: 'v4', layer1: 'M4', layer2: 'M5', x: 234, y: 130, net: 'VSS' },
    ],
    sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
    loads: [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 15 }, { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 15 }],
  },
  constraints: { maxUtilization: 70, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
};

export const EXAMPLE_DUAL_SRAM_CONTROLLER = {
  schemaVersion: SCHEMA_VERSION_V1,
  projectId: 'example_dual_sram_controller',
  name: 'Dual SRAM Controller (Benchmark)',
  technologyPreset: 'sky130_educational',
  die: { x: 0, y: 0, width: 480, height: 360 },
  core: { x: 30, y: 30, width: 420, height: 300 },
  standardCellAreaUm2: 40000,
  macros: [
    { id: 'SRAM_A', name: 'SRAM A', x: 45, y: 45, width: 90, height: 70, orientation: 'R0', halo: 15, fixed: false },
    { id: 'SRAM_B', name: 'SRAM B', x: 45, y: 240, width: 90, height: 70, orientation: 'R0', halo: 15, fixed: false },
    { id: 'SRAM_C', name: 'SRAM C', x: 340, y: 45, width: 90, height: 70, orientation: 'MY', halo: 15, fixed: false },
    { id: 'SRAM_D', name: 'SRAM D', x: 340, y: 240, width: 90, height: 70, orientation: 'MY', halo: 15, fixed: false },
  ],
  pins: [
    { id: 'clk', net: 'clk', edge: 'top', coord: 150, layer: 'M3' },
    { id: 'rst', net: 'rst', edge: 'top', coord: 180, layer: 'M3' },
    { id: 'd0', net: 'd0', edge: 'left', coord: 60, layer: 'M4' },
    { id: 'd1', net: 'd1', edge: 'left', coord: 80, layer: 'M4' },
    { id: 'd2', net: 'd2', edge: 'left', coord: 100, layer: 'M4' },
    { id: 'd3', net: 'd3', edge: 'left', coord: 120, layer: 'M4' },
    { id: 'q0', net: 'q0', edge: 'right', coord: 60, layer: 'M4' },
    { id: 'q1', net: 'q1', edge: 'right', coord: 80, layer: 'M4' },
    { id: 'q2', net: 'q2', edge: 'right', coord: 100, layer: 'M4' },
    { id: 'q3', net: 'q3', edge: 'right', coord: 120, layer: 'M4' },
  ],
  nets: [],
  placementRows: [{ x: 30, y: 30, width: 420, height: 300, siteWidth: 0.46, rowHeight: 2.72 }],
  blockages: [],
  placementRegions: [],
  powerNetwork: {
    rings: [
      { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 440, height: 320, lineWidth: 6 },
      { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 460, height: 340, lineWidth: 6 },
    ],
    straps: [
      { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 20, y1: 180, x2: 460, y2: 180, width: 4 },
      { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 10, y1: 210, x2: 470, y2: 210, width: 4 },
    ],
    vias: [
      { id: 'v1', layer1: 'M4', layer2: 'M5', x: 20, y: 180, net: 'VDD' },
      { id: 'v3', layer1: 'M4', layer2: 'M5', x: 10, y: 210, net: 'VSS' },
      { id: 'v4', layer1: 'M4', layer2: 'M5', x: 470, y: 210, net: 'VSS' },
    ],
    sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
    loads: [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 15 }, { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 15 }],
  },
  constraints: { maxUtilization: 72, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
};

export const EXAMPLE_SMALL_SOC_SUBSYSTEM = {
  schemaVersion: SCHEMA_VERSION_V1,
  projectId: 'example_small_soc_subsystem',
  name: 'Small SoC Subsystem (Benchmark)',
  technologyPreset: 'sky130_educational',
  die: { x: 0, y: 0, width: 720, height: 540 },
  core: { x: 40, y: 40, width: 640, height: 460 },
  standardCellAreaUm2: 95000,
  macros: [
    { id: 'CPU_CORE', name: 'RISC-V Core', x: 55, y: 55, width: 140, height: 110, orientation: 'R0', halo: 15, fixed: false },
    { id: 'DCACHE', name: 'Data Cache', x: 55, y: 320, width: 130, height: 95, orientation: 'R0', halo: 15, fixed: false },
    { id: 'ICACHE', name: 'Inst Cache', x: 510, y: 55, width: 130, height: 95, orientation: 'MY', halo: 15, fixed: false },
    { id: 'SYS_DMA', name: 'DMA Ctrl', x: 510, y: 320, width: 120, height: 85, orientation: 'MY', halo: 15, fixed: false },
  ],
  pins: [
    { id: 'pin_irq0', net: 'irq0', edge: 'top', coord: 120, layer: 'M3' },
    { id: 'pin_irq1', net: 'irq1', edge: 'top', coord: 123, layer: 'M3' },
    { id: 'clk_osc', net: 'clk_osc', edge: 'top', coord: 200, layer: 'M3' },
    { id: 'rst_top', net: 'rst_top', edge: 'top', coord: 230, layer: 'M3' },
    { id: 'gpio_0', net: 'gpio_0', edge: 'bottom', coord: 150, layer: 'M3' },
    { id: 'gpio_1', net: 'gpio_1', edge: 'bottom', coord: 180, layer: 'M3' },
  ],
  nets: [],
  placementRows: [{ x: 40, y: 40, width: 640, height: 460, siteWidth: 0.46, rowHeight: 2.72 }],
  blockages: [],
  placementRegions: [],
  powerNetwork: {
    rings: [
      { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 26, y: 26, width: 668, height: 488, lineWidth: 8 },
      { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 14, y: 14, width: 692, height: 512, lineWidth: 8 },
    ],
    straps: [
      { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 26, y1: 220, x2: 694, y2: 220, width: 6 },
      { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 14, y1: 280, x2: 706, y2: 280, width: 6 },
    ],
    vias: [
      { id: 'v1', layer1: 'M4', layer2: 'M5', x: 26, y: 220, net: 'VDD' },
      { id: 'v2', layer1: 'M4', layer2: 'M5', x: 694, y: 220, net: 'VDD' },
      { id: 'v3', layer1: 'M4', layer2: 'M5', x: 14, y: 280, net: 'VSS' },
      { id: 'v4', layer1: 'M4', layer2: 'M5', x: 706, y: 280, net: 'VSS' },
    ],
    sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
    loads: [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 15 }, { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 15 }],
  },
  constraints: { maxUtilization: 75, minMacroHalo: 15, minPinSpacing: 10, targetAspectRatio: 1.0, voltageDropBudgetMv: 30, congestionThreshold: 0.8 },
};
