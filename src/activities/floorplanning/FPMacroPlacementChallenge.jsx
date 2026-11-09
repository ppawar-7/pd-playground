/**
 * FPMacroPlacementChallenge.jsx
 * ==============================
 * Interactive challenge for Level 4 (fp-4): Macro Placement Basics.
 */

import React, { useState } from 'react';
import PhysicalCanvas from '../../components/engineering/PhysicalCanvas.jsx';
import {
  validateFPMacroPlacement,
  CORRECT_HALO_CONCEPT_ID,
} from './validators/validateFPMacroPlacement.js';
import './FPMacroPlacementChallenge.css';

const INITIAL_MACROS = [
  { id: 'SRAM1', name: 'SRAM1 (120×90)', x: 40, y: 40, width: 120, height: 90, halo: 15 },
  { id: 'SRAM2', name: 'SRAM2 (120×90)', x: 40, y: 220, width: 120, height: 90, halo: 15 },
];

export default function FPMacroPlacementChallenge({ level, kingdom, onVerify, alreadyCompleted }) {
  const [macros, setMacros] = useState(INITIAL_MACROS);
  const [selectedMacroId, setSelectedMacroId] = useState('SRAM1');
  const [haloConcept, setHaloConcept] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const handleCoordinateChange = (id, field, val) => {
    const num = parseInt(val, 10) || 0;
    setMacros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: num } : m))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateFPMacroPlacement({
      macros,
      haloConcept,
    });
    setValidationResult(result);
    if (result.passed && onVerify) {
      onVerify(result);
    }
  };

  const activeMacro = macros.find((m) => m.id === selectedMacroId) || macros[0];

  return (
    <div className="fp-macro-challenge">
      <div className="combseq-concept-box">
        <h3 className="combseq-heading">
          🧱 Hard Macro Floorplanning: SRAM Blocks &amp; Keepouts
        </h3>
        <p className="combseq-desc">
          Hard IP macros (SRAMs, analog PLLs, ROMs) are large pre-designed blocks that cannot be broken apart. Floorplanners must:
          1. Place macros against core boundaries or corners to leave contiguous open area for standard cells.
          2. Maintain <strong>Placement Halos</strong> (keepout margins) around macros to prevent standard cell placement in routing-congested pin escape zones.
        </p>
      </div>

      <div className="card combseq-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="badge badge--available">Interactive Macro Placement Canvas</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Amber dashed outline represents the 15 µm keepout halo
          </span>
        </div>
        <PhysicalCanvas
          dieWidth={600}
          dieHeight={500}
          coreWidth={500}
          coreHeight={400}
          margin={50}
          macros={macros}
          selectedMacroId={selectedMacroId}
          onSelectMacro={setSelectedMacroId}
          showPowerRings={true}
        />
      </div>

      {/* Macro Coordinates Control */}
      <div className="card combseq-card">
        <h4 className="dff-challenge__section-title">
          📋 Step 1: Position Hard Macros in Core (Core: 500 × 400 µm)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {macros.map((m) => (
            <div
              key={m.id}
              className={`syn-opt-card ${selectedMacroId === m.id ? 'active-macro-card' : ''}`}
              onClick={() => setSelectedMacroId(m.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#2563eb' }}>{m.name}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Halo: 15 µm</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '8px' }}>
                <div>
                  <label className="accum-port-label">X Pos (µm):</label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    max={500 - m.width}
                    className="syn-opt-input"
                    value={m.x}
                    onChange={(e) => handleCoordinateChange(m.id, 'x', e.target.value)}
                  />
                </div>
                <div>
                  <label className="accum-port-label">Y Pos (µm):</label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    max={400 - m.height}
                    className="syn-opt-input"
                    value={m.y}
                    onChange={(e) => handleCoordinateChange(m.id, 'y', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2: Placement Halo Concept */}
      <div className="dff-challenge__concept-section">
        <h4 className="dff-challenge__section-title">
          🧠 Step 2: Purpose of Placement Halos
        </h4>
        <div className="mux-quiz-prompt">
          Why do physical design tools enforce a placement halo (keepout margin) around large SRAM macros?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="Placement halo question">
          <label className={`mux-quiz-option ${haloConcept === CORRECT_HALO_CONCEPT_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="haloQuiz"
              value={CORRECT_HALO_CONCEPT_ID}
              checked={haloConcept === CORRECT_HALO_CONCEPT_ID}
              onChange={(e) => setHaloConcept(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>Guarantees pin escape routing channels and prevents DRC spacing violations:</strong> Dense memory macros have hundreds of bitline/wordline pins along their boundaries. Halos reserve routing tracks for wire access and prevent standard cell N-well spacing conflicts.
            </span>
          </label>

          <label className={`mux-quiz-option ${haloConcept === 'opt-halo-decorative' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="haloQuiz"
              value="opt-halo-decorative"
              checked={haloConcept === 'opt-halo-decorative'}
              onChange={(e) => setHaloConcept(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>It is a graphical artifact:</strong> Halos have no physical meaning and are ignored during manufacturing.
            </span>
          </label>
        </div>
      </div>

      {validationResult && (
        <div className={`level-page__feedback ${validationResult.passed ? 'level-page__feedback--success' : 'level-page__feedback--error'}`} style={{ marginTop: '1.25rem' }}>
          <strong>{validationResult.passed ? '✓ Macro Placement Certified!' : '⚠️ Violation Detected:'}</strong> {validationResult.feedback}
        </div>
      )}

      <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
        <button type="button" className="btn btn--primary btn--lg" onClick={handleSubmit}>
          🧱 Verify Macro Placement &amp; Halo Clearance
        </button>
      </div>
    </div>
  );
}
