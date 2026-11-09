/**
 * guidedAssignmentService.js
 * ===========================
 * Unified, reusable Guided Studio Assignment architecture for Floorplanning 3.0 (FP-6 through FP-36).
 *
 * Implements:
 * 1. Dedicated starting scenario generation for each curriculum lesson.
 * 2. Authentic schema-valid FloorplanProject linking with assignmentId enforcement.
 * 3. Physical, geometric, and electrical evaluation based on real physical design mathematics.
 * 4. Fail-closed grading preventing quiz-only bypasses or grading unrelated saved projects.
 */

import {
  createDefaultProject,
  validateProjectShape,
  MACRO_MASTERS_LIBRARY,
  EXAMPLE_DUAL_SRAM_CONTROLLER,
  SCENARIO_CONGESTION_STRESS,
} from '../../../engine/floorplanProjectModel.js';
import {
  computeAspectRatio,
  computeUtilization,
  checkMacroOverlap,
  checkMacroCoreContainment,
  checkPinSpacing,
  computeHPWL,
} from '../../../engine/floorplanGeometry.js';
import {
  solveResistivePDN,
  detectVDDVSSShort,
  detectOpenConnections,
  detectMissingVias,
} from '../../../engine/floorplanPDN.js';
import { computeCongestionMap } from '../../../engine/floorplanCongestion.js';
import { evaluateFloorplanSignoff } from '../../../engine/floorplanSignoff.js';
import { generateLEF, generateDEF } from '../../../engine/floorplanExport.js';

/**
 * Creates the authentic initial starting project for a given lesson scenario.
 * Starts in an uncompleted or flawed state matching the advertised pedagogical objective.
 *
 * @param {string} lessonId - e.g. 'fp-6', 'fp-25', etc.
 * @returns {Object} Schema-valid FloorplanProject
 */
