/**
 * WorldMapPage.jsx
 * =================
 * Flagship Three-Studio Home Hub:
 * 1. Complete RTL Playground (Bundled Logic Studio & Kingdom)
 * 2. Deep Floorplanning Kingdom & CAD Studio 3.0 (36-lesson curriculum + CAD tools)
 * 3. Complete Static Timing Analysis (STA) Laboratory (Timing verification & analysis)
 *
 * Provides direct zero-friction studio launch buttons and return navigation.
 * Also preserves the legacy 8-kingdom view for internal maintainers via /legacy/world-map or ?legacy=true.
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext.jsx';
import KingdomCard from '../../components/KingdomCard/KingdomCard.jsx';
import {
  computeOverallProgress,
  countKingdomsUnlocked,
  countLevelsCompleted,
  countTotalSanityChecksPassed,
  countTotalSanityChecks,
  getKingdomStatus,
  isKingdomUnlocked,
} from '../../logic/progressionEngine.js';
import { KINGDOMS } from '../../data/kingdomsData.js';
import { FEATURED_EXPERIENCES, POSTPONED_KINGDOMS, isLegacyMode } from '../../config/featureScope.js';
import './WorldMapPage.css';

export default function WorldMapPage({ isLegacy: isLegacyProp }) {
  const { player } = usePlayer();
  const location = useLocation();
  const urlLegacy = isLegacyMode(location);
  const [showArchivedFlow, setShowArchivedFlow] = useState(isLegacyProp || urlLegacy);

  const overallProgress = computeOverallProgress(player);
  const kingdomsUnlocked = countKingdomsUnlocked(player);
  const levelsCompleted = countLevelsCompleted(player);
  const totalLevels = KINGDOMS.reduce((s, k) => s + k.levels.length, 0);
  const passedSanity = countTotalSanityChecksPassed(player);
  const totalSanity = countTotalSanityChecks();

  const rtlUnlocked = isKingdomUnlocked(player, 'rtl-understanding');
  const fpUnlocked = isKingdomUnlocked(player, 'floorplanning');

  return (
    <div className="world-map">
      <div className="container">
        {/* Header */}
        <div className="world-map__header">
          <div className="world-map__title-row">
            <span style={{ fontSize: '2rem' }}>🏛️</span>
            <h1 className="section-title">
              {showArchivedFlow ? 'ASIC Design Journey (Full 8 Kingdoms)' : 'PD Playground — Flagship EDA Studios'}
            </h1>
          </div>
          <p className="world-map__subtitle">
            {showArchivedFlow
              ? 'Archived Roadmap View: Inspect the complete 8-kingdom physical design sequence and historical sanity check side quests.'
              : 'Welcome to the Three-Studio ASIC design platform. Choose a dedicated studio below to author logic, architect silicon floorplans, or analyze critical path timing.'}
          </p>

          {/* Summary stats */}
          <div className="world-map__summary">
            <div className="world-map__summary-stat">
              <div className="world-map__summary-value">3</div>
              <div className="world-map__summary-label">EDA Studios</div>
            </div>
            <div className="world-map__summary-stat">
              <div className="world-map__summary-value">41</div>
              <div className="world-map__summary-label">Curriculum Labs</div>
            </div>
            <div className="world-map__summary-stat">
              <div className="world-map__summary-value">{levelsCompleted}</div>
              <div className="world-map__summary-label">Labs Completed</div>
            </div>
            <div className="world-map__summary-stat">
              <div className="world-map__summary-value">{player.totalXP}</div>
              <div className="world-map__summary-label">Total XP</div>
            </div>
          </div>
        </div>

        {/* ─── PRIMARY THREE-STUDIO HUB VIEW ────────────────────────── */}
        {!showArchivedFlow ? (
          <>
            <div className="three-studios-hub">
              {/* Studio 1: RTL Playground */}
              <div className="studio-hub-card" style={{ borderLeft: '5px solid #7c3aed' }}>
                <div className="studio-hub-card__top">
                  <div className="studio-hub-card__title-group">
                    <div className="studio-hub-card__emoji">🧩</div>
                    <div>
                      <h2 className="studio-hub-card__title">RTL Design &amp; Simulation</h2>
                      <div className="studio-hub-card__subtitle">Digital Logic &amp; Verilog HDL Engineering Studio</div>
                    </div>
                  </div>
                  <span className="badge badge--completed" style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' }}>
                    Active Studio
                  </span>
                </div>
                <p className="studio-hub-card__tagline">
                  Construct combinational and sequential circuits using block-based and HDL programming.
                  Simulate logic waveforms, design finite state machines, and inspect synthesized logic netlists.
                </p>
                <div className="studio-hub-card__highlights">
                  <div className="studio-hub-card__highlight-item">✓ Live Interactive Logic Simulation Canvas</div>
                  <div className="studio-hub-card__highlight-item">✓ Verilog Generation &amp; Syntax Highlighting</div>
                  <div className="studio-hub-card__highlight-item">✓ Mux/ALU &amp; DFF/FSM Interactive Challenges</div>
                  <div className="studio-hub-card__highlight-item">✓ Guided RTL Kingdom Curriculum (5 Levels)</div>
                </div>
                <div className="studio-hub-card__actions">
                  <Link to="/studio/rtl" className="btn btn--primary" data-testid="launch-rtl-studio">
                    ⚡ Launch RTL ↗
                  </Link>
                  <Link to="/kingdom/rtl-understanding" className="btn btn--secondary">
                    📚 RTL Curriculum (5 Levels)
                  </Link>
                  <Link to="/explore/studio/rtl" className="btn btn--ghost" style={{ fontSize: '0.85rem' }}>
                    🧭 Explore Sandbox
                  </Link>
                </div>
              </div>

              {/* Studio 2: Floorplanning Kingdom & CAD Studio 3.0 */}
              <div className="studio-hub-card" style={{ borderLeft: '5px solid #10b981' }}>
                <div className="studio-hub-card__top">
                  <div className="studio-hub-card__title-group">
                    <div className="studio-hub-card__emoji">🗺️</div>
                    <div>
                      <h2 className="studio-hub-card__title">Physical Floorplanning</h2>
                      <div className="studio-hub-card__subtitle">Deep ASIC CAD Studio 3.0 &amp; 36-Lesson Curriculum</div>
                    </div>
                  </div>
                  <span className="badge badge--completed" style={{ background: '#d1fae5', color: '#047857', borderColor: '#a7f3d0' }}>
                    Flagship CAD 3.0
                  </span>
                </div>
                <p className="studio-hub-card__tagline">
                  Architect core and die dimensions, place and orient multi-macro instances with halo clearances,
                  synthesize orthogonal M4/M5 power grids, solve nodal static IR drop via MNA matrix equations,
                  and sign off physical DRC.
                </p>
                <div className="studio-hub-card__highlights">
                  <div className="studio-hub-card__highlight-item">✓ 36 Comprehensive Labs (FP-1 through FP-36)</div>
                  <div className="studio-hub-card__highlight-item">✓ Nodal Conductance Matrix Solver (G · V = I)</div>
                  <div className="studio-hub-card__highlight-item">✓ Automated Macro Legalizer &amp; Pin Pitch Assistants</div>
                  <div className="studio-hub-card__highlight-item">✓ Educational LEF 5.8 &amp; DEF 5.8 Subset Exporters</div>
                </div>
                <div className="studio-hub-card__actions">
                  <Link to="/studio/floorplanning" className="btn btn--primary" style={{ background: '#059669', borderColor: '#059669' }} data-testid="launch-fp-studio">
                    🗺️ Launch Floorplanning ↗
                  </Link>
                  <Link to="/kingdom/floorplanning" className="btn btn--secondary">
                    📐 Floorplan Curriculum (36 Labs)
                  </Link>
                  <Link to="/explore/studio/floorplanning" className="btn btn--ghost" style={{ fontSize: '0.85rem' }}>
                    🧭 Explore Sandbox
                  </Link>
                </div>
              </div>

              {/* Studio 3: STA Playground */}
              <div className="studio-hub-card" style={{ borderLeft: '5px solid #f59e0b' }}>
                <div className="studio-hub-card__top">
                  <div className="studio-hub-card__title-group">
                    <div className="studio-hub-card__emoji">⏱️</div>
                    <div>
                      <h2 className="studio-hub-card__title">Static Timing Analysis</h2>
                      <div className="studio-hub-card__subtitle">Static Timing Analysis &amp; Verification Laboratory</div>
                    </div>
                  </div>
                  <span className="badge badge--completed" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                    Timing Verification
                  </span>
                </div>
                <p className="studio-hub-card__tagline">
                  Calculate setup and hold slack across process corners, analyze critical data paths,
                  inspect clock skew and latency margins, and experiment with SDC timing constraints.
                  <em> (Presented as timing verification and analysis, distinct from Clock Tree Synthesis).</em>
                </p>
                <div className="studio-hub-card__highlights">
                  <div className="studio-hub-card__highlight-item">✓ Setup &amp; Hold Slack Calculations &amp; Margins</div>
                  <div className="studio-hub-card__highlight-item">✓ Interactive Critical Timing Path Graphs</div>
                  <div className="studio-hub-card__highlight-item">✓ SDC Timing Constraint Exploration</div>
                  <div className="studio-hub-card__highlight-item">✓ Clock Skew, Jitter, and PVT Corner Margins</div>
                </div>
                <div className="studio-hub-card__actions">
                  <Link to="/studio/sta" className="btn btn--primary" style={{ background: '#d97706', borderColor: '#d97706' }} data-testid="launch-sta-studio">
                    ⏱️ Launch STA ↗
                  </Link>
                  <Link to="/explore/studio/sta" className="btn btn--ghost" style={{ fontSize: '0.85rem' }}>
                    🧭 Explore Sandbox
                  </Link>
                </div>
              </div>
            </div>

            {/* Industrial flow explanation */}
            <div className="industrial-flow-banner">
              <strong>🏭 Industrial ASIC Flow Note:</strong> In commercial semiconductor design, Logic Synthesis is an intermediate
              stage between RTL logic and physical floorplanning. Synthesis, Placement, Clock Tree Synthesis (CTS), Routing,
              Filler Cells, and GDS sign-off are safely archived in our Git repository while we focus on delivering deep,
              uncompromised educational EDA studios.
            </div>

            {/* Maintainer toggle */}
            <div className="maintainer-mode-toggle">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowArchivedFlow(true)}
                style={{ fontSize: '0.8rem', color: '#64748b' }}
              >
                🔧 Maintainer Mode: Preview Archived 8-Kingdom Roadmap
              </button>
            </div>
          </>
        ) : (
          /* ─── LEGACY 8-KINGDOM JOURNEY VIEW (FOR MAINTAINERS) ────────── */
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setShowArchivedFlow(false)}
              >
                ← Return to Three-Studio Focus Hub
              </button>
            </div>

            <div className="world-map__journey">
              <div className="world-map__path-line" />

              {KINGDOMS.map((kingdom, index) => {
                const isLeft = index % 2 === 0;
                const status = getKingdomStatus(player, kingdom.id);

                const dotClass = `world-map__node-dot world-map__node-dot--${
                  status === 'completed' ? 'completed' : status === 'available' ? 'active' : 'locked'
                }`;

                const card = <KingdomCard kingdom={kingdom} isLast={index === KINGDOMS.length - 1} />;
                const spacer = <div className="world-map__spacer" />;

                return (
                  <div
                    key={kingdom.id}
                    className={`world-map__kingdom-row world-map__kingdom-row--${isLeft ? 'left' : 'right'}`}
                  >
                    {isLeft ? (
                      <>
                        <div className="world-map__card-slot">{card}</div>
                        <div className="world-map__node">
                          <div className={dotClass}>{kingdom.emoji}</div>
                        </div>
                        {spacer}
                      </>
                    ) : (
                      <>
                        {spacer}
                        <div className="world-map__node">
                          <div className={dotClass}>{kingdom.emoji}</div>
                        </div>
                        <div className="world-map__card-slot">{card}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
