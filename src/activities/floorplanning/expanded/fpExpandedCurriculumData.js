import { evaluateGuidedAssignment } from './guidedAssignmentService.js';
/**
 * fpExpandedCurriculumData.js
 * ============================
 * Definitions, pedagogical narratives, parameters, and deterministic validators
 * for Floorplanning Kingdom 3.0 Lessons fp-6 through fp-36 across Modules 2 to 8.
 *
 * Uses genuine physical design mathematics from:
 * - floorplanGeometry.js (Core/Die, utilization, halo clearance, pin transforms)
 * - floorplanPDN.js (PDN mesh graph, missing vias, shorts, nodal resistive solver)
 * - floorplanCongestion.js (2D bin demand vs capacity, blockage derating, channel bottlenecks)
 * - floorplanCandidates.js (Pareto frontier, candidate delta comparisons)
 * - floorplanSignoff.js (Full diagnostic signoff rule deck)
 */

import {
  computeCoreArea,
  computeUtilization,
  checkMacroOverlap,
  computeHPWL,
  computePlacementRows,
  checkPinSpacing,
  computeAspectRatio,
} from '../../../engine/floorplanGeometry.js';
import {
  detectOpenConnections,
  detectMissingVias,
  computeIRDropEstimate,
} from '../../../engine/floorplanPDN.js';
import { computeCongestionMap } from '../../../engine/floorplanCongestion.js';
import { evaluateFloorplanSignoff } from '../../../engine/floorplanSignoff.js';
import { generateLEF, generateDEF } from '../../../engine/floorplanExport.js';
import { solveResistivePDN, detectVDDVSSShort } from '../../../engine/floorplanPDN.js';

