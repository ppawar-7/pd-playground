/**
 * LevelPage.jsx
 * ==============
 * Reusable level learning template.
 * Streamlined single-view structure with registered activity hosting.
 *
 * Data-driven: reads kingdom + level from URL params and kingdomsData.js.
 * Supports both Normal Game progression mode (locks, stars, XP mutation)
 * and Explore Everything Mode (instant open access, no XP mutation, ephemeral feedback).
 */

import React, { useState } from 'react';
import { useParams, Link, Navigate, useLocation } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext.jsx';
import {
  isLevelUnlocked,
} from '../../logic/progressionEngine.js';
import { KINGDOMS } from '../../data/kingdomsData.js';
import { EXPANDED_LESSONS } from '../../activities/floorplanning/expanded/fpExpandedCurriculumData.js';
import ActivityHost from '../../components/ActivityHost/ActivityHost.jsx';
import { hasActivity } from '../../activities/activityRegistry.js';
import './LevelPage.css';

// ─── Stars display ────────────────────────────────────────────────────────────
function StarDisplay({ stars }) {
  return (
    <div className="level-page__complete-stars">
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ opacity: i <= stars ? 1 : 0.25 }}>⭐</span>
      ))}
    </div>
  );
}

export default function LevelPage({ isExploreMode = false }) {
  const { kingdomId, levelId } = useParams();
  const location = useLocation();
  const { player, completeLevel } = usePlayer();

  const isExplore = Boolean(isExploreMode || location.pathname.startsWith('/explore'));

  // Find kingdom and level
  const kingdom = KINGDOMS.find((k) => k.id === kingdomId);
  let level = kingdom?.levels.find((l) => l.id === levelId);

  // Fallback for Floorplanning 2.0 expanded lessons (fp-6 to fp-24)
  const expandedIds = Object.keys(EXPANDED_LESSONS);
  const coreLevelCount = kingdom?.levels.length || 0;
  const toExpandedLevel = (id) => {
    const exp = EXPANDED_LESSONS[id];
    return {
      id: exp.id,
      name: exp.title,
      title: exp.title,
      description: exp.description,
      xpReward: exp.xpReward || 35,
      starThresholds: exp.starThresholds,
      duration: exp.duration || '~10 min',
      module: exp.module,
      order: coreLevelCount + expandedIds.indexOf(id) + 1,
      isExpanded: true,
    };
  };
  if (!level && kingdomId === 'floorplanning' && EXPANDED_LESSONS[levelId]) {
    level = toExpandedLevel(levelId);
  }

  // States
  const [showHint, setShowHint] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [showStudioModal, setShowStudioModal] = useState(false);

  if (!kingdom || !level) {
    return <Navigate to={isExplore ? "/explore" : "/world-map"} replace />;
  }

  const isUnlocked = isExplore || level.isExpanded || isLevelUnlocked(player, kingdom, level);
  const isCompleted = player.levelProgress?.[level.id]?.completed ?? false;
  const currentLevelXP = player.levelProgress?.[level.id]?.xpEarned ?? 0;
  const currentLevelStars = player.levelProgress?.[level.id]?.stars ?? 0;

  // Enforce access control in Normal Game mode
  if (!isUnlocked && !isExplore) {
    return (
      <div className="level-page">
        <div className="container" style={{ paddingTop: '4rem' }}>
          <div className="level-page__locked-banner">
            <span style={{ fontSize: '3rem' }}>🔒</span>
            <h2>Level Locked</h2>
            <p>
              Complete the previous level in <strong>{kingdom.name}</strong> to unlock this challenge.
            </p>
            <Link to={`/kingdom/${kingdom.id}`} className="btn btn--primary">
              Return to {kingdom.name}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const alreadyCompleted = !isExplore && isCompleted;

  // Called when student passes an activity via ActivityHost
  const handleActivityVerify = (result) => {
    if (!result || !result.passed) {
      return;
    }

    if (isExplore) {
      // Explore Mode: Ephemeral simulation feedback ONLY. NEVER mutate PlayerContext or award XP!
      setCompletionData({
        score: result.score,
        stars: result.stars,
        xpEarned: 0,
        feedback: result.feedback || 'Simulation Completed — Explore Mode (Practice Result — No XP Awarded)',
        isExplore: true,
      });
      return;
    }

    // Normal Game: Persist verified progress and XP delta
    const verifiedScore = Math.min(result.score, level.xpReward);
    const xpDelta = Math.max(0, verifiedScore - currentLevelXP);

    const artifactToPersist = result.artifacts || result.designData || {};
    completeLevel(kingdom.id, level, verifiedScore, artifactToPersist);

    setCompletionData({
      score: verifiedScore,
      stars: result.stars,
      xpEarned: xpDelta,
      feedback: result.feedback,
      isExplore: false,
    });
  };

  // Find adjacent levels for navigation
  // Expanded Floorplanning lessons (fp-6 … fp-24) continue the sequence after the core levels.
  let prevLevel = kingdom.levels.find((l) => l.order === level.order - 1);
  let nextLevel = kingdom.levels.find((l) => l.order === level.order + 1);
  if (level.isExpanded) {
    const idx = expandedIds.indexOf(level.id);
    prevLevel = idx > 0 ? toExpandedLevel(expandedIds[idx - 1]) : kingdom.levels[kingdom.levels.length - 1];
    nextLevel = idx < expandedIds.length - 1 ? toExpandedLevel(expandedIds[idx + 1]) : null;
  }
  const totalLessons = kingdom.id === 'floorplanning' ? coreLevelCount + expandedIds.length : coreLevelCount;
  const nextKingdom = KINGDOMS.find((k) => k.order === kingdom.order + 1);

  // Show full completion overlay when completed
  if (completionData) {
    return (
      <div className="level-page">
        <div className="container" style={{ paddingTop: '4rem' }}>
          <div className="level-page__complete-banner">
            <span className="level-page__complete-emoji">{isExplore ? '🧭' : '🎉'}</span>
            <h2 className="level-page__complete-title">
              {isExplore ? 'Simulation Completed — Explore Mode' : 'Level Complete!'}
            </h2>
            <p className="level-page__complete-xp">
              {isExplore
                ? `Score: ${completionData.score}/${level.xpReward} · Practice Result — No XP Awarded (Normal Game progress unchanged)`
                : completionData.xpEarned > 0
                ? `+${completionData.xpEarned} XP Verified & Earned`
                : `Score Verified: ${completionData.score}/${level.xpReward} XP (Already Earned)`}
            </p>
            <StarDisplay stars={completionData.stars} />

            <p style={{ color: 'var(--color-text-muted)', maxWidth: 500, margin: '1rem auto' }}>
              {completionData.feedback}
            </p>

            <div className="level-page__complete-buttons">
              {nextLevel && (
                <Link
                  to={isExplore ? `/explore/kingdom/${kingdom.id}/level/${nextLevel.id}` : `/kingdom/${kingdom.id}/level/${nextLevel.id}`}
                  className="btn btn--primary btn--lg"
                  onClick={() => setCompletionData(null)}
                >
                  ▶ Next Level: {nextLevel.title}
                </Link>
              )}
              <Link
                to={isExplore ? `/explore/kingdom/${kingdom.id}` : `/kingdom/${kingdom.id}`}
                className="btn btn--secondary btn--lg"
              >
                🏰 Return to {kingdom.name}
              </Link>
              {isExplore && (
                <Link to="/explore" className="btn btn--ghost">
                  🧭 Full Explore Catalog
                </Link>
              )}
              {!isExplore && !nextLevel && nextKingdom && (
                <Link
                  to={`/kingdom/${nextKingdom.id}`}
                  className="btn btn--secondary btn--lg"
                  onClick={() => setCompletionData(null)}
                >
                  👑 Next Kingdom: {nextKingdom.name} →
                </Link>
              )}
              {!isExplore && !nextLevel && !nextKingdom && (
                <Link to="/world-map" className="btn btn--primary btn--lg">
                  🏆 View World Map Completion
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="level-page"
      style={{
        '--kingdom-gradient': kingdom.gradient,
        '--kingdom-color': kingdom.borderColor,
      }}
    >
      {/* Top Banner / Breadcrumb */}
      <div className="level-page__header">
        <div className="container level-page__header-inner">
          <Link
            to={isExplore ? `/explore/kingdom/${kingdom.id}` : `/kingdom/${kingdom.id}`}
            className="level-page__back"
          >
            ← Back to {kingdom.name}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Level badge */}
            <div className="level-page__badge">
              <span style={{ fontSize: '1.25rem' }}>{kingdom.emoji}</span>
              <span>
                {kingdom.id === 'floorplanning'
                  ? `Lesson ${level.order} of 36 · Module ${level.module || 1}`
                  : (level.isExpanded
                    ? `Lesson ${level.order} of ${totalLessons} · Module ${level.module}`
                    : `Level ${level.order} of ${kingdom.levels.length}`)}
              </span>
            </div>

            {/* Stars if completed in normal mode */}
            {!isExplore && alreadyCompleted && (
              <div className="level-page__stars">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`star ${i <= currentLevelStars ? 'star--filled' : ''}`}
                    style={{ fontSize: '1.5rem' }}
                  >★</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        {/* Explore Mode Notification Banner */}
        {isExplore && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.6rem',
              fontSize: '0.86rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🧭</span>
              <div>
                <strong>Explore Mode Active:</strong> Free practice sandbox. Interactive simulations run ephemerally. Normal Game progress and XP are not modified.
              </div>
            </div>
            <Link to="/explore" className="btn btn--ghost btn--sm" style={{ color: '#1d4ed8' }}>
              Full Catalog ›
            </Link>
          </div>
        )}

        {!isExplore && alreadyCompleted && (
          <div className="level-page__feedback level-page__feedback--info" style={{ marginBottom: '1.5rem' }}>
            ✅ You have certified completion on this level ({currentLevelXP} XP, {currentLevelStars} Stars)! You can practice again to improve your score.
          </div>
        )}

        {/* Level Overview & Concept */}
        <div className="card level-page__concept-card">
          <div className="level-page__concept-header">
            <div>
              <span className="badge badge--available" style={{ marginBottom: '0.5rem' }}>
                {kingdom.name} · Level {level.order}
              </span>
              <h2 style={{ fontSize: '1.3rem', margin: '0.25rem 0' }}>{level.title}</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                {level.description}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Challenge & Learning Activity Area */}
        <div className="card level-page__activity-card">
          <div className="level-page__activity-header">
            <span className="level-page__activity-badge">⚔️ Verified Engineering Challenge</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {isExplore
                ? `Explore Sandbox Exercise (${level.xpReward} XP nominal value)`
                : `Demonstrate mastery to earn up to ${level.xpReward} XP`}
            </span>
          </div>

          <ActivityHost
            level={level}
            kingdom={kingdom}
            onVerify={handleActivityVerify}
            alreadyCompleted={alreadyCompleted}
          />
        </div>

        {/* Previous / Next Level Navigation Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {prevLevel ? (
            <Link
              to={isExplore ? `/explore/kingdom/${kingdom.id}/level/${prevLevel.id}` : `/kingdom/${kingdom.id}/level/${prevLevel.id}`}
              className="btn btn--secondary btn--sm"
            >
              ‹ Previous: {prevLevel.title}
            </Link>
          ) : (
            <Link
              to={isExplore ? `/explore/kingdom/${kingdom.id}` : `/kingdom/${kingdom.id}`}
              className="btn btn--ghost btn--sm"
            >
              ← {kingdom.name} Overview
            </Link>
          )}

          {nextLevel ? (
            <Link
              to={isExplore ? `/explore/kingdom/${kingdom.id}/level/${nextLevel.id}` : `/kingdom/${kingdom.id}/level/${nextLevel.id}`}
              className="btn btn--primary btn--sm"
            >
              Next: {nextLevel.title} ›
            </Link>
          ) : (
            <Link
              to={isExplore ? `/explore/kingdom/${kingdom.id}` : `/kingdom/${kingdom.id}`}
              className="btn btn--primary btn--sm"
            >
              🏰 Finish {kingdom.name} ›
            </Link>
          )}
        </div>

        {/* Quick Assistance / Hint */}
        <div className="level-page__hint-box">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setShowHint(!showHint)}
          >
            {showHint ? '🙈 Hide Hint' : '💡 Need a Hint?'}
          </button>

          {showHint && (
            <div className="card level-page__hint-content">
              <p style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#b45309' }}>
                💡 Key Hint for {level.title}:
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Analyze the engineering specifications carefully. Verify all required parameters, pin assignments, or logic states before submitting to achieve full certification!
              </p>
            </div>
          )}
        </div>

        {/* Standalone Lab Studio Bridge */}
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.86rem', color: '#94a3b8' }}>
              {kingdom.id === 'rtl-understanding' && (
                <>
                  <strong style={{ color: '#f1f5f9' }}>⚡ RTL Studio Companion:</strong> Open-ended circuit simulator with live waveforms and Verilog generation.
                </>
              )}
              {(kingdom.id === 'synthesis' || kingdom.id === 'placement' || kingdom.id === 'cts' || kingdom.id === 'routing') && (
                <>
                  <strong style={{ color: '#f1f5f9' }}>⏱️ STA Studio Companion:</strong> Multi-corner timing graph analyzer with setup/hold slack path tracing.
                </>
              )}
              {(kingdom.id === 'floorplanning' || kingdom.id === 'filler-cells' || kingdom.id === 'gds') && (
                <>
                  <strong style={{ color: '#f1f5f9' }}>🛡️ Physical Design Sign-Off:</strong> Complete this level to generate verified layout parameters for stage sanity checks!
                </>
              )}
            </div>

            {(kingdom.id === 'rtl-understanding' || kingdom.id === 'synthesis' || kingdom.id === 'placement' || kingdom.id === 'cts' || kingdom.id === 'routing') && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setShowStudioModal(true)}
                >
                  ⚡ Open Studio Companion
                </button>
                <Link
                  to={isExplore ? (kingdom.id === 'rtl-understanding' ? '/studio/rtl?from=explore' : `/studio/sta?stage=${kingdom.id}&from=explore`) : (kingdom.id === 'rtl-understanding' ? '/studio/rtl' : `/studio/sta?stage=${kingdom.id}`)}
                  className="btn btn--ghost btn--sm"
                >
                  🖥️ Full Studio
                </Link>
                <a
                  href={kingdom.id === 'rtl-understanding' ? 'https://ppawar-7.github.io/rtl-playground/' : 'https://ppawar-7.github.io/sta-playground/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--ghost btn--sm"
                  style={{ color: '#38bdf8' }}
                >
                  External ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Studio Companion Modal */}
      {showStudioModal && (
        <div className="sanity-modal-overlay" onClick={() => setShowStudioModal(false)}>
          <div className="sanity-modal" style={{ maxWidth: '1100px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="sanity-modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.6rem' }}>{kingdom.id === 'rtl-understanding' ? '⚡' : '⏱️'}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                    {kingdom.id === 'rtl-understanding' ? 'RTL Playground Studio Companion' : 'STA Timing Studio Companion'}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {kingdom.name} · Level {level.order}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="sanity-modal__close"
                onClick={() => setShowStudioModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="sanity-modal__body" style={{ padding: 0 }}>
              <iframe
                src={kingdom.id === 'rtl-understanding' ? `${(import.meta.env.BASE_URL || '/').replace(/\/+$/, '')}/studios/rtl/index.html` : `${(import.meta.env.BASE_URL || '/').replace(/\/+$/, '')}/studios/sta/index.html`}
                title="Studio Companion"
                style={{ width: '100%', height: '650px', border: 'none', display: 'block', background: '#050811' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
