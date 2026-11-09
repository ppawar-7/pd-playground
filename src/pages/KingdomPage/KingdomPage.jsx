import { EXPANDED_LESSONS } from '../../activities/floorplanning/expanded/fpExpandedCurriculumData.js';
/**
 * KingdomPage.jsx
 * ================
 * Reusable kingdom page template — driven entirely by kingdomsData.js.
 * Renders any kingdom based on the :kingdomId URL parameter.
 * Features:
 * - Kingdom Hero & Stats
 * - Native Integrated Studio Lab Workspace (Inline & Dedicated Routes)
 * - Main Concept Levels (Supports Normal Game Progression & Explore Mode)
 * - Stage Sanity Check Side Quests (15 Certifiable Checks & 11 Practice Drills)
 * - Interactive Sanity Check Verification Terminal Modal
 * - Stale Revalidation Awareness & Transparent Educational Scopes
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext.jsx';
import LevelCard from '../../components/LevelCard/LevelCard.jsx';
import {
  getKingdomStatus,
  getKingdomXP,
  isKingdomUnlocked,
  getKingdomSanityChecks,
  countPassedKingdomSanityChecks,
  areAllKingdomLevelsCompleted,
  areAllKingdomSanityChecksPassed,
  getSanityCheckStatus,
  isSanityCheckPassed,
  getKingdomCertifiableSanityChecks,
} from '../../logic/progressionEngine.js';
import { KINGDOMS } from '../../data/kingdomsData.js';
import { evaluateSanityCheck } from '../../engine/sanityCheckEngine.js';
import { SANITY_CHECK_REQUIREMENTS, getStudentDesignForSanityCheck } from '../../logic/studentDesignContext.js';
import { CHECK_CLASSIFICATION } from '../../logic/designArtifactContracts.js';
import './KingdomPage.css';

const FP_MODULES = [
  {
    num: 2,
    title: 'Module 2: Die & Core Architecture',
    desc: 'Core boundary aspect ratios, macro halo keepouts, utilization budgeting, and row channel generation.',
    range: ['fp-6', 'fp-7', 'fp-8', 'fp-9'],
  },
  {
    num: 3,
    title: 'Module 3: Macro Engineering',
    desc: 'Orientation transforms, pin access channels, flyline wirelength optimization, and multi-macro legal placement.',
    range: ['fp-10', 'fp-11', 'fp-12', 'fp-13'],
  },
  {
    num: 4,
    title: 'Module 4: I/O and Power Fundamentals',
    desc: 'I/O pad pitch legalizer, edge distribution, VDD/VSS mesh rings, horizontal/vertical straps, and stacked vias.',
    range: ['fp-14', 'fp-15', 'fp-16', 'fp-17', 'fp-18'],
  },
  {
    num: 5,
    title: 'Module 5: Analysis, Optimization & First Master Project',
    desc: 'Nodal resistive IR drop simulation, 2D routing congestion analysis, Pareto candidate trade-offs, and FP-24 First Capstone.',
    range: ['fp-19', 'fp-20', 'fp-21', 'fp-22', 'fp-23', 'fp-24'],
  },
  {
    num: 6,
    title: 'Module 6: Open-Ended Design Authoring',
    desc: 'Interactive component creation: macro master instantiation, custom pin placement, routing blockage types, and custom straps.',
    range: ['fp-25', 'fp-26', 'fp-27', 'fp-28'],
  },
  {
    num: 7,
    title: 'Module 7: Advanced Power & Optimization',
    desc: 'Dynamic strap pitch vs IR drop tradeoffs, automated PDN mesh synthesis, assisted macro legalization, assisted pin legalization, and candidate Pareto frontiers.',
    range: ['fp-29', 'fp-30', 'fp-31', 'fp-32', 'fp-33'],
  },
  {
    num: 8,
    title: 'Module 8: Advanced Engineering Handoff',
    desc: 'Automated DRC repair assistants, physical design sign-off reports (LEF/DEF/JSON), and the FP-36 Final Capstone SoC.',
    range: ['fp-34', 'fp-35', 'fp-36'],
  },
];

export default function KingdomPage({ isExploreMode = false }) {
  const { kingdomId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { player, passSanityCheck } = usePlayer();

  const isExplore = Boolean(isExploreMode || location.pathname.startsWith('/explore'));
  const checkParam = searchParams.get('check');

  const [activeCheck, setActiveCheck] = useState(null);
  const [runningSimulation, setRunningSimulation] = useState(false);
  const [simulationDone, setSimulationDone] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState([]);
  const [simulationPassed, setSimulationPassed] = useState(true);
  const [simulationCanCertify, setSimulationCanCertify] = useState(false);

  // Sanity check audit modes: 'student' (genuine design) vs 'demo' (preset drill)
  const [auditMode, setAuditMode] = useState('student');
  const [demoDefect, setDemoDefect] = useState(false);
  const [studentAuditInfo, setStudentAuditInfo] = useState(null);

  // In-page embedded studio workspace toggle
  const [showInlineStudio, setShowInlineStudio] = useState(false);

  // Find kingdom by ID from central data
  const kingdom = KINGDOMS.find((k) => k.id === kingdomId);

  // 404 → redirect to appropriate home
  if (!kingdom) return <Navigate to={isExplore ? "/explore" : "/world-map"} replace />;

  const status = getKingdomStatus(player, kingdomId);
  const unlocked = isExplore || isKingdomUnlocked(player, kingdomId);
  const kingdomXP = getKingdomXP(player, kingdomId);

  // Levels info
  const completedLevels = kingdom.levels.filter(
    (l) => player.levelProgress?.[l.id]?.completed
  ).length;
  const levelsDone = areAllKingdomLevelsCompleted(player, kingdomId);

  // Expanded Floorplanning lessons count (31 expanded + 5 core = 36 total)
  const expandedLessonsList = kingdomId === 'floorplanning' ? Object.keys(EXPANDED_LESSONS) : [];
  const expandedCompleted = kingdomId === 'floorplanning'
    ? expandedLessonsList.filter((id) => player.levelProgress?.[id]?.completed).length
    : 0;
  const totalDisplayLevels = kingdomId === 'floorplanning'
    ? kingdom.levels.length + expandedLessonsList.length
    : kingdom.levels.length;
  const totalDisplayCompleted = completedLevels + expandedCompleted;

  // Sanity checks info
  const sanityChecks = getKingdomSanityChecks(kingdomId);
  const totalSanity = sanityChecks.length;
  const passedSanity = countPassedKingdomSanityChecks(player, kingdomId);
  const allSanityPassed = areAllKingdomSanityChecksPassed(player, kingdomId);

  const certifiableChecks = getKingdomCertifiableSanityChecks(kingdomId);
  const certifiableCount = certifiableChecks.length;
  const practiceCount = totalSanity - certifiableCount;

  // Total weighted progress
  const totalItems = totalDisplayLevels + totalSanity;
  const completedItems = totalDisplayCompleted + passedSanity;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  // Next kingdom info
  const prevKingdom = KINGDOMS.find((k) => k.order === kingdom.order - 1);
  const prevKingdomXP = prevKingdom ? getKingdomXP(player, prevKingdom.id) : 0;
  const xpNeeded = prevKingdom
    ? Math.max(0, prevKingdom.pointsToUnlockNext - prevKingdomXP)
    : 0;

  // Close modal and remove bookmarkable query parameter
  const handleCloseModal = () => {
    setActiveCheck(null);
    if (searchParams.has('check')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('check');
      setSearchParams(nextParams, { replace: true });
    }
  };

  // Open interactive verification modal
  const handleOpenCheck = (check) => {
    const auditInfo = getStudentDesignForSanityCheck(player, check.id);
    setStudentAuditInfo(auditInfo);
    // In explore mode or practice checks, default to demo mode
    setAuditMode(isExplore || auditInfo?.isPracticeOnly ? 'demo' : 'student');
    setDemoDefect(false);
    setActiveCheck(check);
    setRunningSimulation(false);

    const alreadyPassed = !isExplore && isSanityCheckPassed(player, check.id);
    setSimulationDone(alreadyPassed);
    setSimulationPassed(true);
    setSimulationCanCertify(alreadyPassed && !auditInfo?.isPracticeOnly && !isExplore);
    setSimulationLogs([]);

    if (searchParams.get('check') !== check.id) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('check', check.id);
      setSearchParams(nextParams, { replace: true });
    }
  };

  // Automatically open terminal if bookmarkable ?check= query parameter matches
  useEffect(() => {
    if (checkParam && kingdom) {
      if (activeCheck?.id !== checkParam) {
        const found = (kingdom.sanityChecks || []).find((c) => c.id === checkParam);
        if (found) {
          handleOpenCheck(found);
        }
      }
    } else if (!checkParam && activeCheck) {
      setActiveCheck(null);
    }
  }, [checkParam, kingdom, activeCheck]);


  // ESC key closes active verification modal (Fix 07)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeCheck) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCheck]);

  // Run EDA verification simulation
  const handleRunSimulation = () => {
    setRunningSimulation(true);
    setTimeout(() => {
      let result;
      if (!isExplore && auditMode === 'student') {
        result = evaluateSanityCheck(activeCheck.id, {
          isStudentDesign: true,
          hasStudentDesign: Boolean(studentAuditInfo?.canCertify && !studentAuditInfo?.isPracticeOnly),
          reason: studentAuditInfo?.reason,
          designData: studentAuditInfo?.designData || {},
        });
      } else {
        result = evaluateSanityCheck(activeCheck.id, {
          isStudentDesign: false,
          injectDefect: demoDefect,
        });
      }

      setSimulationLogs(result.logOutput || []);
      setSimulationPassed(result.passed);
      setSimulationCanCertify(!isExplore && result.canCertify);
      setRunningSimulation(false);
      setSimulationDone(true);
    }, 400);
  };

  // Sign off and certify check (Normal Game mode only)
  const handleCertifyCheck = () => {
    if (isExplore) {
      handleCloseModal();
      return;
    }
    if (activeCheck && simulationPassed && simulationCanCertify) {
      passSanityCheck(kingdom.id, activeCheck, activeCheck.xpReward);
      handleCloseModal();
    }
  };

  // Complete a practice-only drill
  const handleCompletePracticeDrill = () => {
    if (isExplore) {
      handleCloseModal();
      return;
    }
    if (activeCheck) {
      passSanityCheck(kingdom.id, activeCheck, 0);
      handleCloseModal();
    }
  };

  return (
    <div
      className="kingdom-page"
      style={{
        '--kingdom-gradient': kingdom.gradient,
        '--kingdom-color': kingdom.borderColor,
      }}
    >
      {/* Hero banner */}
      <div className="kingdom-page__hero">
        <div className="container kingdom-page__hero-inner">
          {/* Back button */}
          <Link
            to={isExplore ? "/explore" : "/world-map"}
            className="kingdom-page__back"
          >
            {isExplore ? "← Back to Explore Catalog" : "← Back to World Map"}
          </Link>

          <div className="kingdom-page__header">
            {/* Kingdom emoji */}
            <div className="kingdom-page__emoji-box">{kingdom.emoji}</div>

            <div style={{ flex: 1 }}>
              {/* Status badge */}
              <div style={{ marginBottom: '0.4rem' }}>
                {isExplore ? (
                  <span className="badge badge--available" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                    🧭 Explore Sandbox
                  </span>
                ) : (
                  <>
                    {status === 'locked' && <span className="badge badge--locked">🔒 Locked</span>}
                    {status === 'available' && <span className="badge badge--available">▶ In Progress</span>}
                    {status === 'completed' && <span className="badge badge--completed">✓ Stage Certified</span>}
                  </>
                )}
              </div>

              <h1 className="kingdom-page__title">{kingdom.name}</h1>
              <p className="kingdom-page__subtitle">{kingdom.subtitle}</p>
              <p className="kingdom-page__description">{kingdom.description}</p>

              {/* Subconcept chip */}
              <div className="kingdom-page__subconcept">
                🎯 Focus: {kingdom.subconcept}
              </div>
            </div>

            {/* Quick stats widget */}
            <div className="kingdom-page__stats-card">
              <div className="kingdom-page__stat-item">
                <span className="kingdom-page__stat-label">{isExplore ? "Nominal XP" : "Kingdom XP"}</span>
                <span className="kingdom-page__stat-value">{kingdomXP} XP</span>
              </div>
              <div className="kingdom-page__stat-item">
                <span className="kingdom-page__stat-label">Levels</span>
                <span className="kingdom-page__stat-value">
                  {kingdom.id === 'floorplanning'
                    ? (isExplore ? '36 Lessons' : `${totalDisplayCompleted}/36`)
                    : (isExplore ? `${kingdom.levels.length} Available` : `${completedLevels}/${kingdom.levels.length}`)}
                </span>
              </div>
              {totalSanity > 0 && (
                <div className="kingdom-page__stat-item">
                  <span className="kingdom-page__stat-label">Sanity Checks</span>
                  <span className="kingdom-page__stat-value">
                    {isExplore ? `${totalSanity} Checks` : `${passedSanity}/${totalSanity}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Explore Mode Active Banner */}
        {isExplore && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              padding: '12px 18px',
              borderRadius: '10px',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🧭</span>
              <div>
                <strong>Explore Sandbox Active:</strong> All {kingdom.id === 'floorplanning' ? 36 : kingdom.levels.length} lessons and {totalSanity} sanity checks in {kingdom.name} are unlocked for free browsing. Simulations run ephemerally and Normal Game progress remains isolated.
              </div>
            </div>
            <Link to="/explore" className="btn btn--secondary btn--sm">
              All Kingdoms ›
            </Link>
          </div>
        )}

        {/* Unlock warning if locked in Normal Game mode */}
        {!unlocked && !isExplore && (
          <div className="kingdom-page__lock-banner">
            <span style={{ fontSize: '2rem' }}>🔒</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>This Kingdom is Locked</h3>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Earn {xpNeeded} more XP in {prevKingdom?.name} and complete core lessons to unlock {kingdom.name}.
              </p>
            </div>
            <Link to={`/kingdom/${prevKingdom?.id}`} className="btn btn--primary">
              Go to {prevKingdom?.name}
            </Link>
          </div>
        )}

        {/* Unlocked content */}
        {(unlocked || isExplore) && (
          <>
            {/* Embedded Studio Companion Workspace */}
            
            {kingdom.id === 'floorplanning' && (
              <div className="kingdom-external-lab-card fp-studio-banner" data-testid="fp-studio-banner" style={{ border: '2px solid #0284c7', background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(30, 58, 95, 0.12))' }}>
                <div className="kingdom-external-lab-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h3>📐 Floorplanning Studio 3.0 (Professional CAD Workspace)</h3>
                    <span className="badge badge--available">Full EDA CAD Suite</span>
                  </div>
                  <p>
                    Professional physical design environment: interactive component creation (macros, pins, blockages, straps, vias), automated EDA assistants (macro legalizer, pin legalizer, PDN grid synthesizer), nodal resistive IR drop solver, 2D congestion analyzer, measurement ruler, and Pareto candidate comparison across 36 lessons.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link
                    to={isExplore ? "/explore/studio/floorplanning" : "/studio/floorplanning"}
                    className="btn btn--primary"
                    style={{ fontWeight: 800 }}
                  >
                    📐 Open Floorplan Studio 3.0 →
                  </Link>
                </div>
              </div>
            )}

            {kingdom.id === 'rtl-understanding' && (
              <div className="kingdom-external-lab-card">
                <div className="kingdom-external-lab-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h3>⚡ RTL Digital Logic Studio (Integrated Suite)</h3>
                    <span className="badge badge--available">Native Embedding</span>
                  </div>
                  <p>
                    Open-ended circuit creation, waveform viewer, 8-bit ALU/datapath designer, and Moore/Mealy FSM studio across 24 lessons.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => setShowInlineStudio(!showInlineStudio)}
                  >
                    {showInlineStudio ? '▲ Collapse In-Page Studio' : '⚡ Open In-Page Studio'}
                  </button>
                  <Link
                    to={isExplore ? "/studio/rtl?from=explore" : "/studio/rtl"}
                    className="btn btn--secondary"
                  >
                    🖥️ Dedicated Studio Page
                  </Link>
                  <a
                    href="https://ppawar-7.github.io/rtl-playground/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--ghost"
                  >
                    External Tab ↗
                  </a>
                </div>

                {/* Collapsible Inline Studio Iframe */}
                {showInlineStudio && (
                  <div style={{ width: '100%', marginTop: '1.25rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                    <iframe
                      src={`${(import.meta.env.BASE_URL || '/').replace(/\/+$/, '')}/studios/rtl/index.html`}
                      title="RTL Playground In-Page Studio"
                      style={{ width: '100%', height: '700px', border: 'none', display: 'block', background: '#050811' }}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                    />
                  </div>
                )}
              </div>
            )}

            {(kingdom.id === 'synthesis' || kingdom.id === 'placement' || kingdom.id === 'cts' || kingdom.id === 'routing') && (
              <div className="kingdom-external-lab-card">
                <div className="kingdom-external-lab-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h3>⏱️ Static Timing Analysis (STA) Studio (Integrated Suite)</h3>
                    <span className="badge badge--available">Native Embedding</span>
                  </div>
                  <p>
                    {kingdom.id === 'synthesis' && 'Pre-layout STA: Analyze setup/hold slack against SDC clock definitions and standard-cell delays.'}
                    {kingdom.id === 'placement' && 'Placement STA: Evaluate estimated wire delays and setup margins following cell legalization.'}
                    {kingdom.id === 'cts' && 'Post-CTS STA: Observe how real clock skew and insertion latency impact timing slack. (Note: CTS builds the physical clock tree; STA verifies timing).'}
                    {kingdom.id === 'routing' && 'Post-route sign-off STA: Analyze extracted parasitic RC net delays and crosstalk derating.'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => setShowInlineStudio(!showInlineStudio)}
                  >
                    {showInlineStudio ? '▲ Collapse In-Page Studio' : '⚡ Open In-Page Studio'}
                  </button>
                  <Link
                    to={isExplore ? `/studio/sta?stage=${kingdom.id}&from=explore` : `/studio/sta?stage=${kingdom.id}`}
                    className="btn btn--secondary"
                  >
                    🖥️ Dedicated Studio Page
                  </Link>
                  <a
                    href="https://ppawar-7.github.io/sta-playground/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--ghost"
                  >
                    External Tab ↗
                  </a>
                </div>

                {/* Collapsible Inline Studio Iframe */}
                {showInlineStudio && (
                  <div style={{ width: '100%', marginTop: '1.25rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
                    <iframe
                      src={`${(import.meta.env.BASE_URL || '/').replace(/\/+$/, '')}/studios/sta/index.html`}
                      title="STA Playground In-Page Studio"
                      style={{ width: '100%', height: '700px', border: 'none', display: 'block', background: '#050811' }}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Progress bar in normal mode */}
            {!isExplore && (
              <div className="kingdom-page__progress-section">
                <div className="kingdom-page__progress-header">
                  <h2 style={{ fontSize: '1.1rem' }}>Stage Progress</h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {progressPercent}% complete ({completedItems}/{totalItems} tasks)
                  </span>
                </div>
                <div className="progress-bar" style={{ height: '12px' }}>
                  <div
                    className={`progress-bar__fill ${status === 'completed' ? 'progress-bar__fill--green' : ''}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Stage sign-off gatekeeper info */}
                {certifiableCount > 0 && (
                  <div className="kingdom-page__gatekeeper-note">
                    <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                    <div>
                      <strong>Stage Certification:</strong> Complete all {kingdom.levels.length} core levels above,
                      then verify all {certifiableCount} Certifiable Educational Checks to certify your layout geometry
                      and earn the +50 XP stage completion bonus! ({practiceCount} additional practice drills are available for fault exploration).
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── MAIN LEVELS SECTION ──────────────────────── */}
            <div className="kingdom-page__section-wrapper">
              {kingdom.id === 'floorplanning' ? (
                <details className="fp-curriculum-module fp-module-accordion" open>
                  <summary className="fp-curriculum-module__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: '#0284c7' }}>Module 1: Core Fundamentals &amp; Placement Unlock</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(5 Lessons — Required to unlock Placement)</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700 }}>Expand / Collapse</span>
                  </summary>
                  <div className="kingdom-page__levels-list" style={{ padding: '0.75rem 0' }}>
                    {kingdom.levels.map((level) => (
                      <LevelCard
                        key={level.id}
                        kingdom={kingdom}
                        level={level}
                        isExploreMode={isExplore}
                      />
                    ))}
                  </div>
                </details>
              ) : (
                <>
                  <div className="kingdom-page__section-title-row">
                    <h2 className="kingdom-page__levels-title">
                      📚 Part 1: Core Concept Levels
                    </h2>
                    <span className="badge badge--available">
                      {isExplore ? "5 Lessons Unlocked" : `${completedLevels}/${kingdom.levels.length} Complete`}
                    </span>
                  </div>

                  <div className="kingdom-page__levels-list">
                    {kingdom.levels.map((level) => (
                      <LevelCard
                        key={level.id}
                        kingdom={kingdom}
                        level={level}
                        isExploreMode={isExplore}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            
            {/* ─── FLOORPLANNING 3.0 COMPLETE CURRICULUM MODULES (Modules 2 – 8) ─── */}
            {kingdom.id === 'floorplanning' && (
              <div className="kingdom-page__section-wrapper" style={{ marginTop: '2.5rem' }}>
                <div className="kingdom-page__section-title-row">
                  <div>
                    <h2 className="kingdom-page__levels-title">
                      🎓 Part 2: Comprehensive Engineering Curriculum (Modules 2 – 8)
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.25rem 0 0' }}>
                      31 in-depth engineering lessons covering die architecture, macro legalization, PDN synthesis, resistive IR drop analysis, congestion routing, open-ended authoring, and capstones.
                    </p>
                  </div>
                  <span className="badge badge--available">
                    31 Engineering Lessons
                  </span>
                </div>

                <div className="fp-curriculum-modules-list" style={{ marginTop: '1rem' }}>
                  {FP_MODULES.map((mod) => {
                    const modCompletedCount = mod.range.filter((lvlId) => player.levelProgress?.[lvlId]?.completed).length;
                    return (
                      <details key={mod.num} className="fp-curriculum-module fp-module-accordion" open>
                        <summary className="fp-curriculum-module__header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, color: '#0284c7' }}>{mod.title}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({mod.range.length} Lessons)</span>
                            <span className="fp-module-progress-chip">
                              {modCompletedCount}/{mod.range.length} Done
                            </span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700 }}>Expand / Collapse</span>
                        </summary>
                        <p style={{ padding: '0.5rem 1.25rem 0', margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                          {mod.desc}
                        </p>
                        <div className="fp-curriculum-module__body">
                          {mod.range.map((lvlId) => {
                            const lData = EXPANDED_LESSONS[lvlId];
                            if (!lData) return null;
                            const completed = Boolean(player.levelProgress?.[lvlId]?.completed);
                            const isCapstone24 = lvlId === 'fp-24';
                            const isCapstone36 = lvlId === 'fp-36';
                            const isCapstone = isCapstone24 || isCapstone36;

                            return (
                              <div
                                key={lvlId}
                                className={`fp-lesson-card ${isCapstone ? 'fp-lesson-card--capstone' : ''}`}
                              >
                                <div className="fp-lesson-card__header">
                                  <span className="fp-lesson-card__id">{lvlId.toUpperCase()}</span>
                                  {isCapstone24 && (
                                    <span className="fp-capstone-badge">🏆 Capstone 1</span>
                                  )}
                                  {isCapstone36 && (
                                    <span className="fp-capstone-badge fp-capstone-badge--gold">👑 Final SoC Capstone</span>
                                  )}
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{lData.duration}</span>
                                </div>
                                <h4 className="fp-lesson-card__title">{lData.title}</h4>
                                <p className="fp-lesson-card__desc">{lData.description}</p>
                                <div className="fp-lesson-card__footer">
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>
                                    ⭐ +{lData.xpReward} XP
                                  </span>
                                  <Link
                                    to={isExplore ? "/explore/kingdom/floorplanning/level/" + lvlId : "/kingdom/floorplanning/level/" + lvlId}
                                    className={`btn ${completed ? 'btn--secondary' : isCapstone ? 'btn--primary' : 'btn--secondary'} btn--sm`}
                                    style={{ fontSize: '0.75rem' }}
                                  >
                                    {completed ? '✓ Review' : isCapstone ? '🚀 Launch Capstone' : '▶ Start'}
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── SANITY CHECK SIDE QUESTS SECTION ─────────── */}
            {totalSanity > 0 && (
              <div className="kingdom-page__sanity-section">
                <div className="kingdom-page__section-title-row">
                  <div>
                    <h2 className="kingdom-page__sanity-title">
                      🛡️ Part 2: Stage Sanity Checks (Rule Verification)
                    </h2>
                    <p className="kingdom-page__sanity-subtitle">
                      Educational physical design rule checks evaluate your layout geometry against analytical EDA models.
                    </p>
                  </div>
                  <span className={`badge ${allSanityPassed ? 'badge--completed' : 'badge--available'}`}>
                    {isExplore
                      ? `${certifiableCount} Certifiable · ${practiceCount} Drills`
                      : allSanityPassed
                      ? '✓ All Certified'
                      : `${passedSanity}/${totalSanity} Passed`}
                  </span>
                </div>

                {!isExplore && !levelsDone && (
                  <div className="kingdom-page__sanity-locked-alert">
                    <span>🔒</span>
                    <div>
                      <strong>Sanity Checks on standby:</strong> Finish all {kingdom.levels.length} core levels
                      above to generate the design database and activate these sign-off audits!
                    </div>
                  </div>
                )}

                <div className="kingdom-page__sanity-grid">
                  {sanityChecks.map((check) => {
                    const req = SANITY_CHECK_REQUIREMENTS[check.id];
                    const isCertifiable = req?.classification === CHECK_CLASSIFICATION.CERTIFIABLE_EDUCATIONAL_CHECK;
                    const isPractice = req?.classification === CHECK_CLASSIFICATION.PRACTICE_ONLY;

                    const checkStatus = isExplore ? 'available' : getSanityCheckStatus(player, kingdom.id, check);
                    const isStale = !isExplore && checkStatus === 'stale';
                    const isCertified = !isExplore && checkStatus === 'certified';
                    const isDrilled = !isExplore && checkStatus === 'passed';
                    const isUnlocked = isExplore || checkStatus === 'available' || isCertified || isDrilled || isStale;

                    return (
                      <div
                        key={check.id}
                        className={`sanity-card ${isCertified ? 'sanity-card--passed' : ''} ${isStale ? 'sanity-card--stale' : ''} ${!isUnlocked ? 'sanity-card--locked' : ''}`}
                        onClick={() => handleOpenCheck(check)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="sanity-card__header">
                          <span className="sanity-card__icon">{check.icon}</span>
                          <span className="sanity-card__category">{check.category}</span>

                          {/* Honest Badges */}
                          {isExplore ? (
                            isCertifiable ? (
                              <span className="sanity-card__badge-available">🧭 EXPLORE AUDIT</span>
                            ) : (
                              <span className="sanity-card__badge-practice">🔬 PRACTICE DRILL</span>
                            )
                          ) : isStale ? (
                            <span className="sanity-card__badge-stale">⚠️ REVISION NEEDED (STALE)</span>
                          ) : isCertified ? (
                            <span className="sanity-card__badge-pass">✓ CERTIFIED</span>
                          ) : isDrilled ? (
                            <span className="sanity-card__badge-practice">✓ DRILLED</span>
                          ) : isPractice ? (
                            <span className="sanity-card__badge-practice">🔬 PRACTICE DRILL</span>
                          ) : isUnlocked ? (
                            <span className="sanity-card__badge-available">▶ READY FOR AUDIT</span>
                          ) : (
                            <span className="sanity-card__badge-lock">🔒 LOCKED</span>
                          )}
                        </div>

                        <h3 className="sanity-card__title">{check.name}</h3>
                        <p className="sanity-card__full-name">{check.fullName}</p>
                        <p className="sanity-card__description">{check.description}</p>

                        <details className="sanity-card__command-details" onClick={(e) => e.stopPropagation()}>
                          <summary><code>$ {check.command.split(' ')[0]} ...</code></summary>
                          <div className="sanity-card__command-full">
                            <code>$ {check.command}</code>
                          </div>
                        </details>

                        <div className="sanity-card__footer">
                          {/* Honest Reward Label */}
                          {isPractice ? (
                            <span className="sanity-card__reward">Practice Only (0 XP)</span>
                          ) : isExplore ? (
                            <span className="sanity-card__reward">Explore Sandbox (0 XP)</span>
                          ) : isStale ? (
                            <span className="sanity-card__reward" style={{ color: '#d97706' }}>⚠️ Needs Revalidation</span>
                          ) : isCertified ? (
                            <span className="sanity-card__reward">⭐ +{check.xpReward} XP (Earned)</span>
                          ) : (
                            <span className="sanity-card__reward">⭐ +{check.xpReward} XP</span>
                          )}

                          {/* Action Button */}
                          {isExplore ? (
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={(e) => { e.stopPropagation(); handleOpenCheck(check); }}
                            >
                              ▶ Run Verification
                            </button>
                          ) : isStale ? (
                            <button
                              className="btn btn--secondary btn--sm"
                              style={{ borderColor: '#f59e0b', color: '#b45309' }}
                              onClick={(e) => { e.stopPropagation(); handleOpenCheck(check); }}
                            >
                              ⚠️ Revalidate Check
                            </button>
                          ) : isCertified ? (
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={(e) => { e.stopPropagation(); handleOpenCheck(check); }}
                            >
                              ✓ View Sign-Off
                            </button>
                          ) : isDrilled ? (
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={(e) => { e.stopPropagation(); handleOpenCheck(check); }}
                            >
                              ✓ View Drill
                            </button>
                          ) : isUnlocked ? (
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={(e) => { e.stopPropagation(); handleOpenCheck(check); }}
                            >
                              {isPractice ? '🔬 Practice Drill' : '▶ Inspect Audit'}
                            </button>
                          ) : (
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={(e) => { e.stopPropagation(); handleOpenCheck(check); }}
                            >
                              🔒 Locked
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── SANITY CHECK VERIFICATION TERMINAL MODAL ─── */}
      {activeCheck && (
        <div className="sanity-modal-overlay" onClick={handleCloseModal}>
          <div className="sanity-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sanity-modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.8rem' }}>{activeCheck.icon}</span>
                <div>
                  <h2 style={{ fontSize: '1.3rem', margin: 0 }}>
                    Sanity Check: {activeCheck.name}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {kingdom.name} · Step #{activeCheck.order} · {activeCheck.category}
                    {isExplore && " · [Explore Sandbox]"}
                  </span>
                </div>
              </div>
              <button
                className="sanity-modal__close"
                onClick={handleCloseModal}
              >
                ✕
              </button>
            </div>

            <div className="sanity-modal__body">
              <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1rem', lineHeight: 1.6 }}>
                {activeCheck.description}
              </p>

              {/* Mode Selection Tabs */}
              {!isExplore && (
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '0.5rem',
                }}>
                  <button
                    type="button"
                    style={{
                      padding: '0.45rem 0.9rem',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: auditMode === 'student' ? '#0284c7' : '#cbd5e1',
                      background: auditMode === 'student' ? '#0284c7' : '#f8fafc',
                      color: auditMode === 'student' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setAuditMode('student');
                      setSimulationDone(false);
                      setSimulationLogs([]);
                    }}
                  >
                    🎓 Student Design Verification (Sign-Off)
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: '0.45rem 0.9rem',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: auditMode === 'demo' ? '#7c3aed' : '#cbd5e1',
                      background: auditMode === 'demo' ? '#7c3aed' : '#f8fafc',
                      color: auditMode === 'demo' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setAuditMode('demo');
                      setSimulationDone(false);
                      setSimulationLogs([]);
                    }}
                  >
                    🔬 Demonstration &amp; Fault Drill (Practice Only)
                  </button>
                </div>
              )}

              {/* Status Context Banner */}
              {isExplore ? (
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  color: '#1e40af',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span>
                      <strong>🧭 Explore Sandbox Mode:</strong> Reference design evaluation. Stage certification XP is not awarded and Normal Game progress remains isolated.
                    </span>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                        <input
                          type="radio"
                          name="sanity-explore-defect"
                          checked={!demoDefect}
                          onChange={() => { setDemoDefect(false); setSimulationDone(false); }}
                        />
                        <span>Nominal Clean</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.82rem', color: '#b91c1c' }}>
                        <input
                          type="radio"
                          name="sanity-explore-defect"
                          checked={demoDefect}
                          onChange={() => { setDemoDefect(true); setSimulationDone(false); }}
                        />
                        <span>Inject Fault</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : auditMode === 'student' ? (
                <div style={{
                  background: studentAuditInfo?.canCertify ? '#f0fdf4' : (studentAuditInfo?.isPracticeOnly ? '#f5f3ff' : '#fffbeb'),
                  border: `1px solid ${studentAuditInfo?.canCertify ? '#bbf7d0' : (studentAuditInfo?.isPracticeOnly ? '#ddd6fe' : '#fef3c7')}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  color: studentAuditInfo?.canCertify ? '#166534' : (studentAuditInfo?.isPracticeOnly ? '#5b21b6' : '#92400e'),
                }}>
                  {studentAuditInfo?.isPracticeOnly ? (
                    <div>
                      <strong>🔬 Educational Practice Drill:</strong> {studentAuditInfo?.reason}
                    </div>
                  ) : studentAuditInfo?.canCertify ? (
                    <div>
                      <strong>✓ Verified Student Design Ready:</strong> This check evaluates your layout parameters generated from <strong>{studentAuditInfo.requirement?.prerequisiteLevels.join(', ')}</strong>. Passing this audit certifies your design and awards +{activeCheck.xpReward} XP.
                    </div>
                  ) : (
                    <div>
                      <strong>⚠️ Prerequisite Design Required:</strong> {studentAuditInfo?.reason || 'Complete prerequisite levels first.'} Stage certification cannot be awarded until you complete the prerequisite level(s).
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  color: '#5b21b6',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span>
                      <strong>ℹ️ Demonstration Mode:</strong> Inspecting preset reference designs. Stage certification XP cannot be earned in this mode.
                    </span>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                        <input
                          type="radio"
                          name="sanity-demo-defect"
                          checked={!demoDefect}
                          onChange={() => { setDemoDefect(false); setSimulationDone(false); }}
                        />
                        <span>Nominal Clean</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.82rem', color: '#b91c1c' }}>
                        <input
                          type="radio"
                          name="sanity-demo-defect"
                          checked={demoDefect}
                          onChange={() => { setDemoDefect(true); setSimulationDone(false); }}
                        />
                        <span>Inject Fault</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* EDA Verification Terminal */}
              <div className="sanity-terminal">
                <div className="sanity-terminal__titlebar">
                  <span className="sanity-terminal__dot sanity-terminal__dot--red" />
                  <span className="sanity-terminal__dot sanity-terminal__dot--yellow" />
                  <span className="sanity-terminal__dot sanity-terminal__dot--green" />
                  <span className="sanity-terminal__title">
                    Educational Rule Check Terminal — {activeCheck.fullName} {isExplore ? '(Explore Mode)' : ''}
                  </span>
                </div>
                <div className="sanity-terminal__content">
                  <div className="sanity-terminal__line">
                    <span className="sanity-terminal__prompt">$</span> {activeCheck.command}
                  </div>

                  {runningSimulation && (
                    <div className="sanity-terminal__line sanity-terminal__line--amber">
                      [EXEC] Simulating EDA command evaluation... please wait...
                    </div>
                  )}

                  {simulationDone && (
                    <>
                      <div className="sanity-terminal__line sanity-terminal__line--dim">
                        [INIT] Command: {activeCheck.command}
                      </div>
                      {simulationLogs.map((log, index) => {
                        let lineClass = '';
                        if (log.includes('PASSED') || log.includes('CLEAN_PASS') || log.includes('100%')) {
                          lineClass = 'sanity-terminal__line--green';
                        } else if (log.includes('VIOLATION') || log.includes('FAIL') || log.includes('OVER_BUDGET') || log.includes('OVERFLOW')) {
                          lineClass = 'sanity-terminal__line--red';
                        } else if (log.includes('⚠️') || log.includes('Warning') || log.includes('DEMONSTRATION')) {
                          lineClass = 'sanity-terminal__line--amber';
                        } else if (log.includes('ℹ️') || log.includes('[RULE-ENGINE]')) {
                          lineClass = 'sanity-terminal__line--dim';
                        }

                        return (
                          <div key={index} className={`sanity-terminal__line ${lineClass}`}>
                            {log}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="sanity-modal__footer sanity-modal__actions" style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                {!simulationDone ? (
                  <button
                    type="button"
                    className="btn btn--primary btn--lg w-full"
                    onClick={handleRunSimulation}
                    disabled={runningSimulation}
                  >
                    {runningSimulation ? '⏳ Evaluating Ruledeck...' : `▶ Run EDA Verification: ${activeCheck.name}`}
                  </button>
                ) : isExplore ? (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <div className="sanity-modal__passed-notice" style={{ marginBottom: '0.75rem' }}>
                      {simulationPassed
                        ? '✓ Reference Example Passed — Explore Mode (Practice Result — No XP Awarded)'
                        : '⚠️ Fault Detected in Defect Injection Run — Explore Mode'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        type="button"
                        className="btn btn--secondary btn--lg"
                        style={{ flex: 1 }}
                        onClick={handleCloseModal}
                      >
                        Close Terminal
                      </button>
                      <Link
                        to="/explore"
                        className="btn btn--primary btn--lg"
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                      >
                        Explore Catalog ›
                      </Link>
                    </div>
                  </div>
                ) : isSanityCheckPassed(player, activeCheck.id) ? (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <div className="sanity-modal__passed-notice" style={{ marginBottom: '0.75rem' }}>
                      ✓ <strong>Stage Check Verified:</strong> This rule check is certified and current.
                    </div>
                    <button
                      type="button"
                      className="btn btn--secondary btn--lg w-full"
                      onClick={handleCloseModal}
                    >
                      Close Audit Window
                    </button>
                  </div>
                ) : simulationPassed && simulationCanCertify ? (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <div className="sanity-modal__passed-notice" style={{ marginBottom: '0.75rem' }}>
                      ✓ <strong>Student Design Certified:</strong> Your design layout satisfies all physical ruledeck criteria.
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--lg w-full"
                      onClick={handleCertifyCheck}
                    >
                      🛡️ Sign-Off &amp; Certify Stage Check (+{activeCheck.xpReward} XP)
                    </button>
                  </div>
                ) : simulationPassed && !simulationCanCertify ? (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <div style={{
                      background: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      color: '#5b21b6',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      marginBottom: '0.75rem',
                    }}>
                      ℹ️ <strong>Demonstration Passed:</strong> Reference drill verified clean. Practice drills award 0 certification XP.
                    </div>
                    <button
                      type="button"
                      className="btn btn--secondary btn--lg w-full"
                      onClick={handleCompletePracticeDrill}
                    >
                      ✓ Practice Drill Complete (Close)
                    </button>
                  </div>
                ) : (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#b91c1c',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      marginBottom: '0.75rem',
                      lineHeight: 1.4,
                    }}>
                      ⚠️ <strong>Ruledeck Violation:</strong> Design failed physical verification criteria. Check diagnostics above.
                    </div>
                    <button
                      type="button"
                      className="btn btn--secondary btn--lg w-full"
                      onClick={handleCloseModal}
                    >
                      Close &amp; Revise Design
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
