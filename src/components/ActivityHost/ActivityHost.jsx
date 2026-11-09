/**
 * ActivityHost.jsx
 * ================
 * Dynamic host container that mounts the registered interactive learning activity
 * for a level, or gracefully falls back to an informational coming-soon state
 * for unimplemented levels.
 *
 * Prevents unearned XP awards and eliminates fake completion paths.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { getActivity } from '../../activities/activityRegistry.js';
import './ActivityHost.css';

export default function ActivityHost({ level, kingdom, onVerify, alreadyCompleted }) {
  const activityDescriptor = getActivity(level.id);

  // If a registered activity exists (e.g. Level 1 rtl-1)
  if (activityDescriptor && activityDescriptor.component) {
    const ActivityComponent = activityDescriptor.component;
    return (
      <div className="activity-host">
        <ActivityComponent
          level={level}
          kingdom={kingdom}
          onVerify={onVerify}
          alreadyCompleted={alreadyCompleted}
        />
      </div>
    );
  }

  // Fallback for unimplemented levels (Phase 2+): Non-rewarding informational card
  return (
    <div className="activity-host">
      <div className="activity-coming-soon">
        <div className="activity-coming-soon__badge-row">
          <span className="badge badge--coming-soon">✨ Unlocked — Challenge Coming Soon</span>
        </div>
        <div className="activity-coming-soon__icon">🛠️</div>
        <h3 className="activity-coming-soon__title">
          Level {level.order} — {level.title}
        </h3>
        <p className="activity-coming-soon__desc">
          You have unlocked access to this stage! The dedicated interactive engineering challenge
          for <strong>{level.title}</strong> is currently being authored for the upcoming milestone.
        </p>

        <div className="activity-coming-soon__syllabus">
          <h4 className="activity-coming-soon__syllabus-title">Curriculum Objectives for this Stage:</h4>
          <p className="activity-coming-soon__syllabus-text">{level.description}</p>
        </div>

        <div className="activity-coming-soon__notice">
          ℹ️ <strong>Mastery Verification Pending:</strong> XP (+{level.xpReward} XP) and star badges are awarded only upon completing the verified simulator challenge when published. No unearned credit is granted.
        </div>

        <div className="activity-coming-soon__links">
          <Link to={`/kingdom/${kingdom.id}`} className="btn btn--primary">
            ← Return to {kingdom.name}
          </Link>
          {kingdom.id === 'rtl-understanding' && (
            <a
              href="https://ppawar-7.github.io/rtl-playground/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary"
            >
              Optional: Explore Standalone RTL Playground ↗
            </a>
          )}
          {(kingdom.id === 'cts' || kingdom.id === 'synthesis') && (
            <a
              href="https://ppawar-7.github.io/sta-playground/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary"
            >
              Optional: Explore Standalone STA Playground ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
