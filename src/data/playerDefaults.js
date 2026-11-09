/**
 * playerDefaults.js
 * ==================
 * Default player state used when no saved progress exists.
 * Also defines the shape of the player state object.
 */

export const DEFAULT_PLAYER = {
  name: 'Student Explorer',
  avatarEmoji: '🧑‍💻',
  totalXP: 0,
  // Map of levelId -> { completed, stars, xpEarned }
  levelProgress: {},
  // Map of kingdomId -> { completed, totalXP }
  kingdomProgress: {},
  // Map of sanityCheckId -> { passed, completedAt, score }
  sanityCheckProgress: {},
  // Achievement badge IDs earned
  achievements: [],
  createdAt: null,
  lastPlayedAt: null,
};

/**
 * Achievement definitions (unlocked by earning certain milestones).
 */
export const ACHIEVEMENTS = [
  {
    id: 'first-level',
    name: 'First Step',
    emoji: '👣',
    description: 'Complete your very first level.',
    condition: (player) => Object.keys(player.levelProgress || {}).length >= 1,
  },
  {
    id: 'first-signoff',
    name: 'First Sign-Off',
    emoji: '🛡️',
    description: 'Pass your first Sanity Check side quest!',
    condition: (player) =>
      Object.values(player.sanityCheckProgress || {}).some((c) => c.passed),
  },
  {
    id: 'signoff-specialist',
    name: 'Sign-Off Specialist',
    emoji: '🔬',
    description: 'Pass 5 Sanity Check side quests across any kingdom.',
    condition: (player) =>
      Object.values(player.sanityCheckProgress || {}).filter((c) => c.passed).length >= 5,
  },
  {
    id: 'rtl-master',
    name: 'RTL Master',
    emoji: '🧩',
    description: 'Complete the RTL Understanding Kingdom.',
    condition: (player) => Boolean(player.kingdomProgress?.['rtl-understanding']?.completed),
  },
  {
    id: 'synthesizer',
    name: 'Synthesizer',
    emoji: '⚗️',
    description: 'Complete the Synthesis Kingdom.',
    condition: (player) => Boolean(player.kingdomProgress?.['synthesis']?.completed),
  },
  {
    id: 'xp-100',
    name: 'XP Rookie',
    emoji: '⭐',
    description: 'Earn 100 total XP.',
    condition: (player) => (player.totalXP ?? 0) >= 100,
  },
  {
    id: 'xp-500',
    name: 'XP Hero',
    emoji: '🌟',
    description: 'Earn 500 total XP.',
    condition: (player) => (player.totalXP ?? 0) >= 500,
  },
  {
    id: 'all-stars',
    name: 'Star Collector',
    emoji: '💫',
    description: 'Earn at least 1 star on 10 different levels.',
    condition: (player) =>
      Object.values(player.levelProgress || {}).filter((lp) => lp.stars >= 1).length >= 10,
  },
  {
    id: 'tape-out',
    name: 'Tape-Out!',
    emoji: '💾',
    description: 'Complete the GDS Kingdom — you have finished the ASIC flow!',
    condition: (player) => Boolean(player.kingdomProgress?.['gds']?.completed),
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    emoji: '👑',
    description: 'Complete all 8 kingdoms across the entire ASIC design flow.',
    condition: (player) =>
      ['rtl-understanding', 'synthesis', 'floorplanning', 'placement', 'cts', 'routing', 'filler-cells', 'gds'].every(
        (kId) => player.kingdomProgress?.[kId]?.completed
      ),
  },
];
