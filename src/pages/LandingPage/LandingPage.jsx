/**
 * LandingPage.jsx
 * ================
 * Welcome / entry point of PD Playground.
 * Shows the platform introduction and Start Learning CTA.
 * Features our three flagship engineering experiences:
 *   1. Complete RTL Logic Playground
 *   2. Deep Floorplanning Kingdom & CAD Studio 3.0 (36 Lessons)
 *   3. Complete Static Timing Analysis (STA) Laboratory
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { FEATURED_EXPERIENCES } from '../../config/featureScope.js';
import './LandingPage.css';

// Decorative star positions (static so they don't re-randomize)
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 3) % 100}%`,
  top: `${(i * 23 + 7) % 100}%`,
  size: (i % 3) + 1,
  delay: `${(i * 0.37) % 3}s`,
}));

const THREE_STUDIOS = FEATURED_EXPERIENCES.map((exp) => ({
  emoji: exp.emoji,
  label: exp.title,
}));

const FEATURES = [
  {
    emoji: '🏛️',
    title: 'Three Deep EDA Studios',
    desc: 'Master RTL digital logic, interactive floorplan CAD layout, and static timing analysis.',
  },
  {
    emoji: '📐',
    title: '36-Lesson Floorplan Curriculum',
    desc: 'From core aspect ratio to multi-macro SoC educational signoff with genuine CAD project grading.',
  },
  {
    emoji: '⚡',
    title: 'Nodal PDN MNA Solver',
    desc: 'Linear conductance matrix solution G · V = I for authentic static IR drop analysis.',
  },
  {
    emoji: '🧭',
    title: 'Unlocked Explore Mode',
    desc: 'Freely experiment across all studios and lessons without progression gating or XP locks.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { player, setPlayerName } = usePlayer();
  const [showModal, setShowModal] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const handleStartLearning = () => {
    if (player.name === 'Student Explorer') {
      setShowModal(true);
    } else {
      navigate('/world-map');
    }
  };

  const handleGuestMode = () => {
    navigate('/world-map');
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed) setPlayerName(trimmed);
    setShowModal(false);
    navigate('/world-map');
  };

  const handleSkipName = () => {
    setShowModal(false);
    navigate('/world-map');
  };

  return (
    <div className="landing">
      {/* Background ambient glow */}
      <div className="landing__bg" />

      {/* Twinkling stars */}
      <div className="landing__stars">
        {STARS.map((s) => (
          <div
            key={s.id}
            className="landing__star"
            style={{
              left: s.left,
              top: s.top,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: s.delay,
              animationDuration: `${2 + (s.id % 3)}s`,
            }}
          />
        ))}
      </div>

      {/* Hero */}
      <section className="landing__hero">
        <div className="landing__badge">
          🎓 Three-Studio Focus Edition · Professional ASIC &amp; EDA Learning
        </div>

        <span className="landing__logo-emoji">🎮</span>

        <h1 className="landing__title">
          PD <span className="landing__title-highlight">Playground</span>
        </h1>

        <p className="landing__tagline">
          Master ASIC Digital &amp; Physical Design through deep, uncompromised EDA studios:
          author digital logic in the RTL Studio, architect chip floorplans in Floorplanning CAD 3.0,
          and verify slack in the Static Timing Analysis Laboratory.
        </p>

        {/* Featured Studios preview */}
        <div className="landing__flow">
          {THREE_STUDIOS.map((item, i) => (
            <React.Fragment key={item.label}>
              <div className="landing__flow-item">
                {item.emoji} {item.label}
              </div>
              {i < THREE_STUDIOS.length - 1 && (
                <span className="landing__flow-arrow">✦</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Industrial flow notice */}
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '640px', margin: '0.8rem auto 1.5rem', lineHeight: '1.4' }}>
          <em>Industrial Flow Note:</em> In commercial flows, Logic Synthesis transforms RTL into gate netlists prior to Floorplanning.
          Synthesis, Placement, CTS, Routing, Filler Cells, and GDS are safely archived for subsequent dedicated studio releases.
        </p>

        {/* CTA buttons */}
        <div className="landing__cta">
          <button className="btn btn--primary btn--lg" onClick={handleStartLearning}>
            🚀 Launch Three-Studio Hub
          </button>
          <button className="btn btn--ghost btn--lg" onClick={handleGuestMode}>
            🧭 Explore Sandbox Mode
          </button>
        </div>

        <p className="landing__cta-sub">
          No account required · Progress saved in your browser
        </p>
      </section>

      {/* Feature highlights */}
      <div className="landing__features">
        {FEATURES.map((f) => (
          <div key={f.title} className="landing__feature-card">
            <span className="landing__feature-emoji">{f.emoji}</span>
            <h3 className="landing__feature-title">{f.title}</h3>
            <p className="landing__feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Name modal */}
      {showModal && (
        <div className="landing__modal-overlay" onClick={handleSkipName}>
          <div className="landing__modal" onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: '3rem' }}>🧑‍💻</span>
            <h2>What's your name?</h2>
            <p>Personalise your learning adventure — or skip to jump right in.</p>
            <form onSubmit={handleNameSubmit}>
              <input
                className="landing__input"
                type="text"
                placeholder="Enter your name..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                autoFocus
              />
              <div className="landing__modal-buttons">
                <button type="submit" className="btn btn--primary">
                  Let's Go! 🚀
                </button>
                <button type="button" className="btn btn--ghost" onClick={handleSkipName}>
                  Skip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
