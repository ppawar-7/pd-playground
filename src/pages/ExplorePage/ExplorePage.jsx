/**
 * ExplorePage.jsx
 * ===============
 * Completely separate, fully unlocked Explore Everything catalog.
 * Provides immediate zero-friction access to:
 * - All 8 ASIC Kingdoms
 * - All 40 Interactive Lessons
 * - All 26 Stage Sanity Check Terminals
 * - Embedded RTL and STA Studios
 *
 * Strict Non-Mutation Guarantee:
 * Actions taken in Explore Mode never mutate Normal Game player progress,
 * award XP, unlock achievements, or overwrite student design artifacts.
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { KINGDOMS } from '../../data/kingdomsData.js';
import { SANITY_CHECK_REQUIREMENTS } from '../../logic/studentDesignContext.js';
import { CHECK_CLASSIFICATION } from '../../logic/designArtifactContracts.js';
import { hasActivity } from '../../activities/activityRegistry.js';
import { FEATURED_EXPERIENCES } from '../../config/featureScope.js';
import './ExplorePage.css';

export default function ExplorePage() {
  const [selectedKingdomId, setSelectedKingdomId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'catalog'

  // Filter kingdoms based on selection
  const filteredKingdoms = useMemo(() => {
    if (selectedKingdomId === 'all') return KINGDOMS;
    return KINGDOMS.filter((k) => k.id === selectedKingdomId);
  }, [selectedKingdomId]);

  // Flattened lessons for search
  const allLessons = useMemo(() => {
    const list = [];
    for (const kingdom of KINGDOMS) {
      for (const level of kingdom.levels) {
        list.push({
          ...level,
          kingdomId: kingdom.id,
          kingdomName: kingdom.name,
          kingdomEmoji: kingdom.emoji,
          kingdomBorderColor: kingdom.borderColor,
          hasSim: hasActivity(level.id),
        });
      }
    }
    return list;
  }, []);

  // Filter lessons based on search query and kingdom filter
  const filteredLessons = useMemo(() => {
    let result = allLessons;
    if (selectedKingdomId !== 'all') {
      result = result.filter((l) => l.kingdomId === selectedKingdomId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q) ||
          l.kingdomName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allLessons, selectedKingdomId, searchQuery]);

  return (
    <div className="explore-page">
      {/* ─── HERO HEADER ──────────────────────────────────────────────── */}
      <section className="explore-header">
        <div className="container">
          <div className="explore-header__badge-row">
            <span className="explore-badge explore-badge--unlocked">
              🧭 Unlocked Sandbox Mode
            </span>
            <span className="explore-badge explore-badge--isolated">
              🔒 100% Isolated — Zero Progress Mutation
            </span>
          </div>

          <h1 className="explore-header__title">
            PD Playground — <span className="explore-header__highlight">Explore Everything</span>
          </h1>
          <p className="explore-header__subtitle">
            Browse the complete ASIC physical design journey freely. All 8 kingdoms, 40 interactive lessons,
            26 stage checks, and embedded EDA studios are open immediately without progression locks or XP requirements.
          </p>

          {/* Quick Access Action Bar */}
          <div className="explore-actions">
            <Link to="/world-map" className="btn btn--primary">
              🎮 Return to Normal Game
            </Link>
            {FEATURED_EXPERIENCES.map((exp) => (
              <Link
                key={exp.id}
                to={`${exp.studioRoute}?from=explore`}
                className="btn btn--secondary"
                data-testid={`explore-${exp.id}-studio`}
              >
                {exp.emoji} {exp.title}
              </Link>
            ))}
          </div>

          {/* Metric Counter Bar */}
          <div className="explore-stats-bar">
            <div className="explore-stat">
              <span className="explore-stat__num">8</span>
              <span className="explore-stat__label">ASIC Kingdoms</span>
            </div>
            <div className="explore-stat">
              <span className="explore-stat__num">40</span>
              <span className="explore-stat__label">Interactive Lessons</span>
            </div>
            <div className="explore-stat">
              <span className="explore-stat__num">26</span>
              <span className="explore-stat__label">Sanity Check Terminals</span>
            </div>
            <div className="explore-stat">
              <span className="explore-stat__num">15 / 11</span>
              <span className="explore-stat__label">Certifiable / Drills</span>
            </div>
            <div className="explore-stat">
              <span className="explore-stat__num">2</span>
              <span className="explore-stat__label">Embedded EDA Studios</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FILTER & SEARCH TOOLBAR ─────────────────────────────────── */}
      <div className="container explore-toolbar">
        <div className="explore-search-wrap">
          <span className="explore-search-icon">🔍</span>
          <input
            type="text"
            className="explore-search-input"
            placeholder="Search all 40 lessons by concept, algorithm, or title (e.g. Elmore, DRC, CTS, Skew, Filler)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="explore-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="explore-view-toggle">
          <button
            className={`btn btn--sm ${viewMode === 'grid' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setViewMode('grid')}
          >
            🏰 Kingdom Grid
          </button>
          <button
            className={`btn btn--sm ${viewMode === 'catalog' ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setViewMode('catalog')}
          >
            📚 Full Lesson Catalog ({filteredLessons.length})
          </button>
        </div>
      </div>

      {/* Kingdom Filter Chips */}
      <div className="container explore-filter-chips">
        <button
          className={`explore-chip ${selectedKingdomId === 'all' ? 'explore-chip--active' : ''}`}
          onClick={() => setSelectedKingdomId('all')}
        >
          🌐 All Kingdoms (8)
        </button>
        {KINGDOMS.map((k) => (
          <button
            key={k.id}
            className={`explore-chip ${selectedKingdomId === k.id ? 'explore-chip--active' : ''}`}
            onClick={() => setSelectedKingdomId(k.id)}
          >
            <span>{k.emoji}</span> {k.name}
          </button>
        ))}
      </div>

      {/* ─── VIEW 1: EIGHT KINGDOM CARDS GRID ───────────────────────── */}
      {viewMode === 'grid' && (
        <section className="container explore-kingdoms-grid">
          {filteredKingdoms.map((k) => {
            const certifiableCount = (k.sanityChecks || []).filter(
              (c) =>
                SANITY_CHECK_REQUIREMENTS[c.id]?.classification ===
                CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK
            ).length;
            const practiceCount = (k.sanityChecks || []).length - certifiableCount;

            return (
              <div
                key={k.id}
                className="explore-kingdom-card"
                style={{
                  '--card-gradient': k.gradient,
                  '--card-border': k.borderColor,
                }}
              >
                {/* Header */}
                <div className="explore-kingdom-card__header">
                  <div className="explore-kingdom-card__icon">{k.emoji}</div>
                  <div className="explore-kingdom-card__meta">
                    <span className="explore-kingdom-card__stage">
                      Stage {k.order}: {k.subconcept}
                    </span>
                    <h2 className="explore-kingdom-card__name">{k.name}</h2>
                  </div>
                </div>

                <p className="explore-kingdom-card__subtitle">{k.subtitle}</p>
                <p className="explore-kingdom-card__desc">{k.description}</p>

                {/* Studio quick jump if relevant */}
                {k.id === 'rtl-understanding' && (
                  <div className="explore-kingdom-card__studio-badge">
                    <Link to="/studio/rtl?from=explore">
                      ⚡ Embedded RTL Playground Studio Available ›
                    </Link>
                  </div>
                )}
                {(k.id === 'synthesis' || k.id === 'placement' || k.id === 'cts' || k.id === 'routing') && (
                  <div className="explore-kingdom-card__studio-badge">
                    <Link to={`/studio/sta?stage=${k.id}&from=explore`}>
                      ⏱️ Embedded STA Playground Studio Available ›
                    </Link>
                  </div>
                )}

                {/* 5 Lessons List */}
                <div className="explore-kingdom-card__lessons">
                  <h3 className="explore-kingdom-card__lessons-title">
                    📖 5 Curriculum Lessons (Instant Access):
                  </h3>
                  <div className="explore-lessons-list">
                    {k.levels.map((lvl) => (
                      <Link
                        key={lvl.id}
                        to={`/explore/kingdom/${k.id}/level/${lvl.id}`}
                        className="explore-lesson-pill"
                        title={lvl.description}
                      >
                        <span className="explore-lesson-pill__order">L{lvl.order}</span>
                        <span className="explore-lesson-pill__title">{lvl.title}</span>
                        <span className="explore-lesson-pill__arrow">→</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Sanity Checks Info */}
                {(k.sanityChecks || []).length > 0 && (
                  <div className="explore-kingdom-card__sanity">
                    <Link
                      to={`/explore/kingdom/${k.id}?check=${k.sanityChecks[0].id}`}
                      className="explore-sanity-tag"
                      style={{ textDecoration: 'none', cursor: 'pointer' }}
                      title={`Open ${k.sanityChecks[0].name} terminal directly`}
                    >
                      🛡️ {certifiableCount} Certifiable Checks ›
                    </Link>
                    {practiceCount > 0 && (
                      <Link
                        to={`/explore/kingdom/${k.id}?check=${(k.sanityChecks.find((c) => SANITY_CHECK_REQUIREMENTS[c.id]?.classification === CHECK_CLASSIFICATION.PRACTICE_ONLY) || k.sanityChecks[k.sanityChecks.length - 1]).id}`}
                        className="explore-sanity-tag explore-sanity-tag--practice"
                        style={{ textDecoration: 'none', cursor: 'pointer' }}
                        title="Open practice drill terminal directly"
                      >
                        🔬 {practiceCount} Practice Drills ›
                      </Link>
                    )}
                  </div>
                )}

                {/* Footer Action */}
                <div className="explore-kingdom-card__footer">
                  <Link
                    to={`/explore/kingdom/${k.id}`}
                    className="btn btn--primary btn--sm w-full"
                  >
                    Open {k.name} Explorer →
                  </Link>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ─── VIEW 2: FULL LESSON CATALOG VIEW ───────────────────────── */}
      {viewMode === 'catalog' && (
        <section className="container explore-catalog-view">
          <div className="explore-catalog-header">
            <h2>All 40 Interactive Lessons ({filteredLessons.length} showing)</h2>
            <p>Select any lesson below to immediately launch its interactive simulator.</p>
          </div>

          <div className="explore-catalog-grid">
            {filteredLessons.map((l) => (
              <div key={l.id} className="explore-catalog-card">
                <div className="explore-catalog-card__top">
                  <span className="explore-catalog-card__kingdom">
                    {l.kingdomEmoji} {l.kingdomName} · Level {l.order}
                  </span>
                  <span className="explore-catalog-card__duration">⏱ {l.duration}</span>
                </div>

                <h3 className="explore-catalog-card__title">{l.title}</h3>
                <p className="explore-catalog-card__desc">{l.description}</p>

                <div className="explore-catalog-card__footer">
                  <span className="explore-catalog-card__xp">⭐ {l.xpReward} XP Exercise</span>
                  <Link
                    to={`/explore/kingdom/${l.kingdomId}/level/${l.id}`}
                    className="btn btn--primary btn--sm"
                  >
                    Launch Simulator ›
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── SANITY CHECK TERMINAL DIRECT ACCESS DIRECTORY ──────────── */}
      <section className="container explore-sanity-directory">
        <div className="explore-sanity-directory__header">
          <h2>🛡️ All 26 Physical Design Sanity Checks</h2>
          <p>
            Instant access to educational rule decks and analytical models across all 5 physical design stages.
            Explore nominal runs or inject intentional defects in sandbox demonstration mode.
          </p>
        </div>

        <div className="explore-sanity-category-grid">
          {KINGDOMS.filter((k) => (k.sanityChecks || []).length > 0).map((k) => (
            <div key={k.id} className="explore-sanity-group">
              <h3 className="explore-sanity-group__title">
                {k.emoji} {k.name} ({k.sanityChecks.length} checks)
              </h3>
              <div className="explore-sanity-links">
                {k.sanityChecks.map((check) => {
                  const req = SANITY_CHECK_REQUIREMENTS[check.id];
                  const isCertifiable =
                    req?.classification === CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK;

                  return (
                    <Link
                      key={check.id}
                      to={`/explore/kingdom/${k.id}?check=${check.id}`}
                      className="explore-sanity-link"
                    >
                      <span className="explore-sanity-link__icon">{check.icon}</span>
                      <div className="explore-sanity-link__info">
                        <strong>{check.name}</strong>
                        <span>{check.fullName}</span>
                      </div>
                      <span
                        className={`badge ${
                          isCertifiable ? 'badge--available' : 'explore-badge--practice'
                        }`}
                      >
                        {isCertifiable ? 'Certifiable' : 'Practice Drill'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
