/**
 * floorplanningExpandedActivities.test.js
 * =======================================
 * Validates that all 31 expanded Floorplanning 3.0 activities (fp-6 through fp-36)
 * are properly registered in activityRegistry and their validators function deterministically.
 */

import { describe, it, expect } from 'vitest';
import { getActivity, hasActivity } from '../../activities/activityRegistry.js';
import { EXPANDED_LESSONS } from '../../activities/floorplanning/expanded/fpExpandedCurriculumData.js';
import { getPassingAssignmentProject } from '../../activities/floorplanning/expanded/guidedAssignmentService.js';

describe('Floorplanning 3.0 Expanded Activities (fp-6 through fp-36)', () => {
  const lessonIds = Object.keys(EXPANDED_LESSONS);

  it('all 31 expanded lessons are defined in EXPANDED_LESSONS', () => {
    expect(lessonIds.length).toBe(31);
  });

  lessonIds.forEach((id) => {
    describe(`Activity: ${id} (${EXPANDED_LESSONS[id].title})`, () => {
      it(`is registered in activityRegistry and returns an activity descriptor`, () => {
        expect(hasActivity(id)).toBe(true);
        const act = getActivity(id);
        expect(act).toBeTruthy();
        expect(act.levelId).toBe(id);
        expect(act.kingdomId).toBe('floorplanning');
        expect(typeof act.validator).toBe('function');
      });

      it(`rejects incomplete submission without project or answers`, () => {
        const act = getActivity(id);
        const res = act.validator({});
        expect(res.passed).toBe(false);
        expect(res.stars).toBe(0);
      });
    });
  });

  it('fp-6 validates correctly with proper aspect ratio, quiz answer, and matching Studio project', () => {
    const act = getActivity('fp-6');
    const validRes = act.validator({
      aspectRatio: 0.6,
      bestRatioQuiz: 'ar-square',
      project: getPassingAssignmentProject('fp-6'),
    });
    expect(validRes.passed).toBe(true);
    expect(validRes.stars).toBeGreaterThanOrEqual(2);
  });

  it('fp-6 rejects quiz-only submission without a Studio project', () => {
    const act = getActivity('fp-6');
    const res = act.validator({ aspectRatio: 0.6, bestRatioQuiz: 'ar-square' });
    expect(res.passed).toBe(false);
    expect(res.stars).toBe(0);
  });

  it('fp-7 validates area budgets with matching Studio project', () => {
    const act = getActivity('fp-7');
    const validRes = act.validator({
      stdCellArea: 1250000,
      requiredCoreArea: 1785714,
      project: getPassingAssignmentProject('fp-7'),
    });
    expect(validRes.passed).toBe(true);
    expect(validRes.stars).toBeGreaterThanOrEqual(2);
  });

  it('fp-11 validates halo separation sum rule with matching Studio project', () => {
    const act = getActivity('fp-11');
    const validRes = act.validator({
      requiredSeparation: 35,
      corridorQuiz: 'corridor-congestion',
      project: getPassingAssignmentProject('fp-11'),
    });
    expect(validRes.passed).toBe(true);
    expect(validRes.stars).toBeGreaterThanOrEqual(2);
  });

  it('fp-18 validates static IR drop calculation with matching Studio project', () => {
    const act = getActivity('fp-18');
    const validRes = act.validator({
      calculatedDrop: 30,
      irFixQuiz: 'add-more-straps',
      project: getPassingAssignmentProject('fp-18'),
    });
    expect(validRes.passed).toBe(true);
    expect(validRes.stars).toBeGreaterThanOrEqual(2);
  });

  it('fp-24 rejects self-attested checkboxes without a Studio project', () => {
    const act = getActivity('fp-24');
    const res = act.validator({ macrosPlaced: 4, powerStrapsConnected: true, drcPassed: true });
    expect(res.passed).toBe(false);
  });

  it('fp-36 rejects self-attested checkboxes without a Studio project', () => {
    const act = getActivity('fp-36');
    const res = act.validator({ macrosPlaced: 6, drcClean: true, socSignoffQuiz: 'all-signoff-gates' });
    expect(res.passed).toBe(false);
  });
});
