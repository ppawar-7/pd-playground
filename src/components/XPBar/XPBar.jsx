/**
 * XPBar.jsx
 * ==========
 * Player XP / level progress display component.
 * Used on the dashboard and within the navbar area.
 */

import React from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import {
  computePlayerLevel,
  computeLevelProgress,
} from '../../logic/progressionEngine.js';
import './XPBar.css';

const LEVEL_NAMES = [
  'Circuit Novice', 'Gate Guardian', 'RTL Rider', 'Synthesis Sage',
  'Floor Architect', 'Placement Pro', 'Clock Keeper', 'Route Master',
  'Filler Wizard', 'Tape-Out Legend',
];

export default function XPBar() {
  const { player } = usePlayer();
  const level = computePlayerLevel(player.totalXP);
  const { current, required, percent } = computeLevelProgress(player.totalXP);
  const levelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)];

  return (
    <div className="xp-bar">
      <div className="xp-bar__header">
        <div className="xp-bar__level">
          <div className="xp-bar__level-badge">{level}</div>
          <div>
            <div className="xp-bar__level-label">Player Level</div>
            <div className="xp-bar__level-name">{levelName}</div>
          </div>
        </div>
        <div className="xp-bar__xp-display">
          <strong>{current}</strong> / {required} XP<br />
          <span>to next level</span>
        </div>
      </div>

      <div className="progress-bar">
        <div
          className="progress-bar__fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