export function getAssignmentScenario(lessonId) {
  if (lessonId === 'fp-24') {
    const p24 = JSON.parse(JSON.stringify(EXAMPLE_DUAL_SRAM_CONTROLLER));
    p24.assignmentId = 'fp-24';
    return p24;
  }

  let base = createDefaultProject(`FP Assignment ${lessonId}`, 'empty');
  base.assignmentId = lessonId;

  switch (lessonId) {
    // ── Module 2: Die & Core Architecture ──
    case 'fp-6':
      base.die = { x: 0, y: 0, width: 600, height: 400 };
      base.core = { x: 50, y: 50, width: 500, height: 300 }; // Aspect ratio 0.60
      break;

    case 'fp-7':
      base.die = { x: 0, y: 0, width: 500, height: 400 };
      base.core = { x: 50, y: 50, width: 400, height: 300 }; // Area 120,000 um2 (Needs >= 350,000)
      base.standardCellAreaUm2 = 1250000;
      break;

    case 'fp-8':
      base.die = { x: 0, y: 0, width: 600, height: 500 };
      base.core = { x: 10, y: 10, width: 560, height: 460 }; // Margin 10um < 35um
      base.standardCellAreaUm2 = 80000;
      break;

    case 'fp-9':
      base.die = { x: 0, y: 0, width: 500, height: 400 };
      base.core = { x: 40, y: 40, width: 420, height: 320 };
      base.pins = [
        { id: 'clk', net: 'clk', edge: 'top', coord: 100, layer: 'M3' },
        { id: 'rst_n', net: 'rst_n', edge: 'top', coord: 120, layer: 'M3' },
      ];
      break;

    case 'fp-10':
      base.die = { x: 0, y: 0, width: 500, height: 400 };
      base.core = { x: 40, y: 40, width: 420, height: 320 };
      base.pins = [
        { id: 'p_err', net: 'p_err', edge: 'top', coord: 15, layer: 'M3' },
        { id: 'clk', net: 'clk', edge: 'top', coord: 200, layer: 'M3' },
      ];
      break;

    case 'fp-11':
      base.die = { x: 0, y: 0, width: 400, height: 320 };
      base.core = { x: 40, y: 40, width: 320, height: 240 };
      base.standardCellAreaUm2 = 68000; // 88.5% utilization > 70%
      break;

    // ── Module 3: I/O Planning & Bumps ──
    case 'fp-12':
      base.die = { x: 0, y: 0, width: 500, height: 400 };
      base.core = { x: 40, y: 40, width: 420, height: 320 };
      base.pins = [
        { id: 'd0', net: 'd0', edge: 'top', coord: 100, layer: 'M3' },
        { id: 'd1', net: 'd1', edge: 'top', coord: 104, layer: 'M3' },
      ];
      break;

    case 'fp-13':
      base.die = { x: 0, y: 0, width: 500, height: 400 };
      base.core = { x: 40, y: 40, width: 420, height: 320 };
      base.pins = [
        { id: 'p1', net: 'p1', edge: 'top', coord: 100, layer: 'M3' },
        { id: 'p2', net: 'p2', edge: 'top', coord: 120, layer: 'M3' },
        { id: 'p3', net: 'p3', edge: 'top', coord: 140, layer: 'M3' },
        { id: 'p4', net: 'p4', edge: 'top', coord: 160, layer: 'M3' },
      ];
      break;

    case 'fp-14':
      base.die = { x: 0, y: 0, width: 500, height: 400 };
      base.core = { x: 40, y: 40, width: 420, height: 320 };
      base.pins = [
        { id: 'pin1', net: 'pin1', edge: 'top', coord: 100, layer: 'M3' },
        { id: 'pin2', net: 'pin2', edge: 'top', coord: 104, layer: 'M3' },
      ];
      break;

    case 'fp-15':
      base.die = { x: 0, y: 0, width: 500, height: 400 };
      base.core = { x: 40, y: 40, width: 420, height: 320 };
      base.pins = [
        { id: 'rx0', net: 'bus0', edge: 'left', coord: 80, layer: 'M3' },
        { id: 'tx0', net: 'bus0', edge: 'right', coord: 280, layer: 'M3' },
      ];
      break;

    case 'fp-16':
      base.die = { x: 0, y: 0, width: 560, height: 460 };
      base.core = { x: 40, y: 40, width: 480, height: 380 };
      base.powerNetwork = { rings: [], straps: [], vias: [] };
      break;

    case 'fp-17':
      base.die = { x: 0, y: 0, width: 560, height: 460 };
      base.core = { x: 40, y: 40, width: 480, height: 380 };
      base.powerNetwork = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 28, y: 28, width: 504, height: 404, lineWidth: 8 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 16, y: 16, width: 528, height: 428, lineWidth: 8 },
        ],
        straps: [
          { id: 's_v4_1', net: 'VDD', layer: 'M4', x1: 28, y1: 150, x2: 532, y2: 150, width: 6 },
        ],
        vias: [],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [{ nodeId: 's_v4_1', net: 'VDD', currentMa: 15 }],
      };
      break;

    case 'fp-18':
      base.die = { x: 0, y: 0, width: 560, height: 460 };
      base.core = { x: 40, y: 40, width: 480, height: 380 };
      base.powerNetwork = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 28, y: 28, width: 504, height: 404, lineWidth: 8 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 16, y: 16, width: 528, height: 428, lineWidth: 8 },
        ],
        straps: [
          { id: 's_v4_thin', net: 'VDD', layer: 'M4', x1: 28, y1: 180, x2: 532, y2: 180, width: 1.5 },
          { id: 's_v4_vss', net: 'VSS', layer: 'M4', x1: 16, y1: 240, x2: 544, y2: 240, width: 6 },
        ],
        vias: [
          { id: 'v1', layer1: 'M4', layer2: 'M5', x: 28, y: 180, net: 'VDD' },
          { id: 'v2', layer1: 'M4', layer2: 'M5', x: 16, y: 240, net: 'VSS' },
          { id: 'v3', layer1: 'M4', layer2: 'M5', x: 544, y: 240, net: 'VSS' },
        ],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [
          { nodeId: 's_v4_thin', net: 'VDD', currentMa: 45 },
          { nodeId: 's_v4_vss', net: 'VSS', currentMa: 15 },
        ],
      };
      break;

    // ── Module 4: Macro Placement ──
    case 'fp-19':
      base.die = { x: 0, y: 0, width: 600, height: 500 };
      base.core = { x: 50, y: 50, width: 500, height: 400 };
      base.macros = [
        { id: 'MACRO_A', masterId: 'SRAM_32KB', x: 80, y: 80, width: 120, height: 90, orientation: 'R0', halo: 15 },
        { id: 'MACRO_B', masterId: 'SRAM_32KB', x: 210, y: 80, width: 120, height: 90, orientation: 'R0', halo: 15 },
      ];
      break;

    case 'fp-20':
      base.die = { x: 0, y: 0, width: 600, height: 500 };
      base.core = { x: 50, y: 50, width: 500, height: 400 };
      base.macros = [
        { id: 'BANK_0', masterId: 'SRAM_32KB', x: 80, y: 80, width: 120, height: 90, orientation: 'R0', halo: 15 },
        { id: 'BANK_1', masterId: 'SRAM_32KB', x: 130, y: 210, width: 120, height: 90, orientation: 'R0', halo: 15 },
      ];
      break;

    case 'fp-21':
      base.die = { x: 0, y: 0, width: 600, height: 500 };
      base.core = { x: 50, y: 50, width: 500, height: 400 };
      base.macros = [
        { id: 'MACRO_0', masterId: 'SRAM_32KB', x: 80, y: 80, width: 120, height: 90, orientation: 'R0', halo: 15 },
      ];
      base.placementRegions = [];
      break;

    case 'fp-22':
      base.die = { x: 0, y: 0, width: 600, height: 500 };
      base.core = { x: 50, y: 50, width: 500, height: 400 };
      base.macros = [
        { id: 'ANALOG_PLL', masterId: 'ROM_16KB', name: 'Analog PLL', x: 80, y: 80, width: 90, height: 70, orientation: 'R0', halo: 15 },
        { id: 'DIGITAL_DSP', masterId: 'DSP_ACCEL', name: 'Noisy DSP', x: 180, y: 80, width: 120, height: 90, orientation: 'R0', halo: 15 },
      ];
      break;

    case 'fp-23':
      base.die = { x: 0, y: 0, width: 600, height: 500 };
      base.core = { x: 50, y: 50, width: 500, height: 400 };
      base.macros = [
        { id: 'HOT_0', masterId: 'DSP_ACCEL', name: 'High-Power Core 0', x: 200, y: 180, width: 100, height: 80, orientation: 'R0', powerMw: 50, halo: 15 },
        { id: 'HOT_1', masterId: 'DSP_ACCEL', name: 'High-Power Core 1', x: 220, y: 280, width: 100, height: 80, orientation: 'R0', powerMw: 50, halo: 15 },
      ];
      break;

    // ── Module 6: Macro Orientation & DRC ──
    case 'fp-25':
      base.die = { x: 0, y: 0, width: 600, height: 500 };
      base.core = { x: 50, y: 50, width: 500, height: 400 };
      base.macros = [
        { id: 'ICACHE', masterId: 'SRAM_64KB', x: 70, y: 70, width: 140, height: 100, orientation: 'R0', halo: 15 },
      ];
      break;

    case 'fp-26':
      base.die = { x: 0, y: 0, width: 650, height: 500 };
      base.core = { x: 50, y: 50, width: 550, height: 400 };
      base.macros = [
        { id: 'SRAM_AON', masterId: 'SRAM_32KB', x: 70, y: 70, width: 100, height: 80, orientation: 'R0', halo: 15 },
      ];
      base.placementRegions = [];
      base.blockages = [];
      break;

    case 'fp-27':
      base.die = { x: 0, y: 0, width: 650, height: 500 };
      base.core = { x: 50, y: 50, width: 550, height: 400 };
      base.macros = [
        { id: 'MACRO_A', masterId: 'SRAM_32KB', x: 100, y: 100, width: 120, height: 90, orientation: 'R0', halo: 15 },
        { id: 'MACRO_B', masterId: 'SRAM_32KB', x: 150, y: 130, width: 120, height: 90, orientation: 'R0', halo: 15 },
      ];
      break;

    case 'fp-28':
      base.die = { x: 0, y: 0, width: 600, height: 480 };
      base.core = { x: 50, y: 50, width: 500, height: 380 };
      base.pins = [
        { id: 'p0', net: 'p0', edge: 'top', coord: 100, layer: 'M3' },
        { id: 'p1', net: 'p1', edge: 'top', coord: 140, layer: 'M3' },
        { id: 'p2', net: 'p2', edge: 'top', coord: 180, layer: 'M3' },
        { id: 'p3', net: 'p3', edge: 'top', coord: 220, layer: 'M3' },
      ];
      break;

    // ── Module 7: Multi-Layer PDN & Nodal IR Drop ──
    case 'fp-29':
      base.die = { x: 0, y: 0, width: 560, height: 460 };
      base.core = { x: 40, y: 40, width: 480, height: 380 };
      base.powerNetwork = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 28, y: 28, width: 504, height: 404, lineWidth: 8 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 16, y: 16, width: 528, height: 428, lineWidth: 8 },
        ],
        straps: [
          { id: 's_v4_1', net: 'VDD', layer: 'M4', x1: 28, y1: 150, x2: 532, y2: 150, width: 4 },
          { id: 's_v4_2', net: 'VSS', layer: 'M4', x1: 16, y1: 220, x2: 544, y2: 220, width: 4 },
        ],
        vias: [],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [],
      };
      break;

    case 'fp-30':
      base.die = { x: 0, y: 0, width: 560, height: 460 };
      base.core = { x: 40, y: 40, width: 480, height: 380 };
      base.powerNetwork = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 28, y: 28, width: 504, height: 404, lineWidth: 8 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 16, y: 16, width: 528, height: 428, lineWidth: 8 },
        ],
        straps: [
          { id: 'strap_vdd_thin', net: 'VDD', layer: 'M4', x1: 28, y1: 200, x2: 532, y2: 200, width: 1.5 },
          { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 16, y1: 260, x2: 544, y2: 260, width: 6 },
        ],
        vias: [
          { id: 'v1', layer1: 'M4', layer2: 'M5', x: 28, y: 200, net: 'VDD' },
          { id: 'v2', layer1: 'M4', layer2: 'M5', x: 16, y: 260, net: 'VSS' },
          { id: 'v3', layer1: 'M4', layer2: 'M5', x: 544, y: 260, net: 'VSS' },
        ],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [
          { nodeId: 'strap_vdd_thin', net: 'VDD', currentMa: 40 },
          { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 15 },
        ],
      };
      break;

    case 'fp-31':
      base.die = { x: 0, y: 0, width: 560, height: 460 };
      base.core = { x: 40, y: 40, width: 480, height: 380 };
      base.powerNetwork = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 28, y: 28, width: 504, height: 404, lineWidth: 8 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 16, y: 16, width: 528, height: 428, lineWidth: 8 },
        ],
        straps: [
          { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 16, y1: 200, x2: 544, y2: 200, width: 6 },
        ],
        vias: [
          { id: 'via_short_err', layer1: 'M4', layer2: 'M5', x: 16, y: 200, net: 'VDD' },
        ],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [{ nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 15 }],
      };
      break;

    case 'fp-32':
      base.die = { x: 0, y: 0, width: 600, height: 500 };
      base.core = { x: 50, y: 50, width: 500, height: 400 };
      base.candidates = [{
        id: 'cand_1',
        name: 'Initial Seed',
        metrics: {
          dieArea: 300000,
          coreArea: 200000,
          totalHPWL: 1400,
          worstIRDropMv: 22,
          nominalUtilization: 20,
          errorCount: 0,
          warningCount: 0,
          isClean: true,
        },
      }];
      break;

    // ── Module 8: Routability, Export & Capstone ──
    case 'fp-33':
      base = JSON.parse(JSON.stringify(SCENARIO_CONGESTION_STRESS));
      base.assignmentId = 'fp-33';
      break;

    case 'fp-34':
      base.die = { x: 0, y: 0, width: 500, height: 400 };
      base.core = { x: 40, y: 40, width: 420, height: 320 };
      base.macros = [];
      break;

    case 'fp-35':
      base.die = { x: 0, y: 0, width: 640, height: 460 };
      base.core = { x: 40, y: 40, width: 560, height: 380 };
      base.standardCellAreaUm2 = 30000;
      base.macros = [
        { id: 'ICACHE', masterId: 'SRAM_32KB', x: 60, y: 60, width: 110, height: 90, orientation: 'R0', halo: 15 },
        { id: 'DCACHE', masterId: 'SRAM_32KB', x: 100, y: 80, width: 110, height: 90, orientation: 'R0', halo: 15 },
      ];
      break;

    case 'fp-36':
      base.die = { x: 0, y: 0, width: 720, height: 540 };
      base.core = { x: 50, y: 50, width: 620, height: 440 };
      base.macros = [
        { id: 'CPU_CORE0', masterId: 'DSP_ACCEL', name: 'Core 0', x: 70, y: 70, width: 120, height: 90, orientation: 'R0', halo: 15 },
        { id: 'CPU_CORE1', masterId: 'DSP_ACCEL', name: 'Core 1', x: 70, y: 190, width: 120, height: 90, orientation: 'R0', halo: 15 },
        { id: 'ICACHE0', masterId: 'SRAM_64KB', name: 'ICache 0', x: 220, y: 70, width: 140, height: 90, orientation: 'R0', halo: 15 },
        { id: 'DCACHE0', masterId: 'SRAM_64KB', name: 'DCache 0', x: 220, y: 190, width: 140, height: 90, orientation: 'R0', halo: 15 },
        { id: 'ROM_BOOT', masterId: 'ROM_16KB', name: 'Boot ROM', x: 400, y: 70, width: 90, height: 70, orientation: 'R0', halo: 15 },
        { id: 'PERIPH_BRIDGE', masterId: 'ROM_16KB', name: 'APB Bridge', x: 400, y: 190, width: 90, height: 70, orientation: 'R0', halo: 15 },
      ];
      base.placementRows = [{ x: 50, y: 50, width: 620, height: 440, siteWidth: 0.46, rowHeight: 2.72 }];
      base.pins = [
        { id: 'clk_sys', net: 'clk_sys', edge: 'top', coord: 150, layer: 'M3' },
        { id: 'rst_sys_n', net: 'rst_sys_n', edge: 'top', coord: 200, layer: 'M3' },
        { id: 'uart_tx', net: 'uart_tx', edge: 'bottom', coord: 150, layer: 'M3' },
        { id: 'uart_rx', net: 'uart_rx', edge: 'bottom', coord: 200, layer: 'M3' },
      ];
      base.powerNetwork = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 35, y: 35, width: 650, height: 470, lineWidth: 8 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 20, y: 20, width: 680, height: 500, lineWidth: 8 },
        ],
        straps: [
          { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 35, y1: 200, x2: 685, y2: 200, width: 2 },
          { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 20, y1: 260, x2: 700, y2: 260, width: 2 },
        ],
        vias: [
          { id: 'v1', layer1: 'M4', layer2: 'M5', x: 35, y: 200, net: 'VDD' },
          { id: 'v2', layer1: 'M4', layer2: 'M5', x: 20, y: 260, net: 'VSS' },
        ],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [
          { nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 40 },
          { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 40 },
        ],
      };
      base.candidates = [{
        id: 'cand_1',
        name: 'Seed Arch',
        metrics: {
          dieArea: 720 * 540,
          coreArea: 620 * 440,
          totalHPWL: 1800,
          worstIRDropMv: 45,
          nominalUtilization: 25,
          errorCount: 0,
          warningCount: 0,
          isClean: true,
        },
      }];
      break;

    default:
      break;
  }

  return base;
}

