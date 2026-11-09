/**
 * RTLStudioPage.jsx
 * ==================
 * Full-scale native embedded view of the standalone RTL Playground.
 * Integrates the complete 24-lesson digital logic simulator, waveform generator,
 * ALU/datapath designer, and FSM studio directly within the Game-Site interface.
 * Supports clean bidirectional return navigation to both Normal Game and Explore Mode.
 */

import React, { useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import './StudioPage.css';

export default function RTLStudioPage({ isExploreMode = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isExplore = Boolean(
    isExploreMode ||
    searchParams.get('from') === 'explore' ||
    location.pathname.startsWith('/explore')
  );

  const currentTab = searchParams.get('tab') || 'fundamentals';
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Derive iframe URL based on active studio tab
  const getIframeSrc = () => {
    const base = import.meta.env.BASE_URL || '/';
    const prefix = base.endsWith('/') ? base : `${base}/`;
    switch (currentTab) {
      case 'datapath':
        return `${prefix}studios/rtl/advanced-lab/index.html?tab=datapath`;
      case 'sequential':
        return `${prefix}studios/rtl/advanced-lab/index.html?tab=sequential`;
      case 'fsm':
        return `${prefix}studios/rtl/advanced-lab/index.html?tab=fsm`;
      case 'lessons':
        return `${prefix}studios/rtl/advanced-lab/index.html?tab=lessons`;
      case 'fundamentals':
      default:
        return `${prefix}studios/rtl/index.html`;
    }
  };

  const tabs = [
    { id: 'fundamentals', label: 'Logic Fundamentals', emoji: '🔌' },
    { id: 'datapath', label: 'Datapaths & 8-Bit ALU', emoji: '🧮' },
    { id: 'sequential', label: 'Registers & Counters', emoji: '⏱️' },
    { id: 'fsm', label: 'FSM Studio', emoji: '🔄' },
    { id: 'lessons', label: '24-Lesson Curriculum', emoji: '📚' },
  ];

  return (
    <div className={`studio-page ${isFullscreen ? 'studio-page--fullscreen' : ''}`}>
      {/* Top Breadcrumb & Control Bar */}
      <div className="studio-page__header">
        <div className="container studio-page__header-inner">
          <div className="studio-page__title-area">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <Link
                to={isExplore ? "/explore" : "/world-map"}
                className="studio-page__back-link"
              >
                {isExplore ? "← Return to Explore Mode" : "← Return to Three-Studio Hub"}
              </Link>
              {!isExplore && (
                <>
                  <span style={{ color: '#94a3b8' }}>|</span>
                  <Link
                    to="/kingdom/rtl-understanding"
                    className="studio-page__back-link"
                  >
                    📚 RTL Kingdom
                  </Link>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <h1 className="studio-page__title">⚡ RTL Playground Studio (Integrated)</h1>
              <span className="badge badge--available">
                {isExplore ? "Explore Sandbox" : "Full Standalone Suite"}
              </span>
            </div>
            <p className="studio-page__subtitle">
              Native embedded environment running the complete 24-lesson simulator, waveform viewer, and Verilog generation engine locally with zero cloud dependencies.
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
              href="https://ppawar-7.github.io/rtl-playground/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost btn--sm"
              style={{ color: '#38bdf8' }}
            >
              External Tab ↗
            </a>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="container">
          <div className="studio-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`studio-tab ${currentTab === tab.id ? 'studio-tab--active' : ''}`}
                onClick={() => setSearchParams(isExplore ? { tab: tab.id, from: 'explore' } : { tab: tab.id })}
              >
                <span>{tab.emoji}</span> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Studio Iframe Container */}
      <div className="studio-page__body studio-page__canvas-container">
        <div className="container studio-page__iframe-container" style={{ width: '100%', height: '100%' }}>
          <iframe
            key={currentTab}
            src={getIframeSrc()}
            title="Standalone RTL Playground"
            className="studio-iframe studio-page__iframe"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          />
        </div>
      </div>

      {/* Local Hosting Disclosure Note */}
      <div className="container studio-page__footer-note">
        <div className="studio-disclosure-box">
          <strong>Pedagogical RTL Studio:</strong> Full 24-lesson digital logic simulator running 100% locally in your browser. All circuits, truth tables, and waveforms are simulated client-side with zero external cloud dependencies.
        </div>
      </div>
    </div>
  );
}
