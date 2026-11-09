/**
 * SanityChecksPage.jsx
 * =====================
 * Standalone page for the 5 Sanity Check challenge categories.
 * Independent of the 8 main kingdoms.
 * Categories: Congestion, DRC, Connectivity, LVS, Timing.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { SANITY_CHECKS } from '../../data/kingdomsData.js';
import './SanityChecksPage.css';

export default function SanityChecksPage() {
  return (
    <div className="sanity-page">
      <div className="container">
        {/* Back link */}
        <div className="sanity-back">
          <Link to="/world-map" className="btn btn--ghost btn--sm">
            ← Back to World Map
          </Link>
        </div>

        {/* Header */}
        <div className="sanity-page__header">
          <span className="sanity-page__emoji">🔬</span>
          <h1 className="section-title">Sanity Check Challenges</h1>
          <p className="section-subtitle">
            Design verification challenges — test your understanding of critical ASIC sign-off checks.
          </p>
        </div>

        {/* Info box */}
        <div className="sanity-page__intro">
          <strong>What are Sanity Checks?</strong>
          <br /><br />
          Before a chip can be sent for fabrication, engineers run a series of critical
          verification checks to confirm the design is correct and manufacturable.
          <br /><br />
          These five challenge categories cover the most important verification concepts:
          <strong> Congestion, DRC, Connectivity, LVS, and Timing</strong>. They are
          independent of the main ASIC kingdom flow and may be connected to specific kingdoms
          in Phase 2 as additional boss challenges.
          <br /><br />
          <em>Full challenge content and interactive tools will be added in Phase 2.</em>
        </div>

        {/* Challenge grid */}
        <div className="sanity-page__grid">
          {SANITY_CHECKS.map((check) => (
            <div
              key={check.id}
              className={`sanity-card sanity-card--${check.locked ? 'locked' : 'unlocked'}`}
              onClick={() =>
                !check.locked &&
                alert(
                  `🔬 ${check.name} Challenge\n\nInteractive challenge content will be implemented in Phase 2.\n\nThis category covers: ${check.description}`
                )
              }
            >
              {/* Gradient top bar */}
              <div
                className="sanity-card__gradient-bar"
                style={{ background: check.gradient }}
              />

              <span className="sanity-card__icon">{check.emoji}</span>
              <h2 className="sanity-card__name">{check.name}</h2>
              <p className="sanity-card__desc">{check.description}</p>

              <div className="sanity-card__status">
                {check.locked ? (
                  <span className="badge badge--locked">🔒 Coming Soon</span>
                ) : (
                  <span className="badge badge--available">▶ Available</span>
                )}
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Phase 2
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Phase 2 note */}
        <div className="sanity-card__placeholder-note">
          <p>
            🚧 <strong>Phase 2 Development</strong>: Each sanity check category will
            contain interactive challenges including visual DRC error identification,
            congestion heatmap analysis, LVS mismatch debugging, and timing path tracing.
          </p>
        </div>
      </div>
    </div>
  );
}
