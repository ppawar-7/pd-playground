/**
 * FPKingdomChallenge.jsx
 * =======================
 * Capstone challenge for Level 5 (fp-5): Floorplan Kingdom Challenge.
 */

import React, { useState } from 'react';
import PhysicalCanvas from '../../components/engineering/PhysicalCanvas.jsx';
import {
  validateFPKingdom,
  CORRECT_POWER_GRID_ID,
} from './validators/validateFPKingdom.js';
import './FPKingdomChallenge.css';

const INITIAL_MACROS = [
  { id: 'SRAM1', name: 'SRAM1 (120×90)', x: 40, y: 40, width: 120, height: 90, halo: 15 },
  { id: 'SRAM2', name: 'SRAM2 (120×90)', x: 40, y: 220, width: 120, height: 90, halo: 15 },
];

const INITIAL_PINS = [
  { id: 'DATA0', edge: 'top', coord: 80 },
  { id: 'DATA1', edge: 'top', coord: 120 },
  { id: 'DATA2', edge: 'top', coord: 160 },
  { id: 'DATA3', edge: 'top', coord: 200 },
  { id: 'CLK',   edge: 'bottom', coord: 220 },
  { id: 'RST',   edge: 'bottom', coord: 260 },
];

export default function FPKingdomChallenge({ level, kingdom, onVerify, alreadyCompleted }) {
  const [macros, setMacros] = useState(INITIAL_MACROS);
  const [pins, setPins] = useState(INITIAL_PINS);
  const [powerGridConcept, setPowerGridConcept] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const handleMacroCoordChange = (id, field, val) => {
    const num = parseInt(val, 10) || 0;
    setMacros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: num } : m))
    );
  };

  const handlePinCoordChange = (id, newCoord) => {
    setPins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, coord: parseInt(newCoord, 10) || 0 } : p))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateFPKingdom({
      macros,
      pins,
      powerGridConcept,
    });
    setValidationResult(result);
    if (result.passed && onVerify) {
      onVerify(result);
    }
  };

  return (
    <div className="fp-capstone-challenge">
      <div className="combseq-concept-box">
        <h3 className="combseq-heading">
          👑 Floorplanning Kingdom Capstone: Complete Chip Floorplan
        </h3>
        <p className="combseq-desc">
          Combine all floorplanning disciplines into a single verified floorplan:
          1. <strong>Macro Legalization:</strong> Position SRAM1 and SRAM2 inside core with zero overlaps and &ge; 15 µm halos.
          2. <strong>I/O Pin Assignment:</strong> Place DATA[3:0] on Top edge and CLK/RST on Bottom edge with &ge; 20 µm pitch.
          3. <strong>Power Grid Strategy:</strong> Ensure dual-ring low-impedance power mesh routing.
        </p>
      </div>

      <div className="card combseq-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="badge badge--available">Capstone Floorplan Canvas</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Die: 600×500 µm | Core: 500×400 µm | Halos: 15 µm
          </span>
        </div>
        <PhysicalCanvas
          dieWidth={600}
          dieHeight={500}
          coreWidth={500}
          coreHeight={400}
          margin={50}
          macros={macros}
          pins={pins}
          showPowerRings={true}
        />
      </div>

      {/* Macro adjustment */}
      <div className="card combseq-card">
        <h4 className="dff-challenge__section-title">
          🧱 Step 1: Position SRAM Hard Macros
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
          {macros.map((m) => (
            <div key={m.id} className="syn-opt-card">
              <span style={{ fontWeight: 800, color: '#2563eb' }}>{m.name}</span>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '6px' }}>
                <div>
                  <label className="accum-port-label">X Pos (µm):</label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    max={500 - m.width}
                    className="syn-opt-input"
                    value={m.x}
                    onChange={(e) => handleMacroCoordChange(m.id, 'x', e.target.value)}
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
                    onChange={(e) => handleMacroCoordChange(m.id, 'y', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pin adjustment */}
      <div className="card combseq-card">
        <h4 className="dff-challenge__section-title">
          📍 Step 2: Fine-Tune Pin Pitch Spacing (Min Pitch: 20 µm)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
          {pins.map((p) => (
            <div key={p.id} className="syn-opt-card" style={{ padding: '0.5rem 0.75rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#9333ea' }}>{p.id} ({p.edge})</div>
              <input
                type="number"
                step="5"
                min="0"
                max={500}
                className="syn-opt-input"
                style={{ width: '100%', marginTop: '4px' }}
                value={p.coord}
                onChange={(e) => handlePinCoordChange(p.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Step 3: Power Grid Question */}
      <div className="dff-challenge__concept-section">
        <h4 className="dff-challenge__section-title">
          ⚡ Step 3: Power Distribution Network (PDN) Mesh
        </h4>
        <div className="mux-quiz-prompt">
          How do top-level metal power straps (Metal 8 / Metal 9) deliver supply voltage down to standard cell rows on lower metal layers (Metal 1)?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="Power grid mesh question">
          <label className={`mux-quiz-option ${powerGridConcept === CORRECT_POWER_GRID_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="powerGridQuiz"
              value={CORRECT_POWER_GRID_ID}
              checked={powerGridConcept === CORRECT_POWER_GRID_ID}
              onChange={(e) => setPowerGridConcept(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>Via arrays connecting orthogonal power straps down to standard cell rails:</strong> Thick top-layer straps run across the core to minimize sheet resistance. At every strap-to-rail intersection, dense via arrays drop the supply down to standard cell Metal 1 VDD/VSS rails.
            </span>
          </label>

          <label className={`mux-quiz-option ${powerGridConcept === 'opt-single-wire-power' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="powerGridQuiz"
              value="opt-single-wire-power"
              checked={powerGridConcept === 'opt-single-wire-power'}
              onChange={(e) => setPowerGridConcept(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>Wireless inductive coupling:</strong> Standard cells receive power wirelessly without any physical metal via connections.
            </span>
          </label>
        </div>
      </div>

      {validationResult && (
        <div className={`level-page__feedback ${validationResult.passed ? 'level-page__feedback--success' : 'level-page__feedback--error'}`} style={{ marginTop: '1.25rem' }}>
          <strong>{validationResult.passed ? '✓ Floorplan Capstone Certified!' : '⚠️ Capstone Incomplete:'}</strong> {validationResult.feedback}
        </div>
      )}

      <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
        <button type="button" className="btn btn--primary btn--lg" onClick={handleSubmit}>
          👑 Certify Floorplan Kingdom &amp; Unlock Placement
        </button>
      </div>
    </div>
  );
}