/**
 * Universal evaluator for Guided Studio Assignments (FP-6 through FP-36).
 * Ensures fail-closed enforcement of project evidence, assignment matching,
 * and physical/electrical verification.
 *
 * @param {string} lessonId
 * @param {Object} inputs - Includes formData and optional `inputs.project`
 * @param {boolean} isQuizOk - Supplementary quiz question outcome
 * @param {number} xpReward - Level reward
 * @returns {{ passed: boolean, score: number, stars: number, feedback: string }}
 */
export function evaluateGuidedAssignment(lessonId, inputs, isQuizOk = true, xpReward = 35) {
  const project = inputs?.project;

  // 1. Mandatory Schema-Valid Project Check (Fail-Closed)
  if (!project || !project.die || !project.core) {
    return {
      passed: false,
      score: isQuizOk ? 25 : 0,
      stars: 0,
      feedback: `⚠️ Concept quiz completed, but CAD certification requires a saved Studio project. Launch Studio for Assignment ${lessonId.toUpperCase()} to implement the physical layout.`,
    };
  }

  // 2. Assignment ID Matching (Guards against grading unrelated projects)
  if (project.assignmentId && project.assignmentId !== lessonId) {
    return {
      passed: false,
      score: isQuizOk ? 25 : 0,
      stars: 0,
      feedback: `⚠️ Assignment mismatch: Your active Studio project is configured for '${project.assignmentId}', but this lesson requires assignment '${lessonId}'. Please launch Studio from this lesson to work on the correct scenario.`,
    };
  }

  // 3. Project Schema Integrity
  const schemaProblems = validateProjectShape(project);
  if (schemaProblems.length > 0) {
    return {
      passed: false,
      score: 15,
      stars: 0,
      feedback: `⚠️ Project schema violation: ${schemaProblems[0]}. Correct die/core coordinates in Studio and re-verify.`,
    };
  }

  // 4. Specific Lesson Physical & Electrical Evaluation
  const signoff = evaluateFloorplanSignoff(project);
  const core = project.core;
  const die = project.die;
  const macros = project.macros || [];
  const pins = project.pins || [];
  const power = project.powerNetwork || { rings: [], straps: [], vias: [] };

  let isCadPassed = false;
  let feedback = '';

  switch (lessonId) {
    case 'fp-6': {
      const arObj = computeAspectRatio(core.width, core.height);
      const ar = arObj.ratio;
      const isArBalanced = ar >= 0.75 && ar <= 1.35;
      isCadPassed = isArBalanced;
      feedback = isCadPassed
        ? `✓ Aspect ratio optimized (${ar.toFixed(2)}) for balanced wirelength distribution!`
        : `⚠️ Current core aspect ratio is ${ar.toFixed(2)}. Adjust core dimensions in Studio toward a balanced ratio (0.80 to 1.25).`;
      break;
    }

    case 'fp-7': {
      const coreArea = core.width * core.height;
      const isAreaAdequate = coreArea >= 350000;
      const util = computeUtilization(coreArea, project.standardCellAreaUm2, macros, project.blockages, core);
      const isUtilLegal = util.rawNominalUtilization <= 80;
      isCadPassed = isAreaAdequate && isUtilLegal;
      feedback = isCadPassed
        ? `✓ Core area (${coreArea.toLocaleString()} µm²) budgeted correctly for gate count at ${util.rawNominalUtilization}% utilization!`
        : `⚠️ Core area is ${coreArea.toLocaleString()} µm² (utilization: ${util.rawNominalUtilization}%). Expand core dimensions in Studio so utilization is <= 80%.`;
      break;
    }

    case 'fp-8': {
      const marginL = core.x - die.x;
      const marginR = (die.x + die.width) - (core.x + core.width);
      const marginT = core.y - die.y;
      const marginB = (die.y + die.height) - (core.y + core.height);
      const minMargin = Math.min(marginL, marginR, marginT, marginB);
      isCadPassed = minMargin >= 35;
      feedback = isCadPassed
        ? `✓ Core-to-die margin verified (minimum margin: ${minMargin} µm >= 35 µm) for I/O and power rings!`
        : `⚠️ Minimum margin is ${minMargin} µm. Increase margins around the core to at least 35 µm on all four sides.`;
      break;
    }

    case 'fp-9': {
      isCadPassed = pins.length >= 6;
      feedback = isCadPassed
        ? `✓ I/O ring perimeter populated with ${pins.length} pads!`
        : `⚠️ I/O ring contains only ${pins.length} pads. Configure at least 6 boundary pads in Studio.`;
      break;
    }

    case 'fp-10': {
      let cornerViolations = 0;
      pins.forEach((p) => {
        const px = Number(p.x || p.coord || 0);
        const py = Number(p.y || p.coord || 0);
        if (p.edge === 'top' || p.edge === 'bottom') {
          if (px < 30 || px > core.width - 30) cornerViolations++;
        } else {
          if (py < 30 || py > core.height - 30) cornerViolations++;
        }
      });
      isCadPassed = cornerViolations === 0 && pins.length >= 2;
      feedback = isCadPassed
        ? '✓ Multi-corner pad keepouts respected (zero pads in corner exclusion zones)!'
        : `⚠️ Found ${cornerViolations} pad(s) violating the 30 µm corner exclusion keepout. Move pads away from die corners.`;
      break;
    }

    case 'fp-11': {
      const util = computeUtilization(core.width * core.height, project.standardCellAreaUm2, macros, project.blockages, core);
      isCadPassed = util.rawNominalUtilization <= 70;
      feedback = isCadPassed
        ? `✓ Core utilization (${util.rawNominalUtilization}%) within 70% budget!`
        : `⚠️ Utilization is ${util.rawNominalUtilization}% (> 70%). Expand core area or adjust cell count in Studio.`;
      break;
    }

    case 'fp-12': {
      let minPitch = Infinity;
      let hasSpacingViolation = false;
      ['top', 'bottom', 'left', 'right'].forEach((side) => {
        const sidePins = pins.filter((p) => p.edge === side);
        const res = checkPinSpacing(sidePins, side, 10, core.width, core.height);
        if (!res.valid || res.violations.length > 0) hasSpacingViolation = true;
        const getPos = (p) => (typeof p.coord === 'number' ? p.coord : p.position || 0);
        const sorted = [...sidePins].sort((a, b) => getPos(a) - getPos(b));
        for (let i = 0; i < sorted.length - 1; i++) {
          const sp = getPos(sorted[i + 1]) - getPos(sorted[i]);
          if (sp < minPitch) minPitch = sp;
        }
      });
      isCadPassed = !hasSpacingViolation && minPitch >= 10 && pins.length >= 2;
      feedback = isCadPassed
        ? `✓ I/O pad pitch verified (minimum pitch: ${minPitch} µm >= 10 µm DRC rule)!`
        : `⚠️ Minimum pad pitch is ${Number.isFinite(minPitch) ? minPitch + ' µm' : 'violating'} (< 10 µm rule). Space adjacent pads at least 10 µm apart.`;
      break;
    }

    case 'fp-13': {
      const layers = new Set(pins.map((p) => p.layer || 'M3'));
      isCadPassed = layers.size >= 2;
      feedback = isCadPassed
        ? `✓ Staggered I/O pad ring verified across multiple metal layers (${Array.from(layers).join(', ')})!`
        : '⚠️ All pads are placed on a single layer. Distribute pads across alternating metal layers (e.g. M3 and M4) to stagger pitch.';
      break;
    }

    case 'fp-14': {
      let minPitch = Infinity;
      let hasSpacingViolation = false;
      ['top', 'bottom', 'left', 'right'].forEach((side) => {
        const sidePins = pins.filter((p) => p.edge === side);
        const res = checkPinSpacing(sidePins, side, 10, core.width, core.height);
        if (!res.valid || res.violations.length > 0) hasSpacingViolation = true;
        const getPos = (p) => (typeof p.coord === 'number' ? p.coord : p.position || 0);
        const sorted = [...sidePins].sort((a, b) => getPos(a) - getPos(b));
        for (let i = 0; i < sorted.length - 1; i++) {
          const sp = getPos(sorted[i + 1]) - getPos(sorted[i]);
          if (sp < minPitch) minPitch = sp;
        }
      });
      isCadPassed = !hasSpacingViolation && minPitch >= 10 && pins.length >= 2;
      feedback = isCadPassed
        ? `✓ Area bump pad pitch certified (${minPitch} µm >= 10 µm)!`
        : `⚠️ Bump pad pitch is ${Number.isFinite(minPitch) ? minPitch + ' µm' : 'violating'} (< 10 µm). Space bumps apart.`;
      break;
    }

    case 'fp-15': {
      const leftPins = pins.filter((p) => p.edge === 'left');
      const rightPins = pins.filter((p) => p.edge === 'right');
      const isAligned = leftPins.length > 0 && rightPins.length > 0 && Math.abs(Number(leftPins[0].coord) - Number(rightPins[0].coord)) <= 20;
      isCadPassed = isAligned;
      feedback = isAligned
        ? '✓ Bus pin coordinates aligned across die channels!'
        : '⚠️ Unaligned bus pads cause jogged routing. Align pin coordinates along parallel channels in Studio.';
      break;
    }

    case 'fp-16': {
      const hasRings = (power.rings || []).length >= 2;
      isCadPassed = hasRings;
      feedback = hasRings
        ? '✓ Core power rings (VDD and VSS) synthesized on top metal layers!'
        : '⚠️ Missing power rings. Synthesize dual VDD and VSS rings in Studio.';
      break;
    }

    case 'fp-17': {
      const missing = detectMissingVias(power);
      const isClean = ((missing.missingViaCount ?? missing.missingCount) === 0) && (power.vias || []).length > 0;
      isCadPassed = isClean;
      feedback = isClean
        ? '✓ Power ring via continuity certified (0 missing vias)!'
        : `⚠️ Detected ${missing.missingViaCount ?? missing.missingCount} missing via connection(s) between straps and rings. Add feed vias in Studio.`;
      break;
    }

    case 'fp-18': {
      const pdn = solveResistivePDN(power, project.techProfile, project.constraints, macros);
      const isClean = pdn.valid && !pdn.hasOpenCircuit && pdn.worstDropMv <= 30;
      isCadPassed = isClean;
      feedback = isClean
        ? `✓ Static IR drop certified (${pdn.worstDropMv} mV <= 30 mV budget)!`
        : `⚠️ Static IR drop is ${pdn.worstDropMv !== null ? pdn.worstDropMv + ' mV' : 'open circuit'} (> 30 mV budget). Widen straps or add parallel feeds.`;
      break;
    }

    case 'fp-19': {
      let hasHaloViolation = false;
      for (let i = 0; i < macros.length; i++) {
        for (let j = i + 1; j < macros.length; j++) {
          const r = checkMacroOverlap(macros[i], macros[j]);
          if (r.overlaps || r.halosViolated) hasHaloViolation = true;
        }
      }
      isCadPassed = !hasHaloViolation && macros.length >= 2;
      feedback = isCadPassed
        ? '✓ Macro halo keepouts verified (all macro channels clear of halo overlap)!'
        : '⚠️ Macro halo keepout violation detected. Separate macros so routing channels satisfy the minimum halo clearance.';
      break;
    }

    case 'fp-20': {
      const isAligned = macros.length >= 2 && (macros[0].x === macros[1].x || macros[0].y === macros[1].y);
      isCadPassed = isAligned;
      feedback = isAligned
        ? '✓ Memory banks structured with rectilinear edge alignment!'
        : '⚠️ Align memory bank macros along a uniform edge (matching X coordinate or matching Y coordinate) for clean bus routing.';
      break;
    }

    case 'fp-21': {
      const hasRegions = (project.placementRegions || []).length > 0;
      isCadPassed = hasRegions;
      feedback = hasRegions
        ? '✓ Multi-voltage island placement region verified!'
        : '⚠️ Define a dedicated voltage island placement region in Studio.';
      break;
    }

    case 'fp-22': {
      const pll = macros.find((m) => m.id === 'ANALOG_PLL');
      const dsp = macros.find((m) => m.id === 'DIGITAL_DSP');
      const dist = pll && dsp ? Math.hypot(pll.x - dsp.x, pll.y - dsp.y) : 0;
      isCadPassed = dist >= 150;
      feedback = isCadPassed
        ? `✓ Analog PLL IP physically isolated from noisy digital DSP (${dist.toFixed(0)} µm separation >= 150 µm)!`
        : `⚠️ Separation between PLL and DSP is ${dist.toFixed(0)} µm (< 150 µm). Move the analog PLL to a quiet corner.`;
      break;
    }

    case 'fp-23': {
      const h0 = macros.find((m) => m.id === 'HOT_0');
      const h1 = macros.find((m) => m.id === 'HOT_1');
      const dist = h0 && h1 ? Math.hypot(h0.x - h1.x, h0.y - h1.y) : 0;
      isCadPassed = dist >= 150;
      feedback = isCadPassed
        ? `✓ High-power thermal hotspots distributed (${dist.toFixed(0)} µm separation >= 150 µm)!`
        : `⚠️ Thermal hotspots are separated by only ${dist.toFixed(0)} µm (< 150 µm). Move high-power macros apart to prevent localized thermal throttling.`;
      break;
    }

    case 'fp-24': {
      const macrosOk = macros.length >= 4;
      const cleanOk = signoff.clean && signoff.errorCount === 0;
      isCadPassed = macrosOk && cleanOk;
      feedback = isCadPassed
        ? `🏆 Module 5 Master Capstone certified: ${macros.length} macros, 0 DRC/PDN violations, utilization ${signoff.metrics.nominalUtilization}%, worst IR drop ${signoff.metrics.maxIRDropMv} mV.`
        : !macrosOk
        ? `⚠️ The capstone needs at least 4 hard macros (your project has ${macros.length}). Load Dual SRAM or Small SoC and repair it.`
        : `⚠️ Physical design violations remain (${signoff.violations.length} total). First: ${signoff.violations[0]?.rule} — ${signoff.violations[0]?.message}`;
      break;
    }

    case 'fp-25': {
      const m = macros[0];
      const isOriented = m && ['R180', 'R270', 'MY', 'FN', 'S', 'E'].includes(m.orientation);
      isCadPassed = isOriented;
      feedback = isOriented
        ? `✓ Macro orientation optimized (${m.orientation}) with pin channel facing internal standard cells!`
        : `⚠️ Macro orientation is '${m?.orientation || 'R0'}'. Rotate or flip the macro in Studio so its terminal pins face the internal core routing channel.`;
      break;
    }

    case 'fp-26': {
      const hasRegions = (project.placementRegions?.length > 0) || (project.blockages?.length > 0);
      isCadPassed = hasRegions;
      feedback = hasRegions
        ? '✓ Multi-voltage domain partition verified!'
        : '⚠️ Configure placement regions or blockages in Studio to partition voltage domains.';
      break;
    }

    case 'fp-27': {
      let overlaps = 0;
      for (let i = 0; i < macros.length; i++) {
        for (let j = i + 1; j < macros.length; j++) {
          if (checkMacroOverlap(macros[i], macros[j]).overlaps) overlaps++;
        }
      }
      isCadPassed = overlaps === 0 && macros.length >= 2;
      feedback = isCadPassed
        ? '✓ Complex macro overlap DRC violations resolved (0 overlapping macros)!'
        : `⚠️ Found ${overlaps} macro overlap DRC violation(s). Translate macros apart in Studio so they do not intersect.`;
      break;
    }

    case 'fp-28': {
      const edges = new Set(pins.map((p) => p.edge));
      isCadPassed = edges.size >= 4;
      feedback = isCadPassed
        ? '✓ I/O ring pads distributed across all four die edges (top, bottom, left, right)!'
        : `⚠️ Pads currently occupy ${edges.size}/4 edges. Distribute pads across all four die edges in Studio.`;
      break;
    }

    case 'fp-29': {
      const layers = new Set((power.straps || []).map((s) => s.layer));
      const hasVias = (power.vias || []).length > 0;
      isCadPassed = layers.has('M4') && layers.has('M5') && hasVias;
      feedback = isCadPassed
        ? '✓ Multi-layer PDN mesh synthesized with orthogonal M4/M5 straps and interlayer vias!'
        : '⚠️ PDN mesh requires orthogonal straps on both M4 and M5 interconnected by interlayer vias.';
      break;
    }

    case 'fp-30': {
      const pdn = solveResistivePDN(power, project.techProfile, project.constraints, macros);
      isCadPassed = pdn.valid && !pdn.hasOpenCircuit && pdn.worstDropMv <= 30;
      feedback = isCadPassed
        ? `✓ MNA resistive IR drop verified (${pdn.worstDropMv} mV <= 30 mV budget)!`
        : `⚠️ Worst IR drop is ${pdn.worstDropMv !== null ? pdn.worstDropMv + ' mV' : 'unbounded (open)'}. Add parallel straps or feed vias in Studio.`;
      break;
    }

    case 'fp-31': {
      const shortCheck = detectVDDVSSShort(power);
      isCadPassed = shortCheck.shorts.length === 0;
      feedback = isCadPassed
        ? '✓ Power distribution network free of VDD/VSS short circuits!'
        : `⚠️ Detected ${shortCheck.shorts.length} VDD/VSS short circuit(s): ${shortCheck.shorts[0]?.reason}. Remove the shorting via in Studio.`;
      break;
    }

    case 'fp-32': {
      isCadPassed = (project.candidates || []).length >= 2;
      feedback = isCadPassed
        ? `✓ Floorplan candidate trade-off exploration certified (${project.candidates.length} candidate snapshots recorded)!`
        : `⚠️ Found ${project.candidates?.length || 0}/2 candidate snapshots. Use the Candidate Comparison tool in Studio to snapshot at least two distinct layout revisions.`;
      break;
    }

    case 'fp-33': {
      const cong = computeCongestionMap(project);
      const ratio = cong?.maxRatio || 0;
      const hotspots = cong?.hotspots?.length || 0;
      const hasMinCore = (core?.width || 0) >= 200 && (core?.height || 0) >= 150;
      isCadPassed = hasMinCore && ratio < 0.80 && hotspots === 0;
      feedback = isCadPassed
        ? `✓ Routing channel congestion certified (Peak ratio: ${(ratio * 100).toFixed(1)}% < 80%, 0 hotspots)!`
        : !hasMinCore
        ? '⚠️ Core area is too small for routing channel analysis. Maintain reasonable core dimensions.'
        : `⚠️ Routing channel congestion detected (Peak ratio: ${(ratio * 100).toFixed(1)}%, ${hotspots} hotspot(s) >= 80%). Relocate bottleneck macros to clear channel obstruction.`;
      break;
    }

    case 'fp-34': {
      let exportSuccess = false;
      try {
        const lef = generateLEF(project);
        const def = generateDEF(project);
        exportSuccess = lef.includes('VERSION 5.8') && def.includes('VERSION 5.8') && macros.length >= 1;
      } catch {
        exportSuccess = false;
      }
      isCadPassed = exportSuccess;
      feedback = exportSuccess
        ? '✓ Educational LEF 5.8 & DEF 5.8 subset exports generated successfully!'
        : '⚠️ Place macros and configure boundary pins in Studio to generate valid LEF/DEF exports.';
      break;
    }

    case 'fp-35': {
      const util = computeUtilization(core.width * core.height, project.standardCellAreaUm2, macros, project.blockages, core);
      const isDrcClean = signoff.errorCount === 0;
      isCadPassed = isDrcClean && util.rawNominalUtilization <= 85;
      feedback = isCadPassed
        ? `✓ High-density layout legalized (Utilization: ${util.rawNominalUtilization}%, 0 DRC errors)!`
        : `⚠️ ${signoff.errorCount > 0 ? `DRC errors present (${signoff.errorCount} errors)` : `Utilization exceeds 85% (${util.rawNominalUtilization}%)`}. Legalize macros in Studio.`;
      break;
    }

    case 'fp-36': {
      // 12-point SoC Production Signoff Capstone
      const masterTypes = new Set(macros.map((m) => m.masterId || m.name));
      const hasMinMacros = macros.length >= 6;
      const hasMultiMasters = masterTypes.size >= 2;
      const hasRows = (project.placementRows || []).length > 0;
      const hasPins = pins.length >= 4;
      const pdn = solveResistivePDN(power, project.techProfile, project.constraints, macros);
      const pdnClean = pdn.valid && !pdn.hasOpenCircuit && pdn.worstDropMv <= 30;
      const cong = computeCongestionMap(project);
      const congClean = (cong?.maxRatio || 0) < 1.0;
      const noErrors = signoff.errorCount === 0 && signoff.clean;
      const hasCandidates = (project.candidates || []).length >= 2;

      isCadPassed = hasMinMacros && hasMultiMasters && hasRows && hasPins && pdnClean && congClean && noErrors && hasCandidates;
      feedback = isCadPassed
        ? `🏆 SoC Production Signoff Capstone Certified! 6+ macros placed across ${masterTypes.size} masters, MNA IR drop: ${pdn.worstDropMv} mV, Congestion: ${((cong?.maxRatio || 0) * 100).toFixed(1)}%, ${project.candidates.length} candidates compared, 0 DRC errors.`
        : `⚠️ Capstone requirements incomplete: Macros: ${macros.length}/6, Masters: ${masterTypes.size}/2, Placement rows: ${hasRows ? 'Yes' : 'Missing'}, Pins: ${pins.length}/4, Candidates: ${project.candidates?.length || 0}/2, DRC errors: ${signoff.errorCount}, PDN clean: ${pdnClean}, Congestion clean: ${congClean}.`;
      break;
    }

    default:
      isCadPassed = signoff.errorCount === 0;
      feedback = isCadPassed ? '✓ Floorplan verified clean!' : `⚠️ Found ${signoff.errorCount} violation(s).`;
      break;
  }

  // 5. Overall Validation: CAD Mastery AND Supplementary Quiz must both pass
  const passed = isCadPassed && isQuizOk;
  return {
    passed,
    score: passed ? xpReward : (isCadPassed ? Math.round(xpReward * 0.7) : (isQuizOk ? 25 : 0)),
    stars: passed ? 3 : (isCadPassed ? 2 : (isQuizOk ? 1 : 0)),
    feedback: isCadPassed
      ? (isQuizOk ? feedback : `${feedback} (⚠️ Complete the concept quiz to achieve 3-star certification).`)
      : feedback,
  };
}

