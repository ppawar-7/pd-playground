/**
 * DashboardPage.jsx
 * ==================
 * Player dashboard showing XP, progress, achievements, and kingdom status.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext.jsx';
import XPBar from '../../components/XPBar/XPBar.jsx';
import {
  computePlayerLevel,
  computeOverallProgress,
  countKingdomsUnlocked,
  countLevelsCompleted,
  countTotalSanityChecksPassed,
  countTotalSanityChecks,
  countPassedKingdomSanityChecks,
  getKingdomStatus,
  getKingdomXP,
} from '../../logic/progressionEngine.js';
import { KINGDOMS } from '../../data/kingdomsData.js';
import { ACHIEVEMENTS } from '../../data/playerDefaults.js';
import './DashboardPage.css';

export default function DashboardPage() {
  const { player, resetProgress } = usePlayer();
  const [confirmReset, setConfirmReset] = useState(false);

  const playerLevel = computePlayerLevel(player.totalXP);
  const overallProgress = computeOverallProgress(player);
  const kingdomsUnlocked = countKingdomsUnlocked(player);
  const levelsCompleted = countLevelsCompleted(player);
  const totalLevels = KINGDOMS.reduce((s, k) => s + k.levels.length, 0);
  const passedSanity = countTotalSanityChecksPassed(player);
  const totalSanity = countTotalSanityChecks();

  const STATS = [
    { emoji: '⭐', value: player.totalXP, label: 'Total XP' },
    { emoji: '🎖️', value: playerLevel, label: 'Player Level' },
    { emoji: '🏰', value: `${kingdomsUnlocked}/8`, label: 'Kingdoms Unlocked' },
    { emoji: '✅', value: `${levelsCompleted}/${totalLevels}`, label: 'Levels Done' },
    { emoji: '🛡️', value: `${passedSanity}/${totalSanity}`, label: 'Sanity Checks' },
    { emoji: '🏆', value: player.achievements.length, label: 'Achievements' },
  ];

  const handleReset = () => {
    if (confirmReset) {
      resetProgress();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 5000);
    }
  };

  // Find first incomplete level across all kingdoms
  const findContinueTarget = () => {
    for (const kingdom of KINGDOMS) {
      const status = getKingdomStatus(player, kingdom.id);
      if (status === 'locked') continue;
      for (const level of kingdom.levels) {
        if (!player.levelProgress?.[level.id]?.completed) {
          return `/kingdom/${kingdom.id}`;
        }
      }
    }
    return '/world-map';
  };

  return (
    <div className="dashboard">
      <div className="container">
        {/* Header */}
        <div className="dashboard__header">
          <div>
            <p className="dashboard__greeting">Welcome back,</p>
            <h1 className="dashboard__name">
              <span className="dashboard__name-emoji">{player.avatarEmoji}</span>
              {player.name}
            </h1>
          </div>
          <Link to={findContinueTarget()} className="btn btn--primary">
            ▶ Continue Learning
          </Link>
        </div>

        {/* XP Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <XPBar />
        </div>

        {/* Stats */}
        <div className="dashboard__stats">
          {STATS.map((s) => (
            <div key={s.label} className="stat-card">
              <span className="stat-card__emoji">{s.emoji}</span>
              <div className="stat-card__value">{s.value}</div>
              <div className="stat-card__label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="dashboard__grid">
          {/* Overall Progress */}
          <div className="card">
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>
              📈 Overall Progress
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Your journey through the complete ASIC flow (Levels &amp; Sanity Checks)
            </p>
            <div className="dashboard__overall-bar">
              <div className="dashboard__overall-label">
                <span>Total Completion</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="progress-bar" style={{ height: '14px' }}>
                <div
                  className="progress-bar__fill"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            {/* Per-kingdom progress */}
            <div className="kingdom-progress-list" style={{ marginTop: '1.5rem' }}>
              {KINGDOMS.map((k) => {
                const kStatus = getKingdomStatus(player, k.id);
                const kXP = getKingdomXP(player, k.id);
                const completed = k.levels.filter(
                  (l) => player.levelProgress?.[l.id]?.completed
                ).length;
                const totalSanityInK = k.sanityChecks?.length || 0;
                const passedSanityInK = countPassedKingdomSanityChecks(player, k.id);

                const totalInK = k.levels.length + totalSanityInK;
                const doneInK = completed + passedSanityInK;
                const pct = Math.round((doneInK / totalInK) * 100);

                return (
                  <div key={k.id} className="kingdom-progress-item">
                    <span className="kingdom-progress-item__emoji">
                      {kStatus === 'locked' ? '🔒' : k.emoji}
                    </span>
                    <div className="kingdom-progress-item__info">
                      <div className="kingdom-progress-item__name">
                        {k.name}
                        {totalSanityInK > 0 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.4rem', fontWeight: 600 }}>
                            (🛡️ {passedSanityInK}/{totalSanityInK})
                          </span>
                        )}
                      </div>
                      <div className="progress-bar" style={{ height: '6px' }}>
                        <div
                          className={`progress-bar__fill ${kStatus === 'completed' ? 'progress-bar__fill--green' : ''}`}
                          style={{ width: `${kStatus === 'locked' ? 0 : pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="kingdom-progress-item__xp">
                      {kStatus === 'locked' ? '🔒' : `${kXP} XP`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements */}
          <div className="card">
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>
              🏆 Achievements
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              {player.achievements.length} / {ACHIEVEMENTS.length} earned
            </p>
            <div className="achievements">
              {ACHIEVEMENTS.map((ach) => {
                const earned = player.achievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`achievement-badge ${earned ? 'achievement-badge--earned' : 'achievement-badge--locked'}`}
                    title={ach.description}
                  >
                    <span className="achievement-badge__emoji">{ach.emoji}</span>
                    <span className="achievement-badge__name">{ach.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dev: Reset Progress */}
        <div className="card dashboard__reset">
          <div>
            <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>🔧 Developer Tools</p>
            <p className="dashboard__reset-text">
              Reset all progress to test the unlocking system and sanity checks from scratch.
            </p>
          </div>
          <button
            className="btn btn--danger btn--sm"
            onClick={handleReset}
          >
            {confirmReset ? '⚠️ Confirm Reset?' : '🗑 Reset Progress'}
          </button>
        </div>
      </div>
    </div>
  );
}
