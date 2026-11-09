/**
 * KingdomCard.jsx
 * ================
 * Reusable card component for the world map.
 * Renders differently based on kingdom status: locked / available / completed.
 * Shows stage level progress, sanity check side quest status, and unlock gates.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext.jsx';
import {
  getKingdomStatus,
  getKingdomXP,
  getKingdomSanityChecks,
  countPassedKingdomSanityChecks,
  areAllKingdomLevelsCompleted,
  areAllKingdomSanityChecksPassed,
} from '../../logic/progressionEngine.js';
import { KINGDOMS } from '../../data/kingdomsData.js';
import './KingdomCard.css';

export default function KingdomCard({ kingdom, isLast }) {
  const { player } = usePlayer();
  const status = getKingdomStatus(player, kingdom.id);
  const kingdomXP = getKingdomXP(player, kingdom.id);
  const totalLevels = kingdom.levels.length;
  const completedLevels = kingdom.levels.filter(
    (l) => player.levelProgress?.[l.id]?.completed
  ).length;

  const sanityChecks = getKingdomSanityChecks(kingdom.id);
  const passedSanityChecks = countPassedKingdomSanityChecks(player, kingdom.id);
  const totalSanityChecks = sanityChecks.length;

  // Calculate weighted progress (levels + sanity checks)
  const totalItems = totalLevels + totalSanityChecks;
  const completedItems = completedLevels + passedSanityChecks;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  // Find previous kingdom to determine precise lock reason
  const prevKingdom = KINGDOMS.find((k) => k.order === kingdom.order - 1);
  let lockReason = '';
  if (status === 'locked' && prevKingdom) {
    const prevLevelsDone = areAllKingdomLevelsCompleted(player, prevKingdom.id);
    const prevSanityPassed = areAllKingdomSanityChecksPassed(player, prevKingdom.id);
    const prevChecks = getKingdomSanityChecks(prevKingdom.id);
    const prevPassedChecks = countPassedKingdomSanityChecks(player, prevKingdom.id);
    const prevXP = getKingdomXP(player, prevKingdom.id);
    const xpShortage = Math.max(0, prevKingdom.pointsToUnlockNext - prevXP);

    if (!prevLevelsDone) {
      lockReason = `Finish all levels in ${prevKingdom.name} first`;
    } else if (!prevSanityPassed && prevChecks.length > 0) {
      lockReason = `Pass all ${prevChecks.length} ${prevKingdom.name} sanity checks (${prevPassedChecks}/${prevChecks.length} done)`;
    } else if (xpShortage > 0) {
      lockReason = `Earn ${xpShortage} more XP in ${prevKingdom.name}`;
    } else {
      lockReason = `Complete ${prevKingdom.name} requirements`;
    }
  }

  const cardContent = (
    <div
      className={`kingdom-card kingdom-card--${status}`}
      style={{
        '--card-border-color': kingdom.borderColor,
        '--card-glow': `${kingdom.borderColor}44`,
      }}
    >
      {/* Gradient top bar */}
      <div
        className="kingdom-card__top-bar"
        style={{ background: kingdom.gradient }}
      />

      {/* Order badge */}
      <div className="kingdom-card__order">{kingdom.order}</div>

      <div className="kingdom-card__header">
        <div
          className="kingdom-card__emoji-wrap"
          style={{ background: `${kingdom.borderColor}22` }}
        >
          {kingdom.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div className="kingdom-card__name">{kingdom.name}</div>
          <div className="kingdom-card__subtitle">{kingdom.subtitle}</div>
        </div>
        <div>
          {status === 'locked' && <span className="badge badge--locked">🔒 Locked</span>}
          {status === 'available' && <span className="badge badge--available">▶ Active</span>}
          {status === 'completed' && <span className="badge badge--completed">✓ Completed</span>}
        </div>
      </div>

      <p className="kingdom-card__description">{kingdom.description}</p>

      {/* Badges / Metrics */}
      <div className="kingdom-card__meta">
        <span>📚 {completedLevels}/{totalLevels} Levels</span>
        {totalSanityChecks > 0 && (
          <span className={`kingdom-card__sanity-badge ${passedSanityChecks === totalSanityChecks ? 'kingdom-card__sanity-badge--all' : ''}`}>
            🛡️ {passedSanityChecks}/{totalSanityChecks} Side Quests
          </span>
        )}
        <span>⭐ {kingdomXP} XP</span>
      </div>

      {/* Progress bar */}
      {status !== 'locked' && (
        <div className="kingdom-card__progress">
          <div className="kingdom-card__progress-label">
            <span>Stage Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-bar__fill ${status === 'completed' ? 'progress-bar__fill--green' : ''}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Locked hint */}
      {status === 'locked' && (
        <div className="kingdom-card__lock-text">
          🔒 {lockReason}
        </div>
      )}
    </div>
  );

  if (status === 'locked') {
    return <div style={{ position: 'relative' }}>{cardContent}</div>;
  }

  return (
    <Link to={`/kingdom/${kingdom.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative' }}>
      {cardContent}
    </Link>
  );
}