/**
 * Returns a passing project that fully satisfies all physical/electrical requirements
 * for the given lesson assignment. Used for solution demonstrations and test verification.
 *
 * @param {string} lessonId
 * @returns {Object} Valid passing FloorplanProject
 */
export function getPassingAssignmentProject(lessonId) {
  if (lessonId === 'fp-24') {
    const p24 = JSON.parse(JSON.stringify(EXAMPLE_DUAL_SRAM_CONTROLLER));
    p24.assignmentId = 'fp-24';
    p24.powerNetwork.vias.push({ id: 'v2', layer1: 'M4', layer2: 'M5', x: 460, y: 180, net: 'VDD' });
    return p24;
  }

  const p = getAssignmentScenario(lessonId);

  switch (lessonId) {
    case 'fp-6':
      p.die = { x: 0, y: 0, width: 600, height: 600 };
      p.core = { x: 50, y: 50, width: 400, height: 400 }; // Aspect ratio 1.0, within die bounds
      break;

    case 'fp-7':
      p.die = { x: 0, y: 0, width: 2000, height: 1600 };
      p.core = { x: 100, y: 100, width: 1600, height: 1200 }; // Area 1,920,000 um2, util ~65% <= 80%
      break;

    case 'fp-8':
      p.core.x = 45;
      p.core.y = 45;
      p.core.width = 510;
      p.core.height = 410; // Margins: 45um on all sides
      break;

    case 'fp-9':
      p.pins = [
        { id: 'clk', net: 'clk', edge: 'top', coord: 100, layer: 'M3' },
        { id: 'rst_n', net: 'rst_n', edge: 'top', coord: 140, layer: 'M3' },
        { id: 'd0', net: 'd0', edge: 'bottom', coord: 100, layer: 'M3' },
        { id: 'd1', net: 'd1', edge: 'bottom', coord: 140, layer: 'M3' },
        { id: 'q0', net: 'q0', edge: 'left', coord: 100, layer: 'M3' },
        { id: 'q1', net: 'q1', edge: 'right', coord: 100, layer: 'M3' },
      ];
      break;

    case 'fp-10':
      p.pins[0].coord = 80; // Away from corner
      break;

    case 'fp-11':
      p.die.width = 600;
      p.die.height = 500;
      p.core.width = 500;
      p.core.height = 400; // 68k / 200k = 34% utilization <= 70%
      break;

    case 'fp-12':
      p.pins[1].coord = 120; // 20um spacing >= 10um
      break;

    case 'fp-13':
      p.pins[1].layer = 'M4';
      p.pins[3].layer = 'M4'; // Staggered layers
      break;

    case 'fp-14':
      p.pins[1].coord = 130; // >= 10um pitch
      break;

    case 'fp-15':
      p.pins[1].coord = 80; // Aligned with left pin
      break;

    case 'fp-16':
      p.powerNetwork = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 28, y: 28, width: 504, height: 404, lineWidth: 8 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 16, y: 16, width: 528, height: 428, lineWidth: 8 },
        ],
        straps: [],
        vias: [],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [],
      };
      break;

    case 'fp-17':
      p.powerNetwork.vias.push(
        { id: 'v1', layer1: 'M4', layer2: 'M5', x: 28, y: 150, net: 'VDD' },
        { id: 'v2', layer1: 'M4', layer2: 'M5', x: 532, y: 150, net: 'VDD' }
      );
      break;

    case 'fp-18':
      p.powerNetwork.straps[0].width = 6; // Widen strap
      p.powerNetwork.loads[0].currentMa = 15;
      p.powerNetwork.vias.push({ id: 'v4', layer1: 'M4', layer2: 'M5', x: 532, y: 180, net: 'VDD' });
      break;

    case 'fp-19':
      p.macros[1].x = 240; // Clearance >= 30um
      break;

    case 'fp-20':
      p.macros[1].x = 80; // Aligned X
      break;

    case 'fp-21':
      p.placementRegions = [{ id: 'reg_vdd_low', name: 'Low VDD Region', x: 60, y: 60, width: 160, height: 120 }];
      break;

    case 'fp-22':
      p.macros[0].x = 60;
      p.macros[0].y = 60;
      p.macros[1].x = 300;
      p.macros[1].y = 60; // Separation >= 150 um
      break;

    case 'fp-23':
      p.macros[0].x = 60;
      p.macros[0].y = 60;
      p.macros[1].x = 320;
      p.macros[1].y = 60; // Separation >= 150 um
      break;

    case 'fp-25':
      p.macros[0].orientation = 'R180';
      break;

    case 'fp-26':
      p.placementRegions = [{ id: 'reg_aon', name: 'AON Domain', x: 60, y: 60, width: 150, height: 120 }];
      break;

    case 'fp-27':
      p.macros[1].x = 240; // No overlap
      break;

    case 'fp-28':
      p.pins = [
        { id: 'p_top', net: 'p_top', edge: 'top', coord: 100, layer: 'M3' },
        { id: 'p_bot', net: 'p_bot', edge: 'bottom', coord: 100, layer: 'M3' },
        { id: 'p_left', net: 'p_left', edge: 'left', coord: 100, layer: 'M3' },
        { id: 'p_right', net: 'p_right', edge: 'right', coord: 100, layer: 'M3' },
      ];
      break;

    case 'fp-29':
      p.powerNetwork.straps.push(
        { id: 's_v5_1', net: 'VDD', layer: 'M5', x1: 200, y1: 28, x2: 200, y2: 432, width: 6 },
        { id: 's_v5_2', net: 'VSS', layer: 'M5', x1: 300, y1: 16, x2: 300, y2: 444, width: 6 }
      );
      p.powerNetwork.vias.push(
        { id: 'v1', layer1: 'M4', layer2: 'M5', x: 28, y: 150, net: 'VDD' },
        { id: 'v2', layer1: 'M4', layer2: 'M5', x: 532, y: 150, net: 'VDD' },
        { id: 'v3', layer1: 'M4', layer2: 'M5', x: 16, y: 220, net: 'VSS' },
        { id: 'v4', layer1: 'M4', layer2: 'M5', x: 544, y: 220, net: 'VSS' },
        { id: 'v5', layer1: 'M4', layer2: 'M5', x: 200, y: 150, net: 'VDD' },
        { id: 'v6', layer1: 'M4', layer2: 'M5', x: 300, y: 220, net: 'VSS' }
      );
      p.powerNetwork.loads = [
        { nodeId: 's_v4_1', net: 'VDD', currentMa: 15 },
        { nodeId: 's_v4_2', net: 'VSS', currentMa: 15 },
      ];
      break;

    case 'fp-30':
      p.powerNetwork.straps[0].width = 6;
      p.powerNetwork.vias.push({ id: 'v4', layer1: 'M4', layer2: 'M5', x: 532, y: 200, net: 'VDD' });
      break;

    case 'fp-31':
      p.powerNetwork.vias = [
        { id: 'v_fixed', layer1: 'M4', layer2: 'M5', x: 28, y: 200, net: 'VDD' },
      ];
      break;

    case 'fp-32':
      p.candidates.push({ id: 'cand_2', name: 'Optimized Channel', hpwl: 1100, worstDropMv: 18 });
      break;

    case 'fp-33':
      p.macros[0].x = 40;
      p.macros[0].y = 40;
      p.macros[1].x = 250;
      p.macros[1].y = 180;
      p.blockages = [];
      break;

    case 'fp-34':
      p.macros = [
        { id: 'SRAM_0', masterId: 'SRAM_32KB', x: 60, y: 60, width: 100, height: 80, orientation: 'R0', halo: 15 },
      ];
      p.pins = [
        { id: 'clk', net: 'clk', edge: 'top', coord: 100, layer: 'M3' },
      ];
      break;

    case 'fp-35':
      p.macros[1].x = 200;
      p.macros[1].y = 60;
      break;

    case 'fp-36':
      p.macros = [
        { id: 'CPU_CORE0', masterId: 'DSP_ACCEL', name: 'Core 0', x: 70, y: 70, width: 120, height: 90, orientation: 'R0', halo: 15 },
        { id: 'CPU_CORE1', masterId: 'DSP_ACCEL', name: 'Core 1', x: 70, y: 220, width: 120, height: 90, orientation: 'R0', halo: 15 },
        { id: 'ICACHE0', masterId: 'SRAM_64KB', name: 'ICache 0', x: 240, y: 70, width: 140, height: 90, orientation: 'R0', halo: 15 },
        { id: 'DCACHE0', masterId: 'SRAM_64KB', name: 'DCache 0', x: 240, y: 220, width: 140, height: 90, orientation: 'R0', halo: 15 },
        { id: 'ROM_BOOT', masterId: 'ROM_16KB', name: 'Boot ROM', x: 440, y: 70, width: 90, height: 70, orientation: 'R0', halo: 15 },
        { id: 'PERIPH_BRIDGE', masterId: 'ROM_16KB', name: 'APB Bridge', x: 440, y: 220, width: 90, height: 70, orientation: 'R0', halo: 15 },
      ];
      p.powerNetwork = {
        rings: [
          { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 35, y: 35, width: 650, height: 470, lineWidth: 10 },
          { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 20, y: 20, width: 680, height: 500, lineWidth: 10 },
        ],
        straps: [
          { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 35, y1: 160, x2: 685, y2: 160, width: 8 },
          { id: 'strap_vdd_2', net: 'VDD', layer: 'M4', x1: 35, y1: 360, x2: 685, y2: 360, width: 8 },
          { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 20, y1: 240, x2: 700, y2: 240, width: 8 },
          { id: 'strap_vss_2', net: 'VSS', layer: 'M4', x1: 20, y1: 440, x2: 700, y2: 440, width: 8 },
        ],
        vias: [
          { id: 'v1', layer1: 'M4', layer2: 'M5', x: 35, y: 160, net: 'VDD' },
          { id: 'v2', layer1: 'M4', layer2: 'M5', x: 685, y: 160, net: 'VDD' },
          { id: 'v3', layer1: 'M4', layer2: 'M5', x: 35, y: 360, net: 'VDD' },
          { id: 'v4', layer1: 'M4', layer2: 'M5', x: 685, y: 360, net: 'VDD' },
          { id: 'v5', layer1: 'M4', layer2: 'M5', x: 20, y: 240, net: 'VSS' },
          { id: 'v6', layer1: 'M4', layer2: 'M5', x: 700, y: 240, net: 'VSS' },
          { id: 'v7', layer1: 'M4', layer2: 'M5', x: 20, y: 440, net: 'VSS' },
          { id: 'v8', layer1: 'M4', layer2: 'M5', x: 700, y: 440, net: 'VSS' },
        ],
        sources: [{ nodeId: 'ring_vdd', net: 'VDD' }, { nodeId: 'ring_vss', net: 'VSS' }],
        loads: [
          { nodeId: 'strap_vdd_1', net: 'VDD', currentMa: 10 },
          { nodeId: 'strap_vdd_2', net: 'VDD', currentMa: 10 },
          { nodeId: 'strap_vss_1', net: 'VSS', currentMa: 10 },
          { nodeId: 'strap_vss_2', net: 'VSS', currentMa: 10 },
        ],
      };
      p.candidates = [
        { id: 'cand_1', name: 'Seed Arch', hpwl: 1800, worstDropMv: 24 },
        { id: 'cand_2', name: 'Optimized Dual Core', hpwl: 1400, worstDropMv: 18 },
      ];
      break;

    default:
      break;
  }

  return p;
}
