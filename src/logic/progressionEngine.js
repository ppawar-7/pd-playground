/**
 * progressionEngine.js
 * =====================
 * Core game logic for computing kingdom/level/sanity check unlock states,
 * awarding XP, checking achievements, and computing player level.
 *
 * This module is PURE (no React, no side effects) so it can be
 * tested independently and used anywhere in the app.
 */

import { KINGDOMS } from '../data/kingdomsData.js';
import { ACHIEVEMENTS } from '../data/playerDefaults.js';
import {
  SANITY_CHECK_REQUIREMENTS,
  getStudentDesignForSanityCheck,
} from './studentDesignContext.js';
import { CHECK_CLASSIFICATION } from './designArtifactContracts.js';
import { evaluateSanityCheck } from '../engine/sanityCheckEngine.js';

// ─── Player level thresholds (XP required to reach each player level) ──────
const PLAYER_LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2800];

/**
 * Compute the player's display level (1-indexed) from total XP.
 */
export function computePlayerLevel(totalXP) {
  let level = 1;
  for (let i = 0; i < PLAYER_LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= PLAYER_LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

/**
 * Compute XP progress toward the next player level.
 * Returns { current, required, percent }
 */
export function computeLevelProgress(totalXP) {
  const level = computePlayerLevel(totalXP);
  const currentThreshold = PLAYER_LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = PLAYER_LEVEL_THRESHOLDS[level] ?? currentThreshold + 500;
  const current = totalXP - currentThreshold;
  const required = nextThreshold - currentThreshold;
  return { current, required, percent: Math.min(100, Math.round((current / required) * 100)) };
}

/**
 * Count how many kingdoms are unlocked for the player.
 */
export function countKingdomsUnlocked(player) {
  return KINGDOMS.filter((k) => isKingdomUnlocked(player, k.id)).length;
}

/**
 * Count total levels completed by player across all kingdoms.
 */
export function countLevelsCompleted(player) {
  let count = 0;
  for (const k of KINGDOMS) {
    for (const l of k.levels) {
      if (player?.levelProgress?.[l.id]?.completed) count++;
    }
  }
  return count;
}

/**
 * Total number of sanity checks across all kingdoms.
 */
export function countTotalSanityChecks() {
  return KINGDOMS.reduce((sum, k) => sum + (k.sanityChecks?.length || 0), 0);
}

/**
 * Total number of sanity checks passed by the player across all kingdoms.
 */
export function countTotalSanityChecksPassed(player) {
  let count = 0;
  for (const k of KINGDOMS) {
    for (const c of k.sanityChecks || []) {
      if (player?.sanityCheckProgress?.[c.id]?.passed) count++;
    }
  }
  return count;
}

/**
 * Compute overall progress percentage (0 - 100) across all 40 levels and 26 sanity checks.
 */
export function computeOverallProgress(player) {
  const totalLevels = KINGDOMS.reduce((s, k) => s + k.levels.length, 0);
  const totalSanity = countTotalSanityChecks();
  const totalItems = totalLevels + totalSanity;
  if (totalItems === 0) return 0;

  const doneLevels = countLevelsCompleted(player);
  const doneSanity = countTotalSanityChecksPassed(player);

  return Math.min(100, Math.round(((doneLevels + doneSanity) / totalItems) * 100));
}

/**
 * Get the total XP a player has earned specifically within a kingdom
 * (from levels + sanity checks).
 */
export function getKingdomXP(player, kingdomId) {
  const kingdom = KINGDOMS.find((k) => k.id === kingdomId);
  if (!kingdom) return 0;

  // Level XP
  const levelXP = kingdom.levels.reduce((sum, level) => {
    return sum + (player.levelProgress?.[level.id]?.xpEarned ?? 0);
  }, 0);

  // Sanity Checks XP
  const sanityXP = (kingdom.sanityChecks || []).reduce((sum, check) => {
    return sum + (player.sanityCheckProgress?.[check.id]?.score ?? 0);
  }, 0);

  return levelXP + sanityXP;
}

/**
 * Get all sanity checks defined for a kingdom.
 */
export function getKingdomSanityChecks(kingdomId) {
  const kingdom = KINGDOMS.find((k) => k.id === kingdomId);
  return kingdom?.sanityChecks || [];
}

/**
 * Get only the CERTIFIABLE sanity checks for a kingdom (excludes PRACTICE_ONLY checks).
 */
export function getKingdomCertifiableSanityChecks(kingdomId) {
  const checks = getKingdomSanityChecks(kingdomId);
  return checks.filter((c) => {
    const req = SANITY_CHECK_REQUIREMENTS[c.id];
    return req && req.classification === CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK;
  });
}

/**
 * Check if a specific sanity check has passed (either certified or drilled).
 */
export function isSanityCheckPassed(player, checkId) {
  const progress = player?.sanityCheckProgress?.[checkId];
  if (!progress) return false;
  if (progress.stale) return false;
  const req = SANITY_CHECK_REQUIREMENTS[checkId];
  if (req?.classification === CHECK_CLASSIFICATION.PRACTICE_ONLY) {
    return Boolean((progress.drilled || progress.passed) && !progress.stale);
  }
  return Boolean(progress.certified && !progress.stale);
}

/**
 * Count how many sanity checks have passed in a kingdom.
 */
export function countPassedKingdomSanityChecks(player, kingdomId) {
  const checks = getKingdomSanityChecks(kingdomId);
  return checks.filter((c) => isSanityCheckPassed(player, c.id)).length;
}

/**
 * Check if all CERTIFIABLE sanity checks in a kingdom are certified.
 * Practice-only checks do not block kingdom completion.
 */
export function areAllKingdomSanityChecksPassed(player, kingdomId) {
  const certifiableChecks = getKingdomCertifiableSanityChecks(kingdomId);
  if (!certifiableChecks.length) return true;
  return certifiableChecks.every((c) => {
    const prog = player?.sanityCheckProgress?.[c.id];
    return prog?.certified === true && !prog?.stale;
  });
}

/**
 * Determine if all main levels of a kingdom are completed.
 */
export function areAllKingdomLevelsCompleted(player, kingdomId) {
  const kingdom = KINGDOMS.find((k) => k.id === kingdomId);
  if (!kingdom) return false;
  return kingdom.levels.every((l) => player.levelProgress?.[l.id]?.completed);
}

/**
 * Check if a sanity check is unlocked and ready to be run.
 * Rules:
 * - Parent kingdom must be unlocked.
 * - All main levels of this kingdom must be completed.
 * - If PRACTICE_ONLY: Immediately available once kingdom levels are completed.
 * - If CERTIFIABLE: Available once the previous certifiable check is certified.
 */
export function isSanityCheckUnlocked(player, kingdomId, check) {
  if (!isKingdomUnlocked(player, kingdomId)) return false;

  const kingdom = KINGDOMS.find((k) => k.id === kingdomId);
  if (!kingdom) return false;

  // Levels must be completed to begin sign-off sanity checks
  const levelsDone = areAllKingdomLevelsCompleted(player, kingdomId);
  if (!levelsDone) return false;

  const req = SANITY_CHECK_REQUIREMENTS[check.id];
  // Practice-only drills are open as soon as levels are done
  if (req?.classification === CHECK_CLASSIFICATION.PRACTICE_ONLY) {
    return true;
  }

  // For certifiable checks: find prior certifiable check in this kingdom
  const certifiableChecks = getKingdomCertifiableSanityChecks(kingdomId);
  const checkIdx = certifiableChecks.findIndex((c) => c.id === check.id);
  if (checkIdx <= 0) return true; // First certifiable check is unlocked!

  const prevCertifiable = certifiableChecks[checkIdx - 1];
  return Boolean(player.sanityCheckProgress?.[prevCertifiable.id]?.certified);
}

/**
 * Get status of a sanity check: 'locked' | 'available' | 'passed'
 */
export function getSanityCheckStatus(player, kingdomId, check) {
  const progress = player?.sanityCheckProgress?.[check.id];
  if (progress?.stale) return 'stale';
  if (isSanityCheckPassed(player, check.id)) {
    const req = SANITY_CHECK_REQUIREMENTS[check.id];
    if (req?.classification === CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK && progress?.certified) {
      return 'certified';
    }
    return 'passed';
  }
  if (isSanityCheckUnlocked(player, kingdomId, check)) return 'available';
  return 'locked';
}

/**
 * Determine if a specific kingdom is unlocked for the player.
 * Kingdom 1 is always unlocked.
 * Kingdom N is unlocked when:
 * 1. Previous kingdom's main core levels are completed.
 * 2. Previous kingdom's XP >= its pointsToUnlockNext.
 */
export function isKingdomUnlocked(player, kingdomId) {
  const kingdom = KINGDOMS.find((k) => k.id === kingdomId);
  if (!kingdom) return false;
  if (kingdom.order === 1) return true;

  // Active Three-Studio Scope: Floorplanning is directly accessible without prerequisites
  if (kingdomId === 'floorplanning') return true; // Direct access in Three-Studio Focus
  if (false && kingdomId === 'floorplanning') {
    const rtlKingdom = KINGDOMS.find((k) => k.id === 'rtl-understanding');
    const rtlDone = areAllKingdomLevelsCompleted(player, 'rtl-understanding');
    const rtlXP = getKingdomXP(player, 'rtl-understanding');
    if (rtlDone || (rtlKingdom && rtlXP >= rtlKingdom.pointsToUnlockNext)) {
      return true;
    }
  }

  const prevKingdom = KINGDOMS.find((k) => k.order === kingdom.order - 1);
  if (!prevKingdom) return false;

  // 1. Levels must be completed in previous kingdom
  const prevLevelsCompleted = areAllKingdomLevelsCompleted(player, prevKingdom.id);
  if (!prevLevelsCompleted) return false;

  // 2. XP threshold in previous kingdom
  const prevKingdomXP = getKingdomXP(player, prevKingdom.id);
  if (prevKingdomXP < prevKingdom.pointsToUnlockNext) return false;

  return true;
}

/**
 * Determine if a kingdom is completely finished (all levels done AND all certifiable sanity checks passed).
 */
export function isKingdomCompleted(player, kingdomId) {
  return (
    areAllKingdomLevelsCompleted(player, kingdomId) &&
    areAllKingdomSanityChecksPassed(player, kingdomId)
  );
}

/**
 * Get overall kingdom status: 'locked' | 'available' | 'completed'
 */
export function getKingdomStatus(player, kingdomId) {
  if (!isKingdomUnlocked(player, kingdomId)) return 'locked';
  if (isKingdomCompleted(player, kingdomId)) return 'completed';
  return 'available';
}

/**
 * Check if a specific level has been completed.
 */
export function isLevelCompleted(player, levelId) {
  return Boolean(player?.levelProgress?.[levelId]?.completed);
}

/**
 * Determine if a level is unlocked.
 * Level 1 of a kingdom unlocks when the kingdom is unlocked AND the level's
 * pointsRequired is met from within that kingdom.
 * Subsequent levels also require the previous level to be completed.
 */
export function isLevelUnlocked(player, kingdom, level) {
  if (!isKingdomUnlocked(player, kingdom.id)) return false;

  const kingdomXP = getKingdomXP(player, kingdom.id);
  if (kingdomXP < level.pointsRequired) return false;

  if (level.order === 1) return true;

  const prevLevel = kingdom.levels.find((l) => l.order === level.order - 1);
  if (!prevLevel) return true;

  return Boolean(player.levelProgress?.[prevLevel.id]?.completed);
}

/**
 * Get status of a level: 'locked' | 'available' | 'completed'
 */
export function getLevelStatus(player, kingdom, level) {
  if (player.levelProgress?.[level.id]?.completed) return 'completed';
  if (isLevelUnlocked(player, kingdom, level)) return 'available';
  return 'locked';
}

/**
 * Compute stars earned from score against thresholds [1-star, 2-star, 3-star].
 */
export function computeStars(score, thresholds = [10, 20, 30]) {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

/**
 * Apply level completion to player state.
 *
 * Enforces explicit artifact replacement policy:
 * - New submission replaces previous artifact cleanly (no field merging)
 * - Retains highest historical XP and stars
 * - Incremental XP delta awarded to player total
 * - Revalidates affected certifications if design geometry changed
 */
export function applyLevelCompletion(player, kingdomId, level, score, artifacts = {}) {
  const kingdom = KINGDOMS.find((k) => k.id === kingdomId);
  const stars = computeStars(score, level.starThresholds);
  const xpEarned = Math.min(score, level.xpReward);

  const existingProgress = player.levelProgress?.[level.id];
  const previousXP = existingProgress?.xpEarned ?? 0;
  const xpDelta = Math.max(0, xpEarned - previousXP);

  // Explicit replacement: Do not merge arbitrary fields across submissions
  const cleanArtifacts =
    artifacts && typeof artifacts === 'object' && Object.keys(artifacts).length > 0
      ? artifacts
      : existingProgress?.artifacts || {};

  const updatedLevelProgress = {
    ...player.levelProgress,
    [level.id]: {
      completed: true,
      stars: Math.max(stars, existingProgress?.stars ?? 0),
      xpEarned: Math.max(xpEarned, previousXP),
      verified: true,
      artifacts: cleanArtifacts,
      completedAt: new Date().toISOString(),
    },
  };

  const updatedArtifactsMap = {
    ...(player.studentDesignArtifacts || {}),
  };
  if (cleanArtifacts?.kind) {
    updatedArtifactsMap[cleanArtifacts.kind] = cleanArtifacts;
  }

  // Revalidate affected certifications if design artifact changed
  const updatedSanityProgress = { ...(player.sanityCheckProgress || {}) };
  if (artifacts && typeof artifacts === 'object' && Object.keys(artifacts).length > 0) {
    const prevArtifacts = existingProgress?.artifacts;
    const isIdentical =
      prevArtifacts &&
      JSON.stringify(prevArtifacts) === JSON.stringify(cleanArtifacts);

    if (!isIdentical) {
      const candidatePlayer = {
        ...player,
        levelProgress: updatedLevelProgress,
        studentDesignArtifacts: updatedArtifactsMap,
      };

      for (const [chkId, chkReq] of Object.entries(SANITY_CHECK_REQUIREMENTS)) {
        if (
          chkReq.classification === CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK &&
          chkReq.prerequisiteLevels.includes(level.id)
        ) {
          if (updatedSanityProgress[chkId]?.certified) {
            const recheck = getStudentDesignForSanityCheck(candidatePlayer, chkId);
            if (!recheck.canCertify) {
              updatedSanityProgress[chkId] = {
                ...updatedSanityProgress[chkId],
                certified: false,
                stale: true,
                staleReason: recheck.reason,
              };
            } else {
              // Rerun actual engineering rule evaluation!
              const evalResult = evaluateSanityCheck(chkId, {
                isStudentDesign: true,
                hasStudentDesign: true,
                designData: recheck.designData,
              });
              if (!evalResult.passed) {
                const violationLine = evalResult.logOutput?.find(
                  (l) => l.includes('VIOLATION') || l.includes('OVER_BUDGET') || l.includes('FAIL')
                );
                const staleReason = violationLine
                  ? violationLine.replace(/^\[[^\]]+\]\s*/, '')
                  : 'Design inputs modified; no longer meet physical design thresholds.';

                updatedSanityProgress[chkId] = {
                  ...updatedSanityProgress[chkId],
                  certified: false,
                  stale: true,
                  staleReason,
                };
              }
            }
          }
        }
      }
    }
  }

  const updatedTotalXP = player.totalXP + xpDelta;

  const allLevelsCompleted = (kingdom?.levels || []).every(
    (l) => updatedLevelProgress[l.id]?.completed
  );
  const allSanityPassed = areAllKingdomSanityChecksPassed(
    { ...player, levelProgress: updatedLevelProgress, sanityCheckProgress: updatedSanityProgress },
    kingdomId
  );

  let kingdomXPBonus = 0;
  const prevKingdomCompleted = player.kingdomProgress?.[kingdomId]?.completed;
  const prevBonusAwarded = player.kingdomProgress?.[kingdomId]?.bonusAwarded;
  if (allLevelsCompleted && allSanityPassed && !prevKingdomCompleted && !prevBonusAwarded) {
    kingdomXPBonus = 50; // bonus XP for full kingdom completion
  }

  const updatedKingdomProgress = {
    ...player.kingdomProgress,
    [kingdomId]: {
      completed: allLevelsCompleted && allSanityPassed,
      bonusAwarded: Boolean(prevBonusAwarded || kingdomXPBonus > 0),
      totalXP: (player.kingdomProgress?.[kingdomId]?.totalXP ?? 0) + xpDelta + kingdomXPBonus,
    },
  };

  const finalTotalXP = updatedTotalXP + kingdomXPBonus;

  const updatedPlayer = {
    ...player,
    totalXP: finalTotalXP,
    levelProgress: updatedLevelProgress,
    sanityCheckProgress: updatedSanityProgress,
    studentDesignArtifacts: updatedArtifactsMap,
    kingdomProgress: updatedKingdomProgress,
    lastPlayedAt: new Date().toISOString(),
  };

  const newAchievements = checkAchievements(updatedPlayer);
  return { ...updatedPlayer, achievements: newAchievements };
}

/**
 * Apply sanity check completion to player state.
 *
 * Enforces:
 * - PRACTICE_ONLY checks never award certification XP.
 * - Replays of certified checks award 0 duplicate XP.
 */
export function applySanityCheckCompletion(player, arg2, arg3, arg4) {
  let kingdomId;
  let checkId;
  let score = 25;

  if (typeof arg2 === 'string' && (typeof arg3 === 'string' || (arg3 && typeof arg3 === 'object'))) {
    // (player, kingdomId, check, score)
    kingdomId = arg2;
    checkId = typeof arg3 === 'string' ? arg3 : arg3.id;
    if (typeof arg4 === 'number') score = arg4;
  } else if (typeof arg2 === 'string') {
    // (player, checkId, score)
    checkId = arg2;
    if (typeof arg3 === 'number') score = arg3;
    for (const k of KINGDOMS) {
      if ((k.sanityChecks || []).some((c) => c.id === checkId)) {
        kingdomId = k.id;
        break;
      }
    }
  } else if (arg2 && typeof arg2 === 'object') {
    checkId = arg2.id;
    if (typeof arg3 === 'number') score = arg3;
    for (const k of KINGDOMS) {
      if ((k.sanityChecks || []).some((c) => c.id === checkId)) {
        kingdomId = k.id;
        break;
      }
    }
  }

  const req = SANITY_CHECK_REQUIREMENTS[checkId];

  // PRACTICE_ONLY checks can NEVER award certification XP!
  if (req?.classification === CHECK_CLASSIFICATION.PRACTICE_ONLY) {
    return {
      ...player,
      sanityCheckProgress: {
        ...(player.sanityCheckProgress || {}),
        [checkId]: {
          passed: true,
          certified: false,
          drilled: true,
          score: 0,
          isPracticeOnly: true,
          completedAt: new Date().toISOString(),
        },
      },
    };
  }

  const existing = player.sanityCheckProgress?.[checkId];
  if (existing?.certified && !existing?.stale) return player; // Already certified and current - no-op

  // If this check was previously certified and already awarded score XP, preserve it without duplicate award
  const alreadyAwardedScore = (existing?.score ?? 0) > 0;
  const scoreToAward = alreadyAwardedScore ? 0 : score;

  const updatedSanityProgress = {
    ...player.sanityCheckProgress,
    [checkId]: {
      passed: true,
      certified: true,
      stale: false,
      score: alreadyAwardedScore ? existing.score : score,
      completedAt: new Date().toISOString(),
    },
  };

  const updatedTotalXP = player.totalXP + scoreToAward;

  const kingdom = KINGDOMS.find((k) => k.id === kingdomId);
  const allSanityPassed = areAllKingdomSanityChecksPassed(
    { ...player, sanityCheckProgress: updatedSanityProgress },
    kingdomId
  );
  const allLevelsDone = areAllKingdomLevelsCompleted(player, kingdomId);

  let kingdomXPBonus = 0;
  const prevKingdomCompleted = player.kingdomProgress?.[kingdomId]?.completed;
  const prevBonusAwarded = player.kingdomProgress?.[kingdomId]?.bonusAwarded;
  if (allLevelsDone && allSanityPassed && !prevKingdomCompleted && !prevBonusAwarded) {
    kingdomXPBonus = 50;
  }

  const updatedKingdomProgress = {
    ...player.kingdomProgress,
    [kingdomId]: {
      completed: allLevelsDone && allSanityPassed,
      bonusAwarded: Boolean(prevBonusAwarded || kingdomXPBonus > 0),
      totalXP: (player.kingdomProgress?.[kingdomId]?.totalXP ?? 0) + scoreToAward + kingdomXPBonus,
    },
  };

  const updatedPlayer = {
    ...player,
    totalXP: updatedTotalXP + kingdomXPBonus,
    sanityCheckProgress: updatedSanityProgress,
    kingdomProgress: updatedKingdomProgress,
  };

  const newAchievements = checkAchievements(updatedPlayer);
  return { ...updatedPlayer, achievements: newAchievements };
}

/**
 * Check and unlock achievements based on player state.
 */
export function checkAchievements(player) {
  const current = player.achievements || [];
  const currentIds = new Set(
    current.map((a) => (typeof a === 'string' ? a : a.id))
  );
  const newAchievements = [...current];

  for (const ach of ACHIEVEMENTS) {
    if (currentIds.has(ach.id)) continue;
    if (typeof ach.condition === 'function' && ach.condition(player)) {
      newAchievements.push(ach.id);
    }
  }

  return newAchievements;
}
