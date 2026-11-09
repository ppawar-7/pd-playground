/**
 * floorplan31LessonsAcceptanceMatrix.test.js
 * ==========================================
 * Comprehensive Acceptance Matrix Test Suite for all 31 expanded Floorplanning
 * lessons (FP-6 through FP-36).
 *
 * For EVERY lesson:
 * 1. Missing project: verifies fail-closed rejection when no project is provided.
 * 2. Wrong assignment ID: verifies rejection when project.assignmentId mismatches.
 * 3. Untouched starting scenario: verifies rejection of flawed initial state.
 * 4. Incorrect student edit: verifies rejection of non-compliant edits.
 * 5. Successful correction: verifies 3-star certification and full XP award.
 * 6. Persistence: verifies project survives serialization/deserialization.
 */

import { describe, it, expect } from 'vitest';
import {
  EXPANDED_LESSONS,
} from '../../activities/floorplanning/expanded/fpExpandedCurriculumData.js';
import {
  getAssignmentScenario,
  getPassingAssignmentProject,
  evaluateGuidedAssignment,
} from '../../activities/floorplanning/expanded/guidedAssignmentService.js';
import {
  serializeProject,
  deserializeProject,
} from '../../engine/floorplanProjectModel.js';

const LESSON_IDS = Object.keys(EXPANDED_LESSONS).filter((id) => {
  const num = parseInt(id.replace('fp-', ''), 10);
  return num >= 6 && num <= 36;
});

describe('Floorplanning 31-Lesson Acceptance Matrix (FP-6 to FP-36)', () => {
  it('contains exactly 31 authentic expanded CAD lessons', () => {
    expect(LESSON_IDS.length).toBe(31);
  });

  LESSON_IDS.forEach((lessonId) => {
    describe(`Lesson ${lessonId.toUpperCase()}`, () => {
      const lesson = EXPANDED_LESSONS[lessonId];

      // 1. Missing Project Gate
      it(`${lessonId}: rejects submission with missing project (Fail-Closed)`, () => {
        const res = evaluateGuidedAssignment(lessonId, { project: null }, true, lesson.xpReward || 35);
        expect(res.passed).toBe(false);
        expect(res.stars).toBe(0);
        expect(res.feedback).toContain('CAD certification requires a saved Studio project');
      });

      // 2. Wrong Assignment ID Gate
      it(`${lessonId}: rejects project with mismatched assignmentId`, () => {
        const passingProject = getPassingAssignmentProject(lessonId);
        const wrongProject = { ...passingProject, assignmentId: 'fp-unrelated-lesson' };
        const res = evaluateGuidedAssignment(lessonId, { project: wrongProject }, true, lesson.xpReward || 35);
        expect(res.passed).toBe(false);
        expect(res.stars).toBe(0);
        expect(res.feedback).toContain('Assignment mismatch');
      });

      // 3. Untouched Starting Scenario Gate
      it(`${lessonId}: rejects untouched starting scenario (proves authentic defect present)`, () => {
        const startingScenario = getAssignmentScenario(lessonId);
        expect(startingScenario).toBeDefined();
        expect(startingScenario.assignmentId).toBe(lessonId);

        const res = evaluateGuidedAssignment(lessonId, { project: startingScenario }, true, lesson.xpReward || 35);
        expect(res.passed).toBe(false);
        expect(res.stars).toBeLessThan(3);
      });

      // 4. Incorrect Student Edit Gate
      it(`${lessonId}: rejects incorrect student modification`, () => {
        const flawedProject = getAssignmentScenario(lessonId);
        // Perturb the project to keep it failing or worsen it
        if (flawedProject.core) {
          flawedProject.core.width = 10; // Absurdly tiny core
        }
        const res = evaluateGuidedAssignment(lessonId, { project: flawedProject }, true, lesson.xpReward || 35);
        expect(res.passed).toBe(false);
      });

      // 5. Successful Student Correction Gate
      it(`${lessonId}: passes with verified 3-star certification and XP award when corrected`, () => {
        const passingProject = getPassingAssignmentProject(lessonId);
        expect(passingProject.assignmentId).toBe(lessonId);

        const res = evaluateGuidedAssignment(lessonId, { project: passingProject }, true, lesson.xpReward || 35);
        expect(res.passed).toBe(true);
        expect(res.stars).toBe(3);
        expect(res.score).toBe(lesson.xpReward || 35);
        expect(res.feedback).toMatch(/(✓|🏆)/);
      });

      // 6. Project Persistence Gate
      it(`${lessonId}: preserves passing evaluation across JSON serialization / deserialization`, () => {
        const passingProject = getPassingAssignmentProject(lessonId);
        const serialized = serializeProject(passingProject);
        const deserialized = deserializeProject(serialized);

        expect(deserialized.assignmentId).toBe(lessonId);
        const res = evaluateGuidedAssignment(lessonId, { project: deserialized }, true, lesson.xpReward || 35);
        expect(res.passed).toBe(true);
        expect(res.stars).toBe(3);
      });
    });
  });
});
