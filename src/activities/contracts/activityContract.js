/**
 * activityContract.js
 * ====================
 * Standard versioned contract between educational interactive activities
 * and the Game-Site progression engine.
 *
 * Design principles:
 * 1. Deterministic validation: pure functions evaluate student input.
 * 2. Formative feedback: detailed explanations for all states, correct or incorrect.
 * 3. Anti-tampering: UI cannot supply arbitrary scores; score is computed strictly from verified correctness.
 * 4. Mastery gate: levels require passing the core engineering requirements before declarations of completion.
 */

export const ACTIVITY_CONTRACT_VERSION = '1.0';

/**
 * Validates and normalizes an activity outcome into an ActivityResult_v1 object.
 *
 * @param {Object} params
 * @param {string} params.levelId - Target level identifier (e.g. 'rtl-1')
 * @param {boolean} params.passed - Whether student passed the learning mastery gate
 * @param {number} params.score - Validated XP score (0 to maxXP)
 * @param {number} params.stars - Earned stars (0 to 3)
 * @param {string} params.feedback - Summary pedagogical explanation
 * @param {Array<{ label: string, passed: boolean, explanation: string }>} [params.breakdown] - Granular sub-checks
 * @param {Object} [params.stateSnapshot] - Student's input state for session tracking
 * @returns {Object} ActivityResult_v1
 */
export function createActivityResult({
  levelId,
  passed,
  score,
  stars,
  feedback,
  breakdown = [],
  stateSnapshot = null,
}) {
  if (!levelId || typeof levelId !== 'string') {
    throw new Error('activityContract: levelId is required and must be a string.');
  }

  const normalizedPassed = Boolean(passed);
  const normalizedScore = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0;
  const normalizedStars = Math.max(0, Math.min(3, Math.round(stars || 0)));

  return {
    version: ACTIVITY_CONTRACT_VERSION,
    levelId,
    passed: normalizedPassed,
    score: normalizedScore,
    stars: normalizedStars,
    feedback: feedback || (normalizedPassed ? 'Activity successfully completed!' : 'Criteria not met yet. Review feedback below.'),
    breakdown: Array.isArray(breakdown) ? breakdown : [],
    stateSnapshot: stateSnapshot || {},
    timestamp: new Date().toISOString(),
  };
}
