/**
 * activityRegistry.js — Combined Three-Studio (RTL & Floorplanning)
 */
import React from 'react';

// Kingdom 1: RTL Understanding
import RTLMuxChallenge from './rtl/RTLMuxChallenge.jsx';
import { validateMuxChallenge } from './rtl/validators/validateMuxChallenge.js';
import RTLDFFChallenge from './rtl/RTLDFFChallenge.jsx';
import { validateDFFChallenge } from './rtl/validators/validateDFFChallenge.js';
import RTLCombSeqChallenge from './rtl/RTLCombSeqChallenge.jsx';
import { validateCombSeqChallenge } from './rtl/validators/validateCombSeqChallenge.js';
import RTLAccumulatorChallenge from './rtl/RTLAccumulatorChallenge.jsx';
import { validateAccumulatorChallenge } from './rtl/validators/validateAccumulatorChallenge.js';
import RTLFSMChallenge from './rtl/RTLFSMChallenge.jsx';
import { validateFSMChallenge } from './rtl/validators/validateFSMChallenge.js';

// Kingdom 3: Floorplanning
import FPExpandedLessonChallenge from './floorplanning/expanded/FPExpandedLessonChallenge.jsx';
import { EXPANDED_LESSONS } from './floorplanning/expanded/fpExpandedCurriculumData.js';
import FPIntroChallenge from './floorplanning/FPIntroChallenge.jsx';
import { validateFPIntro } from './floorplanning/validators/validateFPIntro.js';
import FPGeometryChallenge from './floorplanning/FPGeometryChallenge.jsx';
import { validateFPGeometry } from './floorplanning/validators/validateFPGeometry.js';
import FPPinPlacementChallenge from './floorplanning/FPPinPlacementChallenge.jsx';
import { validateFPPinPlacement } from './floorplanning/validators/validateFPPinPlacement.js';
import FPMacroPlacementChallenge from './floorplanning/FPMacroPlacementChallenge.jsx';
import { validateFPMacroPlacement } from './floorplanning/validators/validateFPMacroPlacement.js';
import FPKingdomChallenge from './floorplanning/FPKingdomChallenge.jsx';
import { validateFPKingdom } from './floorplanning/validators/validateFPKingdom.js';

export const ACTIVITY_REGISTRY = {
  // RTL Understanding
  'rtl-1': {
    levelId: 'rtl-1',
    kingdomId: 'rtl-understanding',
    title: '2:1 Multiplexer — The Core of RTL Dataflow Steering',
    component: RTLMuxChallenge,
    validator: validateMuxChallenge,
  },
  'rtl-2': {
    levelId: 'rtl-2',
    kingdomId: 'rtl-understanding',
    title: 'D Flip-Flop & Sequential Storage Primitives',
    component: RTLDFFChallenge,
    validator: validateDFFChallenge,
  },
  'rtl-3': {
    levelId: 'rtl-3',
    kingdomId: 'rtl-understanding',
    title: 'Combinational Logic vs. Sequential Storage',
    component: RTLCombSeqChallenge,
    validator: validateCombSeqChallenge,
  },
  'rtl-4': {
    levelId: 'rtl-4',
    kingdomId: 'rtl-understanding',
    title: 'Pipelined Accumulator & Arithmetic Datapath',
    component: RTLAccumulatorChallenge,
    validator: validateAccumulatorChallenge,
  },
  'rtl-5': {
    levelId: 'rtl-5',
    kingdomId: 'rtl-understanding',
    title: 'RTL Kingdom Capstone — 1011 Sequence Detector FSM',
    component: RTLFSMChallenge,
    validator: validateFSMChallenge,
  },

  // Floorplanning Core (FP-1 to FP-5)
  'fp-1': {
    levelId: 'fp-1',
    kingdomId: 'floorplanning',
    title: 'Introduction to Floorplanning — Die, Core, and Power Grid',
    component: FPIntroChallenge,
    validator: validateFPIntro,
  },
  'fp-2': {
    levelId: 'fp-2',
    kingdomId: 'floorplanning',
    title: 'Core Utilization & Aspect Ratio Geometry',
    component: FPGeometryChallenge,
    validator: validateFPGeometry,
  },
  'fp-3': {
    levelId: 'fp-3',
    kingdomId: 'floorplanning',
    title: 'I/O Pin Placement & Ring Design',
    component: FPPinPlacementChallenge,
    validator: validateFPPinPlacement,
  },
  'fp-4': {
    levelId: 'fp-4',
    kingdomId: 'floorplanning',
    title: 'Macro Placement & Halo Clearances',
    component: FPMacroPlacementChallenge,
    validator: validateFPMacroPlacement,
  },
  'fp-5': {
    levelId: 'fp-5',
    kingdomId: 'floorplanning',
    title: 'Floorplanning Kingdom Capstone — Complete Floorplan Strategy',
    component: FPKingdomChallenge,
    validator: validateFPKingdom,
  },
};

// Register Floorplanning 3.0 Expanded Track (FP-6 through FP-36)
Object.entries(EXPANDED_LESSONS).forEach(([id, lesson]) => {
  ACTIVITY_REGISTRY[id] = {
    levelId: id,
    kingdomId: 'floorplanning',
    title: lesson.title + ' — ' + lesson.moduleTitle,
    component: FPExpandedLessonChallenge,
    validator: lesson.validate,
    maxScore: lesson.xpReward,
    starThresholds: lesson.starThresholds,
    isExpanded: true,
  };
});

export function hasActivity(levelId) {
  return Boolean(ACTIVITY_REGISTRY[levelId]);
}

export function getActivity(levelId) {
  return ACTIVITY_REGISTRY[levelId] || null;
}

export function getActivityConfig(levelId) {
  return ACTIVITY_REGISTRY[levelId] || null;
}