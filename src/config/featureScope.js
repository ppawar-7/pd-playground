/**
 * featureScope.js
 * ================
 * Centralized feature-scope configuration for PD Playground.
 *
 * Current Active Platform Scope:
 * Features THREE flagship educational experiences:
 *   1. Complete RTL Playground (Bundled RTL Studio + Logic Kingdom)
 *   2. Deep Floorplanning Kingdom & Studio 3.0 (36-lesson curriculum + full CAD Studio)
 *   3. Complete Static Timing Analysis (STA) Playground (Timing laboratory & constraints)
 *
 * Postponed Industrial Kingdoms (Safely archived, not deleted):
 *   - Synthesis: Intermediate gate-level transformation stage between RTL and Floorplanning.
 *   - Placement, CTS, Routing, Filler Cells, GDS: Downstream physical implementation stages.
 */

import { KINGDOMS } from '../data/kingdomsData.js';

export const FEATURE_SCOPE_VERSION = '3.0.0-three-studio';

export const FEATURED_EXPERIENCES = [
  {
    id: 'rtl',
    kingdomId: 'rtl-understanding',
    title: 'RTL Design & Simulation',
    subtitle: 'Digital Logic & HDL Engineering Studio',
    tagline: 'Construct combinational and sequential digital logic, state machines, and Verilog netlists.',
    emoji: '🧩',
    color: '#7c3aed',
    studioRoute: '/studio/rtl',
    kingdomRoute: '/kingdom/rtl-understanding',
    exploreStudioRoute: '/explore/studio/rtl',
    exploreKingdomRoute: '/explore/kingdom/rtl-understanding',
    highlights: [
      'Interactive Schematic Canvas with Live Logic Simulation',
      'Verilog HDL Generation & Code Editor',
      'Combinational Mux/ALU and Sequential DFF/FSM Modules',
      'Guided RTL Kingdom Curriculum (Levels RTL-1 to RTL-5)',
    ],
  },
  {
    id: 'floorplanning',
    kingdomId: 'floorplanning',
    title: 'Physical Floorplanning',
    subtitle: 'Deep ASIC CAD & Physical Design Studio',
    tagline: 'Architect core dies, place hard macros, synthesize M4/M5 power mesh grids, and verify design rule sign-off.',
    emoji: '🗺️',
    color: '#10b981',
    studioRoute: '/studio/floorplanning',
    kingdomRoute: '/kingdom/floorplanning',
    exploreStudioRoute: '/explore/studio/floorplanning',
    exploreKingdomRoute: '/explore/kingdom/floorplanning',
    highlights: [
      'Full CAD Floorplan Studio with Pan/Zoom & Authentic Pointer Drag',
      'Expanded 36-Lesson Comprehensive Curriculum (FP-1 through FP-36)',
      'Modified Nodal Analysis (MNA) Conductance Matrix PDN Solver',
      'Assisted Macro Legalization & Pin Pitch Automation Assistants',
      'Pareto Multiobjective Trade-Off Frontier & Snapshot Comparison',
      'Educational LEF 5.8 & DEF 5.8 Subset Layout Exporters',
    ],
  },
  {
    id: 'sta',
    title: 'Static Timing Analysis',
    subtitle: 'Static Timing Analysis & Verification Laboratory',
    tagline: 'Calculate setup/hold slack, analyze critical data paths, enforce SDC timing constraints, and inspect clock skew.',
    emoji: '⏱️',
    color: '#f59e0b',
    studioRoute: '/studio/sta',
    exploreStudioRoute: '/explore/studio/sta',
    timingRole: 'timing-verification', // Explicitly presented as timing verification/analysis, not CTS replacement
    highlights: [
      'Interactive Timing Path Graph with Cell & Interconnect Delay Modeling',
      'Setup & Hold Slack Calculations across PVT Operating Corners',
      'SDC Constraint Authoring (create_clock, set_input_delay, set_output_delay)',
      'Clock Latency, Jitter, and Skew Margin Inspection',
      'Path Slack Breakdown & Critical Path Optimization Sandbox',
    ],
  },
];

export const POSTPONED_KINGDOMS = {
  synthesis: {
    id: 'synthesis',
    name: 'Synthesis',
    order: 2,
    emoji: '⚗️',
    flowPosition: 'Between RTL and Floorplanning',
    rationale:
      'In standard industrial ASIC flows, Logic Synthesis maps RTL HDL code into gate-level primitives before floorplanning. This kingdom is safely archived while we focus on the Three-Studio flagship release.',
  },
  placement: {
    id: 'placement',
    name: 'Placement',
    order: 4,
    emoji: '📌',
    flowPosition: 'After Floorplanning',
    rationale:
      'Standard cell global and detailed placement is safely archived for subsequent deep physical design studio releases.',
  },
  cts: {
    id: 'cts',
    name: 'Clock Tree Synthesis (CTS)',
    order: 5,
    emoji: '🕐',
    flowPosition: 'After Placement',
    rationale:
      'Physical clock tree buffer synthesis and skew balancing is safely archived. Note: Static Timing Analysis (STA) verification is featured as an independent studio.',
  },
  routing: {
    id: 'routing',
    name: 'Routing',
    order: 6,
    emoji: '🔗',
    flowPosition: 'After CTS',
    rationale:
      'Global and detailed metal interconnect routing is safely archived for subsequent development.',
  },
  'filler-cells': {
    id: 'filler-cells',
    name: 'Filler Cells & Decap',
    order: 7,
    emoji: '🧱',
    flowPosition: 'After Routing',
    rationale:
      'DRC density fill, well continuity, and decoupling capacitor insertion is safely archived.',
  },
  gds: {
    id: 'gds',
    name: 'GDSII & Signoff',
    order: 8,
    emoji: '💾',
    flowPosition: 'Final Tape-Out Handoff',
    rationale:
      'Final DRC/LVS stream-out and foundry fabrication tape-out is safely archived.',
  },
};

/**
 * Returns true if the kingdom is one of the active featured experiences.
 */
export function isKingdomActive(kingdomId) {
  return kingdomId === 'rtl-understanding' || kingdomId === 'floorplanning';
}

/**
 * Returns the list of currently active featured kingdoms from kingdomsData.
 */
export function getActiveKingdoms() {
  return KINGDOMS.filter((k) => isKingdomActive(k.id));
}

/**
 * Returns all kingdoms including safely archived ones.
 */
export function getAllKingdoms() {
  return KINGDOMS;
}

/**
 * Determines whether legacy 8-kingdom mode should be rendered.
 * Accessible via /legacy/world-map or ?legacy=true query parameter.
 */
export function isLegacyMode(location) {
  if (!location) return false;
  const path = typeof location === 'string' ? location : location.pathname || '';
  const search = typeof location === 'object' && location.search ? location.search : '';
  return path.startsWith('/legacy') || search.includes('legacy=true');
}
