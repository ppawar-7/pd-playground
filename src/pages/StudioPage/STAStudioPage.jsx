/**
 * STAStudioPage.jsx
 * ==================
 * Full-scale native embedded view of the standalone Static Timing Analysis (STA) Playground.
 * Integrates the graph-based timing path tracer, setup/hold slack histograms,
 * and PVT operating corner analyzer directly within Game-Site.
 * Supports clean bidirectional return navigation to both Normal Game and Explore Mode.
 */

import React, { useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import './StudioPage.css';

export default function STAStudioPage({ isExploreMode = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isExplore = Boolean(
    isExploreMode ||
    searchParams.get('from') === 'explore' ||
    location.pathname.startsWith('/explore')
  );

  const stage = searchParams.get('stage') || 'cts';
  const [isFullscreen, setIsFullscreen] = useState(false);

  const stages = [
    {
      id: 'synthesis',
      label: 'Synthesis (Pre-Layout SDC)',
      emoji: '⚗️',
      kingdom: 'synthesis',
      focusTitle: 'Pre-Layout Timing Constraints (SDC)',
      focusDesc: 'During Synthesis, STA estimates gate delays from standard-cell Liberty (.lib) lookup tables using wire-load models (WLM). The primary goal is achieving zero setup slack (WNS >= 0) at target clock frequency before physical cell locations exist.',
      metricTarget: 'Target Setup Slack: >= 0.00 ns (Zero WNS violation)',
    },
    {
      id: 'placement',
      label: 'Placement (Wire Estimates)',
      emoji: '📍',
      kingdom: 'placement',
      focusTitle: 'Placement Timing & Wire Delay Estimates',
      focusDesc: 'After standard cells are snapped to row sites, STA replaces statistical wire-load models with Steiner tree / Manhattan wirelength estimations (FLUTE). Placement optimizers perform timing-driven cell clustering and critical path buffering.',
      metricTarget: 'Target Wirelength HPWL: Minimize critical net resistance/capacitance',
    },
    {
      id: 'cts',
      label: 'Post-CTS (Real Skew & Latency)',
      emoji: '⏱️',
      kingdom: 'cts',
      focusTitle: 'Post-CTS Propagated Clock Timing Sign-Off',
      focusDesc: 'Once the clock tree is built, ideal clock networks are replaced with propagated clocks. STA calculates actual insertion delay, launch/capture clock skew, and validates both Setup and Hold timing across all process corners.',
      metricTarget: 'Target Clock Skew: <= 30 ps | Target Insertion Delay: <= 300 ps',
    },
    {
      id: 'routing',
      label: 'Post-Route (SPEF Extraction)',
      emoji: '🛣️',
      kingdom: 'routing',
      focusTitle: 'Post-Route Parasitic SPEF Sign-Off',
      focusDesc: 'With detailed routing wires and vias materialized, parasitics are extracted into standard SPEF files. STA computes distributed RC Elmore delays and verifies signal integrity crosstalk glitch noise on victim nets.',
      metricTarget: 'Target Sign-off WNS: >= 0 ps | Victim Noise Glitch: <= 50 mV',
    },
  ];

  const currentStage = stages.find((s) => s.id === stage) || stages[2];

  return (
    <div className={`studio-page ${isFullscreen ? 'studio-page--fullscreen' : ''}`}>
      {/* Top Header & Context Bar */}
      <div className="studio-page__header">
        <div className="container studio-page__header-inner">
          <div className="studio-page__title-area">
            <Link
              to={isExplore ? "/explore" : "/world-map"}
              className="studio-page__back-link"
            >
              {isExplore ? "← Return to Explore Mode" : "← Return to Three-Studio Hub"}
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <h1 className="studio-page__title">⏱️ Static Timing Analysis (STA) Studio (Integrated)</h1>
              <span className="badge badge--available">
                {isExplore ? "Explore Sandbox" : "Full Standalone Suite"}
              </span>
            </div>
            <p className="studio-page__subtitle">
              Native embedded environment running the complete multi-corner timing graph analyzer, setup/hold slack calculator, and PVT derating engine locally with zero cloud dependencies.
            </p>
          </div>

          <div className="studio-page__actions">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}
            </button>
            <a
              href="https://ppawar-7.github.io/sta-playground/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost btn--sm"
              style={{ color: '#38bdf8' }}
            >
              External Tab ↗
            </a>
          </div>
        </div>

        {/* Physical Design Lifecycle Stage Bar */}
        <div className="container">
          <div className="studio-stage-nav">
            <span className="studio-stage-nav__label">ASIC Flow Verification Stage:</span>
            <div className="studio-stage-chips">
              {stages.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`studio-stage-chip ${stage === s.id ? 'studio-stage-chip--active' : ''}`}
                  onClick={() => setSearchParams(isExplore ? { stage: s.id, from: 'explore' } : { stage: s.id })}
                >
                  <span>{s.emoji}</span> {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Pedagogical Focus Banner */}
      <div className="container studio-page__focus-container">
        <div className="studio-focus-banner">
          <div className="studio-focus-banner__left">
            <span className="studio-focus-badge">{currentStage.emoji} {currentStage.focusTitle}</span>
            <p className="studio-focus-desc">{currentStage.focusDesc}</p>
          </div>
          <div className="studio-focus-banner__right">
            <span className="studio-metric-target">{currentStage.metricTarget}</span>
          </div>
        </div>
      </div>

      {/* Main Studio Iframe Body */}
      <div className="studio-page__body studio-page__canvas-container">
        <div className="container studio-page__iframe-container" style={{ width: '100%', height: '100%' }}>
          <iframe
            key={stage}
            src={`${(import.meta.env.BASE_URL || '/').replace(/\/+$/, '')}/studios/sta/index.html?stage=${stage}`}
            title="Standalone STA Playground"
            className="studio-iframe studio-page__iframe"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          />
        </div>
      </div>

      {/* Local Hosting Disclosure Note */}
      <div className="container studio-page__footer-note">
        <div className="studio-disclosure-box">
          <strong>Pedagogical Static Timing Analysis Studio:</strong> Full multi-corner timing analyzer running 100% locally in your browser. Delay calculations, path tracing, and setup/hold slack histograms are computed client-side with zero external cloud dependencies.
        </div>
      </div>
    </div>
  );
}
