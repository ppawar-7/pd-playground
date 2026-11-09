/**
 * FPExpandedLessonChallenge.jsx
 * ==============================
 * Interactive curriculum challenge component for Floorplanning Kingdom 3.0 (fp-6 through fp-36).
 * Driven by fpExpandedCurriculumData.js.
 */

import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PhysicalCanvas from '../../../components/engineering/PhysicalCanvas.jsx';
import { EXPANDED_LESSONS } from './fpExpandedCurriculumData.js';
import { deserializeProject } from '../../../engine/floorplanProjectModel.js';
import { evaluateFloorplanSignoff } from '../../../engine/floorplanSignoff.js';

// Keys shared with FloorplanStudioPage (Normal Game: localStorage; Explore: this session only).
const STUDIO_KEY = 'pdplayground_floorplan_v1';
const STUDIO_EXPLORE_KEY = 'pdplayground_floorplan_explore_v1';

function loadStudioProject(isExplore) {
  try {
    const raw = isExplore
      ? window.sessionStorage.getItem(STUDIO_EXPLORE_KEY)
      : window.localStorage.getItem(STUDIO_KEY);
    return raw ? deserializeProject(raw) : null;
  } catch {
    return null;
  }
}

// Deterministic option order so the correct answer is not always option A.
function stableShuffle(options, salt) {
  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  return [...options].sort((a, b) => hash(salt + a.value) - hash(salt + b.value));
}

