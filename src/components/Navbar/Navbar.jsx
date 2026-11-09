/**
 * Navbar.jsx
 * ===========
 * Persistent top navigation bar shown on all pages except the landing page.
 * Provides direct access to Dashboard, World Map, Explore Mode, and Studios.
 */

import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { FEATURED_EXPERIENCES } from '../../config/featureScope.js';
import './Navbar.css';

export default function Navbar() {
  const { player } = usePlayer();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isExplore = location.pathname.startsWith('/explore');

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', emoji: '📊' },
    { to: '/world-map', label: 'Home Hub', emoji: '🏛️' },
    { to: '/explore', label: 'Explore', emoji: '🧭' },
    ...FEATURED_EXPERIENCES.map((exp) => ({
      to: exp.studioRoute,
      label: exp.id === 'rtl' ? 'RTL Studio' : exp.id === 'floorplanning' ? 'Floorplan Studio' : 'STA Studio',
      emoji: exp.emoji,
    })),


  ];

  return (
    <nav className="navbar">
      <div className="container navbar__inner">
        {/* Logo */}
        <Link to={isExplore ? "/explore" : "/world-map"} className="navbar__logo">
          <span className="navbar__logo-emoji">🎮</span>
          <span>PD <span className="navbar__logo-text">Playground</span></span>
        </Link>

        {/* Desktop Nav */}
        <div className={`navbar__nav ${menuOpen ? 'navbar__nav--open' : ''}`}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `navbar__link ${isActive ? 'navbar__link--active' : ''}`
              }
              onClick={() => setMenuOpen(false)}
            >
              <span>{link.emoji}</span>
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Status display + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isExplore && (
            <span
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.55rem',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
              title="Explore Mode is active. Activity completions are ephemeral and do not modify Normal Game progress."
            >
              🧭 Sandbox
            </span>
          )}
          <div className="navbar__xp" title="Normal Game Total XP">
            ⭐ {player.totalXP} XP
          </div>
          <button
            className="navbar__hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </nav>
  );
}