export const EXPANDED_LESSONS = {
  // ─── MODULE 2: DIE & CORE ARCHITECTURE ───────────────────────────────────
  'fp-6': {
    id: 'fp-6',
    module: 2,
    moduleTitle: 'Module 2: Die & Core Architecture',
    title: 'Aspect Ratio & Core Shape Tradeoffs',
    description: 'Analyze rectangular vs square aspect ratios and wirelength distribution.',
    xpReward: 35,
    starThresholds: [12, 24, 35],
    duration: '~8 min',
    concept: `Die aspect ratio (AR = Height / Width) impacts global interconnect distribution.
    A square core (AR = 1.0) minimizes average Manhattan distance between random points.
    Rectangular cores (AR = 0.5 or 2.0) stretch horizontal or vertical tracks, increasing RC latency in the stretched axis by up to 25%.`,
    canvas: { dieWidth: 600, dieHeight: 400, coreWidth: 500, coreHeight: 300, margin: 50 },
    questions: [
      {
        field: "bestRatioQuiz",
        prompt: "Which core shape minimises the average Manhattan wirelength between randomly placed flip-flops, all else equal?",
        options: [
          { value: "ar-square", label: "Square core (AR = 1.0): the expected |Δx| + |Δy| between random points is smallest for a fixed area." },
          { value: "ar-extreme", label: "Extreme rectangle (AR = 4.0): wirelength does not depend on the core shape." },
          { value: "ar-wide", label: "Wide core (AR = 0.5): horizontal wires are always faster than vertical ones, so stretch X." },
        ],
      },
    ],
    validate: (inputs) => {
      const isArOk = Math.abs(Number(inputs.aspectRatio) - 0.6) <= 0.05; const isQuizOk = inputs.bestRatioQuiz === 'ar-square' && isArOk;
      return evaluateGuidedAssignment('fp-6', inputs, isQuizOk, 35);
    },
  },

  'fp-7': {
    id: 'fp-7',
    module: 2,
    moduleTitle: 'Module 2: Die & Core Architecture',
    title: 'Core Area Estimation from Gate Count',
    description: 'Calculate placeable core area from synthesized NAND2 gate equivalents.',
    xpReward: 35,
    starThresholds: [12, 24, 35],
    duration: '~10 min',
    concept: `In early physical planning, total standard cell area is estimated using Gate Equivalents (GE).
    For this exercise use a planning figure of 12.5 µm² per gate equivalent.
    For a 100,000 GE design at 70% target utilization:
    StdCell Area = 100,000 × 12.5 µm² = 1,250,000 µm².
    Required Core Area = StdCell Area / 0.70 = 1,785,714 µm².`,
    canvas: { dieWidth: 700, dieHeight: 550, coreWidth: 600, coreHeight: 450, margin: 50 },
    validate: (inputs) => {
      const isStdOk = Math.abs(Number(inputs.stdCellArea) - 1250000) <= 5000; const isCoreOk = Math.abs(Number(inputs.requiredCoreArea) - 1785714) <= 10000; const isQuizOk = isStdOk && isCoreOk;
      return evaluateGuidedAssignment('fp-7', inputs, isQuizOk, 35);
    },
  },

  'fp-8': {
    id: 'fp-8',
    module: 2,
    moduleTitle: 'Module 2: Die & Core Architecture',
    title: 'Placement Row Generation & Site Sizing',
    description: 'Synthesize standard cell placement rows with valid height and site pitch.',
    xpReward: 35,
    starThresholds: [12, 24, 35],
    duration: '~8 min',
    concept: `Standard cells must be placed in pre-defined horizontal rows.
    Row height is a multiple of the metal pitch (e.g. 2.72 µm in sky130).
    For a core height of 350 µm with row height 2.72 µm:
    Total full rows = floor(350 / 2.72) = 128 rows.`,
    canvas: { dieWidth: 600, dieHeight: 450, coreWidth: 500, coreHeight: 350, margin: 50 },
    questions: [
      {
        field: "abutmentQuiz",
        prompt: "Why must adjacent placement rows alternate orientation (N, FS, N, FS)?",
        options: [
          { value: "row-abutment-rails", label: "To share power and ground rails: VDD abuts VDD, VSS abuts VSS between adjacent rows." },
          { value: "row-abutment-optics", label: "To allow optical lithography lasers to cool down between scanning passes." },
          { value: "row-abutment-arbitrary", label: "It is an arbitrary legacy rule with no electrical purpose." },
        ],
      },
    ],
    validate: (inputs) => {
      const isCountOk = Number(inputs.rowCount) === 128 || Number(inputs.rowCount) === 129; const isQuizOk = inputs.abutmentQuiz === 'row-abutment-rails' && isCountOk;
      return evaluateGuidedAssignment('fp-8', inputs, isQuizOk, 35);
    },
  },

  'fp-9': {
    id: 'fp-9',
    module: 2,
    moduleTitle: 'Module 2: Die & Core Architecture',
    title: 'Placement Blockages & Keepout Zones',
    description: 'Configure hard vs soft placement blockages to protect sensitive analog blocks.',
    xpReward: 35,
    starThresholds: [12, 24, 35],
    duration: '~10 min',
    concept: `Placement blockages prevent standard cells from being placed in prohibited areas.
    Hard blockages: 100% density restriction (no standard cells or macros permitted).
    Soft blockages: allows limited cell density (e.g. up to 30%) for routing buffer insertion only.`,
    canvas: { dieWidth: 650, dieHeight: 500, coreWidth: 550, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "blockageTypeQuiz",
        prompt: "Under what condition should a physical design engineer apply a SOFT blockage instead of a HARD blockage?",
        options: [
          { value: "soft-for-buffers", label: "When standard logic cells must be excluded, but routing buffers and inverters need to cross the region." },
          { value: "soft-for-power", label: "When power rings are forbidden from crossing the die." },
          { value: "soft-for-analog", label: "To completely shield high-voltage analog transistors from all metal traces." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.blockageTypeQuiz === 'soft-for-buffers';
      return evaluateGuidedAssignment('fp-9', inputs, isQuizOk, 35);
    },
  },

  // ─── MODULE 3: MACRO ENGINEERING ─────────────────────────────────────────
  'fp-10': {
    id: 'fp-10',
    module: 3,
    moduleTitle: 'Module 3: Macro Engineering',
    title: 'Macro Orientation & Symmetry Studio',
    description: 'Rotate and mirror hard macros to point pins towards the core center.',
    xpReward: 40,
    starThresholds: [15, 28, 40],
    duration: '~10 min',
    concept: `Hard macros have pre-routed internal geometry and fixed pin locations along specific edges.
    Flipping (MX, MY) or rotating (R90, R180, R270) aligns pins with destination buses.
    Pointing pins towards the interior routing channel reduces wirelength by up to 40%.`,
    canvas: { dieWidth: 600, dieHeight: 450, coreWidth: 500, coreHeight: 350, margin: 50 },
    questions: [
      {
        field: "pinOrientationQuiz",
        prompt: "If an SRAM placed in the top-left corner has pins along its right edge, which orientation is preferred?",
        options: [
          { value: "orient-r0-inward", label: "R0 (0°): keeps pins on the right edge facing the core center and memory controller." },
          { value: "orient-my-outward", label: "MY: flips pins to face the outer die boundary where no logic exists." },
          { value: "orient-r180-back", label: "R180: flips pins upside down towards the left boundary wall." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.pinOrientationQuiz === 'orient-r0-inward';
      return evaluateGuidedAssignment('fp-10', inputs, isQuizOk, 40);
    },
  },

  'fp-11': {
    id: 'fp-11',
    module: 3,
    moduleTitle: 'Module 3: Macro Engineering',
    title: 'Macro Halos & Channel Clearance',
    description: 'Enforce keepout halo clearances to prevent standard cell crowding and channel congestion.',
    xpReward: 40,
    starThresholds: [15, 28, 40],
    duration: '~10 min',
    concept: `Hard macro halos define keepout regions where standard cells cannot be placed.
    When two macros sit adjacent, their required minimum separation equals the sum of both halos:
    Separation = Halo_A + Halo_B.
    If Macro 1 has halo 15 µm and Macro 2 has halo 20 µm:
    Required separation = 15 + 20 = 35 µm.`,
    canvas: { dieWidth: 650, dieHeight: 450, coreWidth: 550, coreHeight: 350, margin: 50 },
    questions: [
      {
        field: "corridorQuiz",
        prompt: "What happens if the routing corridor between two large SRAM macros is too narrow (< 30 µm)?",
        options: [
          { value: "corridor-congestion", label: "Severe routing congestion: routing tracks become exhausted, causing DRC shorts and timing closure failure." },
          { value: "corridor-power-surge", label: "Voltage spikes jump across the dielectric air gap between macros." },
          { value: "corridor-faster", label: "Signals accelerate because tracks are compressed closer together." },
        ],
      },
    ],
    validate: (inputs) => {
      const isSepOk = Number(inputs.requiredSeparation) === 35; const isQuizOk = inputs.corridorQuiz === 'corridor-congestion' && isSepOk;
      return evaluateGuidedAssignment('fp-11', inputs, isQuizOk, 40);
    },
  },

  'fp-12': {
    id: 'fp-12',
    module: 3,
    moduleTitle: 'Module 3: Macro Engineering',
    title: 'Fixed Macros & Placement Regions',
    description: 'Lock critical analog macros into dedicated power-isolated corners.',
    xpReward: 40,
    starThresholds: [15, 28, 40],
    duration: '~10 min',
    concept: `Analog blocks (PLLs, bandgaps, ADCs) require dedicated isolation.
    Physical designers mark these blocks as 'FIXED' so automated placers cannot perturb them.
    Placing noisy digital logic directly over PLL substrate regions induces jitter.`,
    canvas: { dieWidth: 600, dieHeight: 450, coreWidth: 500, coreHeight: 350, margin: 50 },
    questions: [
      {
        field: "fixedMacroQuiz",
        prompt: "Why must sensitive analog macros (e.g. PLL, SerDes) be fixed at corners or dedicated peripheral regions?",
        options: [
          { value: "fixed-noise-isolation", label: "To isolate them from substrate noise generated by fast-switching digital logic." },
          { value: "fixed-reduce-die-size", label: "To shrink the die area by eliminating standard cell rows under the analog block." },
          { value: "fixed-clock-speed", label: "Corner placement inherently multiplies the clock frequency by 4x." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.fixedMacroQuiz === 'fixed-noise-isolation';
      return evaluateGuidedAssignment('fp-12', inputs, isQuizOk, 40);
    },
  },

  'fp-13': {
    id: 'fp-13',
    module: 3,
    moduleTitle: 'Module 3: Macro Engineering',
    title: 'Connectivity-Aware Macro Planning',
    description: 'Analyze net flylines and arrange multi-macro layouts to minimize Half-Perimeter Wirelength (HPWL).',
    xpReward: 45,
    starThresholds: [18, 32, 45],
    duration: '~12 min',
    concept: `Macro placement dictates global wirelength.
    Half-Perimeter Wirelength (HPWL) models the bounding box of connected pins:
    HPWL = (X_max - X_min) + (Y_max - Y_min).
    Placing tightly-coupled macros adjacent reduces bus delay and dynamic interconnect power.`,
    canvas: { dieWidth: 700, dieHeight: 500, coreWidth: 600, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "hpwlFlylineQuiz",
        prompt: "When two 64-bit buses connect CPU to ROM and CPU to SRAM, what placement minimizes HPWL?",
        options: [
          { value: "hpwl-central-cluster", label: "Place the CPU core centrally between the ROM and SRAM macros." },
          { value: "hpwl-opposite-corners", label: "Place ROM and SRAM in opposing corners with the CPU far away on the perimeter." },
          { value: "hpwl-random", label: "Global wirelength is independent of macro placement in modern technology nodes." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.hpwlFlylineQuiz === 'hpwl-central-cluster';
      return evaluateGuidedAssignment('fp-13', inputs, isQuizOk, 45);
    },
  },

  // ─── MODULE 4: I/O & POWER FUNDAMENTALS ─────────────────────────────────
  'fp-14': {
    id: 'fp-14',
    module: 4,
    moduleTitle: 'Module 4: I/O & Power Fundamentals',
    title: 'Advanced I/O Pin Legalization',
    description: 'Enforce minimum pin pitch rules to avoid short circuits and satisfy packaging pad spacing.',
    xpReward: 40,
    starThresholds: [15, 28, 40],
    duration: '~10 min',
    concept: `I/O pins positioned on the core boundary must satisfy the minimum pin pitch rule.
    Minimum pitch (10 µm in our reference profile) prevents adjacent metal traces from shorting.
    Two pins on the top edge with coordinates x1 and x2 require: |x2 - x1| >= 10 µm.`,
    canvas: { dieWidth: 600, dieHeight: 400, coreWidth: 500, coreHeight: 300, margin: 50 },
    questions: [
      {
        field: "pinPitchQuiz",
        prompt: "Why does the technology library enforce a minimum pitch (e.g. >= 10 µm) between adjacent I/O pins?",
        options: [
          { value: "prevent-shorts", label: "To prevent metal bridging shorts and allow sufficient space for bond wire routing." },
          { value: "boost-voltage", label: "To increase signal transmission voltage across pad cells." },
          { value: "reduce-static-leakage", label: "Pins closer than 10 µm generate thermal runaway leakage." },
        ],
      },
    ],
    validate: (inputs) => {
      const p1 = Number(inputs.pinCoord1); const p2 = Number(inputs.pinCoord2); const isPitchOk = Math.abs(p2 - p1) >= 10 && p1 >= 0 && p2 >= 0 && p1 <= 500 && p2 <= 500; const isQuizOk = inputs.pinPitchQuiz === 'prevent-shorts' && isPitchOk;
      return evaluateGuidedAssignment('fp-14', inputs, isQuizOk, 40);
    },
  },

  'fp-15': {
    id: 'fp-15',
    module: 4,
    moduleTitle: 'Module 4: I/O & Power Fundamentals',
    title: 'Pin & Macro Alignment Optimization',
    description: 'Align peripheral I/O pins directly facing corresponding macro memory buses.',
    xpReward: 40,
    starThresholds: [15, 28, 40],
    duration: '~10 min',
    concept: `Peripheral I/O pin alignment minimizes route jogs.
    Placing address/data pins on the edge directly parallel to the macro's internal bus
    allows straight routes without consuming horizontal-layer tracks.`,
    canvas: { dieWidth: 600, dieHeight: 450, coreWidth: 500, coreHeight: 350, margin: 50 },
    questions: [
      {
        field: "pinAlignmentQuiz",
        prompt: "What is the primary benefit of aligning I/O pads collinear with their connected macro inputs?",
        options: [
          { value: "align-straight-tracks", label: "Eliminates routing bends, reducing track consumption and signal propagation delay." },
          { value: "align-invert-clock", label: "Allows clock trees to operate without power straps." },
          { value: "align-zero-capacitance", label: "Completely eliminates parasitic wire capacitance to 0 fF." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.pinAlignmentQuiz === 'align-straight-tracks';
      return evaluateGuidedAssignment('fp-15', inputs, isQuizOk, 40);
    },
  },

  'fp-16': {
    id: 'fp-16',
    module: 4,
    moduleTitle: 'Module 4: I/O & Power Fundamentals',
    title: 'VDD & VSS Power Ring Synthesis',
    description: 'Construct concentric low-impedance power rings surrounding the active core.',
    xpReward: 45,
    starThresholds: [18, 32, 45],
    duration: '~12 min',
    concept: `Power rings encircle the core boundary to deliver uniform VDD and VSS current.
    Rings are built on thick top metals (e.g. M4 / M5) with wide traces (e.g. 6 to 10 µm)
    to minimize sheet resistance (Rs = 0.05 Ω/sq) and handle multi-ampere switching currents.`,
    canvas: { dieWidth: 650, dieHeight: 500, coreWidth: 550, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "powerRingQuiz",
        prompt: "Why are power rings always routed on the highest available metal layers (M4/M5) rather than M1?",
        options: [
          { value: "thick-metal-low-r", label: "Top metals are thicker and have significantly lower sheet resistance, minimizing IR drop and electromigration." },
          { value: "top-metal-colored", label: "Top metals have bright visible colors that make layout inspection easier." },
          { value: "m1-power-forbidden", label: "Silicon foundries physically forbid routing DC currents on lower metals." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.powerRingQuiz === 'thick-metal-low-r';
      return evaluateGuidedAssignment('fp-16', inputs, isQuizOk, 45);
    },
  },

  'fp-17': {
    id: 'fp-17',
    module: 4,
    moduleTitle: 'Module 4: I/O & Power Fundamentals',
    title: 'Strap & Interlayer Via Connectivity Lab',
    description: 'Connect vertical and horizontal power straps using interlayer vias to eliminate open nets.',
    xpReward: 45,
    starThresholds: [18, 32, 45],
    duration: '~12 min',
    concept: `Power distribution requires a connected 2D grid.
    Horizontal straps (M4) and vertical straps (M5) cross at multiple points.
    Without an interlayer via at each intersection, the straps remain electrically disconnected (Open Net).`,
    canvas: { dieWidth: 600, dieHeight: 450, coreWidth: 500, coreHeight: 350, margin: 50 },
    questions: [
      {
        field: "viaContinuityQuiz",
        prompt: "If a horizontal M4 VDD strap crosses a vertical M5 VDD strap without a via, what electrical fault occurs?",
        options: [
          { value: "open-net-floating", label: "Open Circuit / Floating Net: current cannot flow between M4 and M5, causing severe voltage droop." },
          { value: "short-circuit", label: "A short circuit occurs because both traces carry VDD." },
          { value: "inductive-surge", label: "Inductance immediately explodes the silicon oxide layer." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.viaContinuityQuiz === 'open-net-floating';
      return evaluateGuidedAssignment('fp-17', inputs, isQuizOk, 45);
    },
  },

  'fp-18': {
    id: 'fp-18',
    module: 4,
    moduleTitle: 'Module 4: I/O & Power Fundamentals',
    title: 'Static IR-Drop & Power Rail Sizing',
    description: 'Calculate resistive voltage drop across power straps and verify the 30 mV budget.',
    xpReward: 45,
    starThresholds: [18, 32, 45],
    duration: '~15 min',
    concept: `Every conductor has finite sheet resistance. When current (I) flows through a power strap with resistance (R),
    the voltage drops: ΔV = I × R.
    For a strap carrying 20 mA through a 1.5 Ω path:
    ΔV = 0.020 A × 1.5 Ω = 0.030 V = 30 mV.
    If the IR drop exceeds 30 mV (in a 1.8V chip), standard cell propagation delay increases by up to 15%.`,
    canvas: { dieWidth: 650, dieHeight: 500, coreWidth: 550, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "irFixQuiz",
        prompt: "If the simulated IR drop at the core center exceeds the 30 mV budget, what is the best floorplan fix?",
        options: [
          { value: "add-more-straps", label: "Increase strap width or add parallel power straps to reduce effective grid resistance." },
          { value: "slow-down-clock", label: "Lower the clock frequency to 0 Hz." },
          { value: "remove-vias", label: "Remove vias to prevent electrons from entering the core." },
        ],
      },
    ],
    validate: (inputs) => {
      const isDropOk = Math.abs(Number(inputs.calculatedDrop) - 30) <= 2; const isQuizOk = inputs.irFixQuiz === 'add-more-straps' && isDropOk;
      return evaluateGuidedAssignment('fp-18', inputs, isQuizOk, 45);
    },
  },

  // ─── MODULE 5: ANALYSIS & OPTIMIZATION ───────────────────────────────────
  'fp-19': {
    id: 'fp-19',
    module: 5,
    moduleTitle: 'Module 5: Analysis & Optimization',
    title: 'Early Routability & Congestion Heatmap',
    description: 'Interpret 2D bin demand vs capacity ratios to locate routing bottlenecks.',
    xpReward: 50,
    starThresholds: [20, 38, 50],
    duration: '~12 min',
    concept: `Early congestion estimation divides the core into a 2D grid of routing bins.
    Each bin has Track Capacity (wires that fit) and Track Demand (wires requested by placed cells/pins).
    A bin with ratio Demand / Capacity > 0.90 is a Congestion Hotspot.
    Ratios >= 1.0 indicate critical routing overflow and will fail detailed routing.`,
    canvas: { dieWidth: 600, dieHeight: 450, coreWidth: 500, coreHeight: 350, margin: 50 },
    questions: [
      {
        field: "congestionThresholdQuiz",
        prompt: "What does a routing bin demand/capacity ratio of 1.15 indicate?",
        options: [
          { value: "overflow-unroutable", label: "Critical overflow: track demand exceeds physical metal capacity by 15%, causing unresolvable routing shorts." },
          { value: "optimal-utilization", label: "Optimal utilization: the router is operating at 115% efficiency." },
          { value: "no-impact", label: "Congestion maps are purely decorative and have no relationship to detailed routing." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.congestionThresholdQuiz === 'overflow-unroutable';
      return evaluateGuidedAssignment('fp-19', inputs, isQuizOk, 50);
    },
  },

  'fp-20': {
    id: 'fp-20',
    module: 5,
    moduleTitle: 'Module 5: Analysis & Optimization',
    title: 'Physical Rule Debugging & DRC Remediation',
    description: 'Diagnose and remediate multiple overlapping macros, out-of-core bounds, and halo conflicts.',
    xpReward: 50,
    starThresholds: [20, 38, 50],
    duration: '~15 min',
    concept: `Physical design sign-off enforces zero Design Rule Check (DRC) violations:
    1. Macros must be completely inside the core boundary.
    2. Macros must not overlap.
    3. Keepout halos must not intersect adjacent macros or halos.
    4. I/O pins must respect minimum pitch spacing.`,
    canvas: { dieWidth: 650, dieHeight: 500, coreWidth: 550, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "drcPriorityQuiz",
        prompt: "If a floorplan has both a Macro Overlap error and a High Congestion warning, which must be resolved first?",
        options: [
          { value: "drc-hard-blocker", label: "Macro Overlap is a hard DRC error that blocks physical mask manufacturing; congestion is a secondary optimization warning." },
          { value: "congestion-first", label: "Congestion first, because DRC errors automatically resolve after detailed routing." },
          { value: "ignore-both", label: "Neither matters until post-silicon packaging." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.drcPriorityQuiz === 'drc-hard-blocker';
      return evaluateGuidedAssignment('fp-20', inputs, isQuizOk, 50);
    },
  },

  'fp-21': {
    id: 'fp-21',
    module: 5,
    moduleTitle: 'Module 5: Analysis & Optimization',
    title: 'PPA Tradeoffs: Area, Wirelength & Power',
    description: 'Balance target utilization against routing congestion and interconnect RC delay.',
    xpReward: 50,
    starThresholds: [20, 38, 50],
    duration: '~12 min',
    concept: `Physical design is a continuous optimization trade-off between Power, Performance, and Area (PPA).
    Higher utilization (>85%) shrinks die cost, but increases wire congestion and cross-talk.
    Lower utilization (<50%) eases routing, but expands wire lengths and silicon manufacturing cost.
    Commercial ASICs target 65% to 75% nominal utilization.`,
    canvas: { dieWidth: 600, dieHeight: 450, coreWidth: 500, coreHeight: 350, margin: 50 },
    questions: [
      {
        field: "ppaQuiz",
        prompt: "What is the recommended target core utilization for a complex digital ASIC before clock tree synthesis?",
        options: [
          { value: "ppa-balance-65-75", label: "65% to 75%: provides optimal balance between die area and routability margin for buffers." },
          { value: "ppa-max-95", label: "95% or more, to minimise area." },
          { value: "ppa-min-30", label: "About 30%, so routing is never a concern." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.ppaQuiz === 'ppa-balance-65-75';
      return evaluateGuidedAssignment('fp-21', inputs, isQuizOk, 50);
    },
  },

  'fp-22': {
    id: 'fp-22',
    module: 5,
    moduleTitle: 'Module 5: Analysis & Optimization',
    title: 'Comparative Floorplan Candidate Evaluation',
    description: 'Score two competing candidate floorplans against HPWL, utilization, and IR-drop metrics.',
    xpReward: 50,
    starThresholds: [20, 38, 50],
    duration: '~15 min',
    concept: `Engineers generate multiple candidate floorplans (e.g. corner placement vs center placement).
    Candidates are evaluated across a weighted score matrix:
    Score = w1*(1/HPWL) + w2*(1/IR_Drop) + w3*(1/Congestion).
    Corner macro placement consistently beats center placement by preserving contiguous placeable area.`,
    canvas: { dieWidth: 600, dieHeight: 500, coreWidth: 500, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "candidateChoice",
        prompt: "Candidate A puts four SRAMs against the core corners/edges; candidate B places them in the centre. Which usually wins, and why?",
        options: [
          { value: "candidate-corner-placement", label: "A — edge/corner macros leave one large contiguous region for standard cells and keep channels to a minimum." },
          { value: "candidate-center-placement", label: "B — central macros are equidistant from everything, so they never cause congestion." },
          { value: "candidate-equal", label: "They are always equivalent; only utilisation matters." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.candidateChoice === 'candidate-corner-placement';
      return evaluateGuidedAssignment('fp-22', inputs, isQuizOk, 50);
    },
  },

  'fp-23': {
    id: 'fp-23',
    module: 5,
    moduleTitle: 'Module 5: Analysis, Optimization & First Master Project',
    title: 'Floorplan Signoff & Quality Metrics',
    description: 'Execute complete sign-off verification report covering DRC, PDN continuity, and routability.',
    xpReward: 55,
    starThresholds: [22, 42, 55],
    duration: '~15 min',
    concept: `Final sign-off requires passing all three physical gates:
    1. DRC Clearance (0 violations)
    2. Power Grid Continuity (0 open VDD/VSS segments, 0 missing vias)
    3. Routability Margin (Max routing bin demand < 0.90).`,
    canvas: { dieWidth: 600, dieHeight: 500, coreWidth: 500, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "signoffChecklist",
        prompt: "What must hold before the floorplan is signed off?",
        options: [
          { value: "all-three-gates-pass", label: "All three gates together: zero DRC violations, a continuous power grid with no missing vias, and routability margin." },
          { value: "drc-only", label: "DRC clean is enough; power and routability are checked after routing." },
          { value: "pdn-only", label: "A connected power grid is enough." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.signoffChecklist === 'all-three-gates-pass';
      return evaluateGuidedAssignment('fp-23', inputs, isQuizOk, 55);
    },
  },

  'fp-24': {
    id: 'fp-24',
    module: 5,
    moduleTitle: 'Module 5: Analysis, Optimization & First Master Project',
    title: 'Full Chip Floorplan Master Capstone',
    description: 'Repair and sign off a 4-macro floorplan in the Studio; graded on your saved design, not on checkboxes.',
    xpReward: 60,
    starThresholds: [24, 45, 60],
    duration: '~20 min',
    concept: `The Grand Capstone is graded on your real Floorplan Studio project, using the same rule deck as the Studio's Diagnostics tab.
    Start from a 4-macro benchmark (Dual SRAM Controller or Small SoC Subsystem), find its defect, repair it, and keep every macro legal:
    no overlaps or halo conflicts, macros inside the core, I/O pitch respected, VDD/VSS continuous with every strap-to-ring via present, no shorts, and utilization within budget.
    Save the project in the Studio, then verify here.`,
    canvas: { dieWidth: 700, dieHeight: 550, coreWidth: 600, coreHeight: 450, margin: 50 },
    requiresStudioProject: true,
    minMacros: 4,
    validate: (inputs) => {
      const isQuizOk = true;
      return evaluateGuidedAssignment('fp-24', inputs, isQuizOk, 60);
    },
  },

  // ─── MODULE 6: OPEN-ENDED DESIGN AUTHORING ───────────────────────────────
  'fp-25': {
    id: 'fp-25',
    module: 6,
    moduleTitle: 'Module 6: Open-Ended Design Authoring',
    title: 'Macro Library and Instance Manager',
    description: 'Instantiate and place macros from the Master Library, verifying pin transformations.',
    xpReward: 45,
    starThresholds: [18, 30, 45],
    duration: '~10 min',
    concept: `Modern ASICs integrate intellectual property (IP) blocks from standard master libraries.
    When a macro master is instantiated and oriented (R0, R90, R180, R270, MX, MY), its internal pin coordinates
    transform deterministically relative to the macro instance boundary.`,
    canvas: { dieWidth: 650, dieHeight: 500, coreWidth: 550, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "macroMasterQuiz",
        prompt: "When a macro with asymmetric pin offsets is rotated from R0 to R90, how are the pin coordinates transformed?",
        options: [
          { value: "r90-rotate-transform", label: "x' = y, y' = Width - x (90° counter-clockwise rotation about origin with boundary normalization)." },
          { value: "r90-no-change", label: "Pin coordinates remain identical because pins are fixed to global world coordinates." },
          { value: "r90-invert-only", label: "Only the polarity of the pins is inverted; physical locations are unchanged." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.macroMasterQuiz === 'r90-rotate-transform';
      return evaluateGuidedAssignment('fp-25', inputs, isQuizOk, 45);
    },
  },

  'fp-26': {
    id: 'fp-26',
    module: 6,
    moduleTitle: 'Module 6: Open-Ended Design Authoring',
    title: 'Multi-Region & Hierarchical Floorplanning',
    description: 'Define placement regions and partition functional blocks across floorplan domains.',
    xpReward: 45,
    starThresholds: [18, 30, 45],
    duration: '~10 min',
    concept: `Hierarchical physical design assigns logic modules into dedicated physical regions.
    Placement regions keep high-speed datapath cells clustered together to minimize bus latency and clock skew.`,
    canvas: { dieWidth: 650, dieHeight: 500, coreWidth: 550, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "placementRegionQuiz",
        prompt: "What is the primary difference between a hard FENCE placement region and a soft GUIDE region?",
        options: [
          { value: "fence-exclusive-guide-preferred", label: "A FENCE strictly forbids other logic inside and keeps its cells within bounds; a GUIDE is only an attractive preference." },
          { value: "guide-prohibits-cells", label: "A GUIDE completely shuts down power to standard cells placed within its boundary." },
          { value: "both-identical", label: "FENCE and GUIDE are identical synonyms in all modern physical design tool flows." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.placementRegionQuiz === 'fence-exclusive-guide-preferred';
      return evaluateGuidedAssignment('fp-26', inputs, isQuizOk, 45);
    },
  },

  'fp-27': {
    id: 'fp-27',
    module: 6,
    moduleTitle: 'Module 6: Open-Ended Design Authoring',
    title: 'Assisted Macro Placement & Legalization',
    description: 'Analyze automated macro legalizer algorithms and resolve keepout violations.',
    xpReward: 45,
    starThresholds: [18, 30, 45],
    duration: '~12 min',
    concept: `Automated Macro Legalization computes minimum-displacement translations to resolve
    overlapping macros and halo violations while snapping instances to standard manufacturing sites.`,
    canvas: { dieWidth: 650, dieHeight: 500, coreWidth: 550, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "legalizationQuiz",
        prompt: "What objective does an assisted macro legalization algorithm minimize while clearing halo overlaps?",
        options: [
          { value: "min-displacement-cost", label: "Total macro displacement from initial seed locations while strictly satisfying core bounds and halo clearances." },
          { value: "max-wirelength", label: "Maximizing the distance between macros to guarantee that zero routing tracks are shared." },
          { value: "random-jitter", label: "Applying purely random coordinates across the die until no collisions are detected." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.legalizationQuiz === 'min-displacement-cost';
      return evaluateGuidedAssignment('fp-27', inputs, isQuizOk, 45);
    },
  },

  'fp-28': {
    id: 'fp-28',
    module: 6,
    moduleTitle: 'Module 6: Open-Ended Design Authoring',
    title: 'Constraint-Driven Pin Assignment',
    description: 'Enforce pin pitch rules and distribute bus signals along die boundaries.',
    xpReward: 45,
    starThresholds: [18, 30, 45],
    duration: '~10 min',
    concept: `Automated pin planning algorithms distribute I/O pins evenly across allowable die edges,
    satisfying minimum pitch constraints (>= 10 µm) and respecting corner keepout zones.`,
    canvas: { dieWidth: 600, dieHeight: 450, coreWidth: 500, coreHeight: 350, margin: 50 },
    questions: [
      {
        field: "pinConstraintQuiz",
        prompt: "Why must I/O pins observe corner keepout margins (e.g. at least 15 µm away from die corners)?",
        options: [
          { value: "corner-keepout-power-pad", label: "Die corners host power ring corners, corner pad cells, and seal rings, creating severe routing congestion." },
          { value: "corner-pins-fall-off", label: "Pins placed at die corners physically fall off the silicon wafer during dicing." },
          { value: "corner-pins-invert-voltage", label: "Corner geometry inverts the signal voltage from 1.8V to -1.8V due to edge refraction." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.pinConstraintQuiz === 'corner-keepout-power-pad';
      return evaluateGuidedAssignment('fp-28', inputs, isQuizOk, 45);
    },
  },

  // ─── MODULE 7: ADVANCED POWER & OPTIMIZATION ─────────────────────────────
  'fp-29': {
    id: 'fp-29',
    module: 7,
    moduleTitle: 'Module 7: Advanced Power & Optimization',
    title: 'Automated PDN Mesh Construction',
    description: 'Generate high-density power straps across upper metal layers and calculate pitch requirements.',
    xpReward: 50,
    starThresholds: [20, 35, 50],
    duration: '~12 min',
    concept: `An automated PDN grid generator synthesizes orthogonal straps across M4 and M5.
    At every intersection between VDD M4 and VDD M5, a via array is placed to construct a low-impedance mesh.`,
    canvas: { dieWidth: 700, dieHeight: 500, coreWidth: 600, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "pdnMeshQuiz",
        prompt: "Why do high-performance ASICs alternate power strap metal directions (e.g., M4 horizontal, M5 vertical)?",
        options: [
          { value: "orthogonal-mesh-grid", label: "Orthogonal layers form a rigid 2D mesh grid with vias at every crossing, minimizing resistance in both X and Y." },
          { value: "parallel-only-faster", label: "Straps must only run horizontally so signals can flow vertically without any resistance." },
          { value: "alternating-layers-unnecessary", label: "Modern foundries prohibit interlayer vias for power; everything is routed on M1." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.pdnMeshQuiz === 'orthogonal-mesh-grid';
      return evaluateGuidedAssignment('fp-29', inputs, isQuizOk, 50);
    },
  },

  'fp-30': {
    id: 'fp-30',
    module: 7,
    moduleTitle: 'Module 7: Advanced Power & Optimization',
    title: 'Multi-Load Resistive PDN Analysis',
    description: 'Model localized current sinks and solve nodal static IR drop across the power network.',
    xpReward: 50,
    starThresholds: [20, 35, 50],
    duration: '~12 min',
    concept: `Active blocks draw distinct current profiles. In a multi-load network,
    IR drop at node j equals the nodal voltage solve: G * V = I.
    For a localized 40 mA load through an effective grid resistance of 0.50 Ω:
    ΔV = I × R = 0.040 A × 0.50 Ω = 0.020 V = 20 mV.`,
    canvas: { dieWidth: 650, dieHeight: 500, coreWidth: 550, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "irNodalQuiz",
        prompt: "If a cluster of DSP macros draws 40 mA through an effective power strap network resistance of 0.50 Ω, what is the static IR drop?",
        options: [
          { value: "ir-drop-20mv", label: "20 mV (ΔV = I × R = 0.040 A × 0.50 Ω = 0.020 V = 20 mV)." },
          { value: "ir-drop-80mv", label: "80 mV (ΔV = 40 / 0.50 = 80 mV)." },
          { value: "ir-drop-2mv", label: "2 mV (Static resistance does not apply to active digital switching currents)." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.irNodalQuiz === 'ir-drop-20mv';
      return evaluateGuidedAssignment('fp-30', inputs, isQuizOk, 50);
    },
  },

  'fp-31': {
    id: 'fp-31',
    module: 7,
    moduleTitle: 'Module 7: Advanced Power & Optimization',
    title: 'PDN Failure Investigation',
    description: 'Locate and diagnose floating straps, missing vias, and electrical shorts in broken networks.',
    xpReward: 50,
    starThresholds: [20, 35, 50],
    duration: '~15 min',
    concept: `PDN defect diagnosis isolates electrical anomalies:
    1. Floating straps (disconnected from outer supply rings).
    2. Missing interlayer vias (straps cross without electrical contact).
    3. Direct shorts (VDD and VSS metals overlapping or touching).`,
    canvas: { dieWidth: 700, dieHeight: 550, coreWidth: 600, coreHeight: 450, margin: 50 },
    questions: [
      {
        field: "pdnFaultQuiz",
        prompt: "What severe hazard occurs when a metal via inadvertently bridges a VDD strap directly to an overlapping VSS ring?",
        options: [
          { value: "electrical-short-catastrophic", label: "Electrical short circuit: zero DC resistance between power and ground, causing supply collapse and silicon burn-out." },
          { value: "electrical-short-harmless", label: "The short circuit acts as an ideal zero-resistance bypass capacitor, improving stability." },
          { value: "floating-net-only", label: "The simulator simply ignores the VSS ring and routes everything through ground." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.pdnFaultQuiz === 'electrical-short-catastrophic';
      return evaluateGuidedAssignment('fp-31', inputs, isQuizOk, 50);
    },
  },

  'fp-32': {
    id: 'fp-32',
    module: 7,
    moduleTitle: 'Module 7: Advanced Power & Optimization',
    title: 'Multiobjective Optimization & Pareto Frontier',
    description: 'Explore PPA trade-offs and identify non-dominated Pareto-optimal floorplan candidates.',
    xpReward: 50,
    starThresholds: [20, 35, 50],
    duration: '~15 min',
    concept: `Multiobjective design exploration balances Wirelength, Area, and Voltage Drop.
    A candidate design is on the Pareto Frontier if no other design is strictly superior in all metrics simultaneously.`,
    canvas: { dieWidth: 650, dieHeight: 500, coreWidth: 550, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "paretoQuiz",
        prompt: "When is Candidate Floorplan A considered Pareto-optimal over Candidate B?",
        options: [
          { value: "pareto-non-dominated", label: "When Candidate A is at least as good as B in all metrics and strictly superior in at least one objective (e.g. lower HPWL without increasing IR-drop or area)." },
          { value: "pareto-largest-area", label: "When Candidate A has the largest die area, regardless of power or timing." },
          { value: "pareto-single-metric", label: "When Candidate A passes DRC, even if its wirelength is 10× worse." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.paretoQuiz === 'pareto-non-dominated';
      return evaluateGuidedAssignment('fp-32', inputs, isQuizOk, 50);
    },
  },

  'fp-33': {
    id: 'fp-33',
    module: 7,
    moduleTitle: 'Module 7: Advanced Power & Optimization',
    title: 'Congestion Stress Test & Channel Bottlenecks',
    description: 'Relieve routing congestion hotspots caused by narrow macro channels (<35µm) and high pin density.',
    xpReward: 55,
    starThresholds: [22, 40, 55],
    duration: '~15 min',
    concept: `Routing channels between adjacent hard macros must be wide enough (>= 35 µm)
    to carry global interconnect wires. Narrow channels throttle routing capacity and create severe congestion bottlenecks.`,
    canvas: { dieWidth: 700, dieHeight: 550, coreWidth: 600, coreHeight: 450, margin: 50 },
    questions: [
      {
        field: "channelBottleneckQuiz",
        prompt: "Why do routing channels narrower than 35 µm between adjacent hard macros cause severe routing overflow?",
        options: [
          { value: "narrow-channel-track-shortage", label: "Macro keepout halos overlap and global routing tracks cannot pass between the macros, forcing detour routes and congestion hotspots." },
          { value: "narrow-channel-overheats", label: "Air cannot circulate between narrow macro gaps on silicon, causing thermal overheating." },
          { value: "narrow-channel-clock-skew", label: "Clock buffers cannot be synthesized if distance is less than 50 µm." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.channelBottleneckQuiz === 'narrow-channel-track-shortage';
      return evaluateGuidedAssignment('fp-33', inputs, isQuizOk, 55);
    },
  },

  // ─── MODULE 8: ADVANCED ENGINEERING HANDOFF ──────────────────────────────
  'fp-34': {
    id: 'fp-34',
    module: 8,
    moduleTitle: 'Module 8: Advanced Engineering Handoff',
    title: 'Data Exchange & Reproducible Design',
    description: 'Inspect DEF/LEF physical design representations and verify lossless schema serialization.',
    xpReward: 55,
    starThresholds: [22, 40, 55],
    duration: '~12 min',
    concept: `Physical design handoff uses industry-standard formats:
    - LEF (Library Exchange Format): abstracts cell geometries, pin layers, and blockage keepouts.
    - DEF (Design Exchange Format): describes complete physical placement and net routing coordinates.`,
    canvas: { dieWidth: 650, dieHeight: 500, coreWidth: 550, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "dataExchangeQuiz",
        prompt: "What standard industry format captures macro abstract boundaries, obstruction layers, and pin layer coordinates for floorplanning?",
        options: [
          { value: "lef-abstract-standard", label: "Library Exchange Format (LEF) provides cell geometries, pins, and blockage abstracts without revealing internal transistor masks." },
          { value: "verilog-netlist-only", label: "Gate-level Verilog (.v) alone contains complete physical layout coordinates and metal routing layers." },
          { value: "sdc-timing-format", label: "Synopsys Design Constraints (SDC) define macro placement coordinates." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.dataExchangeQuiz === 'lef-abstract-standard';
      return evaluateGuidedAssignment('fp-34', inputs, isQuizOk, 55);
    },
  },

  'fp-35': {
    id: 'fp-35',
    module: 8,
    moduleTitle: 'Module 8: Advanced Engineering Handoff',
    title: 'Design Review & Tradeoff Defense',
    description: 'Defend physical floorplan choices in a formal ASIC engineering review meeting.',
    xpReward: 60,
    starThresholds: [24, 45, 60],
    duration: '~15 min',
    concept: `Formal Floorplan Design Reviews (FDR) require defending floorplan architecture against PPA metrics before handoff to placement and CTS.
    Engineers must justify utilization budgets, power ring impedance margins, and channel clearances.`,
    canvas: { dieWidth: 700, dieHeight: 500, coreWidth: 600, coreHeight: 400, margin: 50 },
    questions: [
      {
        field: "designReviewQuiz",
        prompt: "During a floorplan design review, why is signing off with 82% effective utilization and 28 mV worst IR-drop acceptable, while 96% utilization is rejected?",
        options: [
          { value: "routability-margin-signoff", label: "82% utilization preserves routing track capacity for timing optimization, clock tree buffers, and ECOs; 96% causes unroutable shorts." },
          { value: "lower-util-always-forbidden", label: "Foundries require exactly 100% silicon density before fabrication." },
          { value: "ir-drop-irrelevant", label: "Static IR drop has no effect on timing margins or setup slack." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.designReviewQuiz === 'routability-margin-signoff';
      return evaluateGuidedAssignment('fp-35', inputs, isQuizOk, 60);
    },
  },

  'fp-36': {
    id: 'fp-36',
    module: 8,
    moduleTitle: 'Module 8: Advanced Engineering Handoff',
    title: 'Expert SoC Floorplan Final Capstone',
    description: 'Architect, optimize, and sign off a complete 6+ macro SoC floorplan in the Studio; graded on authentic project metrics.',
    xpReward: 100,
    starThresholds: [40, 75, 100],
    duration: '~30 min',
    concept: `The Grand Final SoC Floorplanning Capstone!
    Architect a complete multi-macro SoC subsystem from scratch or from the Small SoC benchmark:
    1. Instantiate at least 6 hard macros across multiple master types (SRAM, ROM, PLL, DMA).
    2. Place and orient macros with zero overlaps and legal keepout halos.
    3. Generate placement rows and assign peripheral I/O pins meeting minimum pitch (>= 10 µm).
    4. Construct a continuous VDD/VSS PDN mesh with power rings, straps, and interlayer vias.
    5. Maintain static IR drop <= 30 mV and resolve all critical routing congestion hotspots.
    6. Save your project in the Studio and submit for comprehensive physical design sign-off.`,
    canvas: { dieWidth: 800, dieHeight: 650, coreWidth: 700, coreHeight: 550, margin: 50 },
    requiresStudioProject: true,
    minMacros: 6,
    questions: [
      {
        field: "socSignoffQuiz",
        prompt: "What physical design criteria are required simultaneously for final SoC floorplan sign-off and placement handoff?",
        options: [
          { value: "all-signoff-gates", label: "All gates simultaneously: >=6 macros, zero DRC/halo violations, continuous VDD/VSS PDN, <=30 mV static IR drop, and cleared congestion." },
          { value: "drc-alone", label: "Zero DRC errors alone is sufficient; power continuity can be fixed after placement." },
          { value: "macros-only", label: "Placing 6 macros anywhere on the die qualifies for floorplan sign-off." },
        ],
      },
    ],
    validate: (inputs) => {
      const isQuizOk = inputs.socSignoffQuiz === 'all-signoff-gates';
      return evaluateGuidedAssignment('fp-36', inputs, isQuizOk, 100);
    },
  },
};