function LessonQuestion({ lessonId, question, value, onChange }) {
  const options = useMemo(() => stableShuffle(question.options, lessonId + question.field), [lessonId, question]);
  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="mux-quiz-prompt">{question.prompt}</div>
      <div className="mux-quiz-options-group">
        {options.map((opt, i) => (
          <label key={opt.value} className={`mux-quiz-option ${value === opt.value ? 'selected' : ''}`}>
            <input
              type="radio"
              name={`${lessonId}-${question.field}`}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(question.field, opt.value)}
            />
            <span className="mux-quiz-letter">{String.fromCharCode(65 + i)}</span>
            <span className="mux-quiz-text">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function FPExpandedLessonChallenge({ level, kingdom, onVerify, alreadyCompleted }) {
  const lessonId = level?.id || 'fp-6';
  const lesson = EXPANDED_LESSONS[lessonId] || EXPANDED_LESSONS['fp-6'];
  const location = useLocation();
  const isExplore = location.pathname.startsWith('/explore');
  const studioPath = `${isExplore ? '/explore/studio/floorplanning' : '/studio/floorplanning'}?assignment=${lessonId}`;
  const [studioProject, setStudioProject] = useState(() => loadStudioProject(isExplore));
  const projectReport = useMemo(
    () => (studioProject ? evaluateFloorplanSignoff(studioProject) : null),
    [studioProject],
  );
  const capstoneReport = projectReport;

  // Universal state store for inputs
  const [formData, setFormData] = useState({});
  const [validationResult, setValidationResult] = useState(null);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lesson.validate) {
      const fresh = loadStudioProject(isExplore);
      if (fresh) setStudioProject(fresh);
      const inputs = { ...formData, ...(fresh ? { project: fresh } : {}) };
      const result = lesson.validate(inputs);
      setValidationResult(result);
      if (result.passed && onVerify) {
        onVerify(result);
      }
    }
  };

  const canvasCfg = lesson.canvas || { dieWidth: 600, dieHeight: 500, coreWidth: 500, coreHeight: 400, margin: 50 };

  return (
    <div className="fp-expanded-challenge">
      {/* Module & Concept Banner */}
      <div className="combseq-concept-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge--available" style={{ background: '#1e3a5f', color: '#38bdf8', borderColor: '#0284c7' }}>
            {lesson.moduleTitle}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Lesson {lesson.id.toUpperCase()} · Duration: {lesson.duration}
          </span>
        </div>
        <h3 className="combseq-heading fp-expanded-challenge__title">
          📐 {lesson.title}
        </h3>
        <p className="combseq-desc" style={{ whiteSpace: 'pre-line' }}>
          {lesson.concept}
        </p>
      </div>

      {/* Interactive Silicon Canvas Preview */}
      <div className="card combseq-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="badge badge--available">Reference Layout</span>
          <Link
            to={studioPath}
            className="btn btn--secondary btn--sm"
            style={{ fontSize: '0.75rem' }}
          >
            Open in Dedicated Studio ↗
          </Link>
        </div>
        <PhysicalCanvas
          dieWidth={canvasCfg.dieWidth}
          dieHeight={canvasCfg.dieHeight}
          coreWidth={canvasCfg.coreWidth}
          coreHeight={canvasCfg.coreHeight}
          margin={canvasCfg.margin || 50}
          macros={canvasCfg.macros || [{ id: 'SRAM_CORE', x: 40, y: 40, width: 120, height: 90, halo: 15 }]}
          showPowerRings={true}
        />
      </div>

      {/* Live Floorplan Studio Telemetry Card */}
      <div className="card combseq-card" style={{ borderLeft: '4px solid #38bdf8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h4 className="dff-challenge__section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🛠️</span> Live Studio Design Evidence
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {studioProject?.assignmentId === lessonId ? (
              <span className="badge badge--completed" style={{ background: '#065f46', color: '#34d399', fontSize: '0.75rem' }}>
                ✓ Assignment Matched ({lessonId.toUpperCase()})
              </span>
            ) : studioProject?.assignmentId ? (
              <span className="badge badge--warning" style={{ background: '#854d0e', color: '#fde047', fontSize: '0.75rem' }}>
                ⚠️ Active: {studioProject.assignmentId.toUpperCase()}
              </span>
            ) : (
              <span className="badge badge--locked" style={{ fontSize: '0.75rem' }}>
                No Scenario Loaded
              </span>
            )}
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                const fresh = loadStudioProject(isExplore);
                setStudioProject(fresh);
              }}
              title="Refresh project telemetry from Studio"
            >
              ↻ Sync
            </button>
            <Link
              to={studioPath}
              data-testid="btn-launch-studio-assignment"
              className="btn btn--primary btn--sm"
              style={{ textDecoration: 'none' }}
              title="Launch CAD Studio with this lesson scenario"
            >
              🚀 Launch Assignment in Studio ↗
            </Link>
          </div>
        </div>

        {studioProject ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '0.5rem', background: '#0f172a', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Project:</span>
              <div style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{studioProject.name}</div>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Core Size / AR:</span>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>{studioProject.core?.width}×{studioProject.core?.height} µm ({(studioProject.core?.height / (studioProject.core?.width || 1)).toFixed(2)})</div>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Macros / DRC:</span>
              <div style={{ fontWeight: 600, color: (projectReport?.clean ? '#22c55e' : '#f59e0b') }}>
                {(studioProject.macros || []).length} macros ({projectReport?.clean ? 'Clean' : `${projectReport?.violations?.length} Violations`})
              </div>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Static IR Droop:</span>
              <div style={{ fontWeight: 600, color: (projectReport?.metrics?.maxIRDropMv <= 30 ? '#22c55e' : '#ef4444') }}>
                {projectReport?.metrics?.maxIRDropMv !== undefined ? `${projectReport.metrics.maxIRDropMv} mV` : 'N/A'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', color: '#94a3b8' }}>
            No saved project found {isExplore ? 'in this Explore session' : 'for your Normal Game'}.
            Launch the <Link to={studioPath} style={{ color: '#38bdf8' }}>Floorplan Studio</Link> to author or customize your layout, click <strong>Save Project</strong>, then return here to sign off.
          </div>
        )}
      </div>

      {/* Dynamic Interactive Input Form for each lesson */}
      <form onSubmit={handleSubmit}>
        {/* FP-6 Aspect Ratio */}
        {lesson.id === 'fp-6' && (
          <div className="card combseq-card">
            <h4 className="dff-challenge__section-title">Step 1: Calculate Aspect Ratio (Core: 500 × 300 µm)</h4>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <label className="accum-port-label">Aspect Ratio (Height / Width):</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="e.g. 0.6"
                  className="syn-opt-input"
                  value={formData.aspectRatio || ''}
                  onChange={(e) => handleFieldChange('aspectRatio', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* FP-7 Gate Count Estimation */}
        {lesson.id === 'fp-7' && (
          <div className="card combseq-card">
            <h4 className="dff-challenge__section-title">Calculate Silicon Budgets (100k NAND2 Gates @ 12.5 µm²/GE, 70% Target Util)</h4>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <label className="accum-port-label">StdCell Area (µm²):</label>
                <input
                  type="number"
                  placeholder="e.g. 1250000"
                  className="syn-opt-input"
                  value={formData.stdCellArea || ''}
                  onChange={(e) => handleFieldChange('stdCellArea', e.target.value)}
                />
              </div>
              <div>
                <label className="accum-port-label">Required Core Area (µm²):</label>
                <input
                  type="number"
                  placeholder="e.g. 1785714"
                  className="syn-opt-input"
                  value={formData.requiredCoreArea || ''}
                  onChange={(e) => handleFieldChange('requiredCoreArea', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* FP-8 Placement Rows */}
        {lesson.id === 'fp-8' && (
          <div className="card combseq-card">
            <h4 className="dff-challenge__section-title">Step 1: Compute Row Count (Core Height: 350 µm, Row Height: 2.72 µm)</h4>
            <div style={{ marginTop: '0.75rem' }}>
              <label className="accum-port-label">Legal Row Count (floor(Height / RowHeight)):</label>
              <input
                type="number"
                placeholder="e.g. 128"
                className="syn-opt-input"
                value={formData.rowCount || ''}
                onChange={(e) => handleFieldChange('rowCount', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* FP-11 Keepout Halos */}
        {lesson.id === 'fp-11' && (
          <div className="card combseq-card">
            <h4 className="dff-challenge__section-title">Step 1: Calculate Minimum Separation Channel (Macro A halo = 15 µm, Macro B halo = 20 µm)</h4>
            <div style={{ marginTop: '0.75rem' }}>
              <label className="accum-port-label">Minimum Separation (haloA + haloB) (µm):</label>
              <input
                type="number"
                placeholder="e.g. 35"
                className="syn-opt-input"
                value={formData.requiredSeparation || ''}
                onChange={(e) => handleFieldChange('requiredSeparation', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* FP-14 Pin pitch: real coordinates checked by the Studio's pin-spacing rule */}
        {lesson.id === 'fp-14' && (
          <div className="card combseq-card">
            <h4 className="dff-challenge__section-title">Place two I/O pins on the top edge (core width 500 µm, minimum pitch 10 µm)</h4>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {['pinCoord1', 'pinCoord2'].map((f, i) => (
                <div key={f}>
                  <label className="accum-port-label">Pin {i + 1} coordinate along the edge (µm):</label>
                  <input
                    type="number"
                    className="syn-opt-input"
                    value={formData[f] ?? ''}
                    onChange={(e) => handleFieldChange(f, e.target.value)}
                    data-testid={`input-${f}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FP-18 IR Drop */}
        {lesson.id === 'fp-18' && (
          <div className="card combseq-card">
            <h4 className="dff-challenge__section-title">Step 1: Calculate Voltage Droop (Load Current: 20 mA, Grid Resistance: 1.5 &Omega;)</h4>
            <div style={{ marginTop: '0.75rem' }}>
              <label className="accum-port-label">Static IR-Drop (V = I × R) (mV):</label>
              <input
                type="number"
                placeholder="e.g. 30"
                className="syn-opt-input"
                value={formData.calculatedDrop || ''}
                onChange={(e) => handleFieldChange('calculatedDrop', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Capstone Projects (FP-24 & FP-36): graded on the saved Studio project */}
        {(lesson.id === 'fp-24' || lesson.id === 'fp-36' || lesson.requiresStudioProject) && (
          <div className="card combseq-card" data-testid="capstone-panel">
            <h4 className="dff-challenge__section-title">
              🏆 {lesson.id === 'fp-36' ? 'Expert SoC Capstone: Placement & CTS Handoff Sign-off' : 'Master Capstone: Saved Studio Project Sign-off'}
            </h4>
            {!studioProject ? (
              <p className="dff-challenge__subtext">
                No saved project found {isExplore ? 'in this Explore session' : 'for your Normal Game Studio'}.
                Open the <Link to={studioPath}>Floorplan Studio</Link>, architect your {lesson.minMacros || 4}+ macro design, verify DRC and IR drop, press <strong>Save</strong>, then return here.
              </p>
            ) : (
              <>
                <p className="dff-challenge__subtext">
                  Project <strong>{studioProject.name}</strong>: {capstoneReport?.metrics?.macroCount ?? 0} macros,
                  utilization {capstoneReport?.metrics?.nominalUtilization ?? 0}%, worst IR drop {capstoneReport?.metrics?.maxIRDropMv ?? 0} mV.
                </p>
                <ul className="fp-capstone-checklist" style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0', display: 'grid', gap: '0.35rem' }}>
                  <li>{(capstoneReport?.metrics?.macroCount ?? 0) >= (lesson.minMacros || 4) ? '✅' : '❌'} At least {lesson.minMacros || 4} hard macros (Current: {capstoneReport?.metrics?.macroCount ?? 0})</li>
                  <li>{(capstoneReport?.errorCount ?? 1) === 0 ? '✅' : '❌'} 0 errors (DRC, boundary, pin pitch, PDN continuity, shorts)</li>
                  <li>{(capstoneReport?.warningCount ?? 1) === 0 ? '✅' : '❌'} 0 warnings (halo conflicts, missing vias)</li>
                  {lesson.id === 'fp-36' && (
                    <li>{(capstoneReport?.metrics?.maxIRDropMv ?? 999) <= 30 ? '✅' : '❌'} Static IR drop ≤ 30 mV (Current: {capstoneReport?.metrics?.maxIRDropMv ?? 0} mV)</li>
                  )}
                </ul>
                {capstoneReport && capstoneReport.violations.length > 0 && (
                  <ul style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: '#b45309' }}>
                    {capstoneReport.violations.slice(0, 6).map((v, i) => (
                      <li key={i}><strong>{v.rule}:</strong> {v.message}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <button type="button" className="btn btn--secondary btn--sm" style={{ marginTop: '0.75rem' }} onClick={() => setStudioProject(loadStudioProject(isExplore))}>
              ↻ Reload saved project
            </button>
          </div>
        )}

        {/* Lesson-specific concept checks */}
        {Array.isArray(lesson.questions) && lesson.questions.length > 0 && (
          <div className="card combseq-card">
            <h4 className="dff-challenge__section-title">Concept Check: {lesson.title}</h4>
            {lesson.questions.map((q) => (
              <LessonQuestion
                key={q.field}
                lessonId={lesson.id}
                question={q}
                value={formData[q.field]}
                onChange={handleFieldChange}
              />
            ))}
          </div>
        )}

        {/* Feedback Display */}
        {validationResult && (
          <div
            className={`level-page__feedback fp-expanded-challenge__feedback ${validationResult.passed ? 'level-page__feedback--success fp-expanded-challenge__feedback--pass' : 'level-page__feedback--error'}`}
            style={{ marginTop: '1.25rem' }}
          >
            <strong>{validationResult.passed ? '✓ Step Certified!' : '⚠️ Requirements Not Met:'}</strong> {validationResult.feedback}
          </div>
        )}

        {/* Submit verification button */}
        <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
          <button type="submit" className="btn btn--primary btn--lg fp-expanded-challenge__btn-verify" data-testid="btn-verify-challenge">
            ⚡ Verify &amp; Sign Off Lesson {lesson.id.toUpperCase()}
          </button>
        </div>
      </form>
    </div>
  );
}
