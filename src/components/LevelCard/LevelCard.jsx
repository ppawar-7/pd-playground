/**
 * LevelCard.jsx
 * ==============
 * Reusable card for individual levels inside a kingdom.
 * Supports both Normal Game progression mode (locks, stars, requirements)
 * and Explore Everything Mode (instant open access, no locks).
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { getLevelStatus } from '../../logic/progressionEngine.js';
import { hasActivity } from '../../activities/activityRegistry.js';
import './LevelCard.css';

function Stars({ count, earned }) {
  return (
    <div className="level-card__stars">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`star ${i <= earned ? 'star--filled' : ''}`}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function LevelCard({ kingdom, level, isExploreMode = false }) {
  const { player } = usePlayer();
  const location = useLocation();
  const isExplore = Boolean(isExploreMode || location.pathname.startsWith('/explore'));

  const normalStatus = getLevelStatus(player, kingdom, level);
  const status = isExplore ? 'available' : normalStatus;
  const progress = player.levelProgress[level.id];
  const earnedStars = progress?.stars ?? 0;
  const isComingSoon = !hasActivity(level.id);

  const numberClass = `level-card__number level-card__number--${status}`;
  const cardClass = `level-card level-card--${status}`;

  const linkTarget = isExplore
    ? `/explore/kingdom/${kingdom.id}/level/${level.id}`
    : `/kingdom/${kingdom.id}/level/${level.id}`;

  const inner = (
    <>
      {/* Level number circle */}
      <div className={numberClass}>
        {!isExplore && status === 'locked' ? '🔒' : status === 'completed' ? '✓' : level.order}
      </div>

      {/* Title + description */}
      <div className="level-card__content">
        <div className="level-card__title">
          Level {level.order} — {level.title}
        </div>
        <div className="level-card__desc">{level.description}</div>
      </div>

      {/* Right: stars, XP, duration */}
      <div className="level-card__right">
        {!isExplore && status === 'completed' && <Stars count={3} earned={earnedStars} />}
        {status === 'available' && isComingSoon ? (
          <span className="level-card__coming-soon-badge">
            Unlocked — Coming Soon
          </span>
        ) : (
          <span className="level-card__xp">
            {isExplore ? `⭐ ${level.xpReward} XP` : `⭐ +${level.xpReward} XP`}
          </span>
        )}
        {!isExplore && status === 'locked' && level.pointsRequired > 0 && (
          <span className="level-card__lock-hint">Needs {level.pointsRequired} XP</span>
        )}
        <span className="level-card__duration">⏱ {level.duration}</span>
      </div>
    </>
  );

  if (!isExplore && status === 'locked') {
    return <div className={cardClass}>{inner}</div>;
  }

  return (
    <Link to={linkTarget} className={cardClass}>
      {inner}
    </Link>
  );
}
