/**
 * FPPinPlacementChallenge.jsx
 * ============================
 * Interactive challenge for Level 3 (fp-3): I/O Placement.
 */

import React, { useState } from 'react';
import PhysicalCanvas from '../../components/engineering/PhysicalCanvas.jsx';
import {
  validateFPPinPlacement,
  CORRECT_ESD_CONCEPT_ID,
} from './validators/validateFPPinPlacement.js';
import './FPPinPlacementChallenge.css';

const INITIAL_PINS = [
  { id: 'DATA0', edge: 'top', coord: 80 },
  { id: 'DATA1', edge: 'top', coord: 120 },
  { id: 'DATA2', edge: 'top', coord: 160 },
  { id: 'DATA3', edge: 'top', coord: 200 },
  { id: 'CLK',   edge: 'bottom', coord: 220 },
  { id: 'RST',   edge: 'bottom', coord: 260 },
];

export default function FPPinPlacementChallenge({ level, kingdom, onVerify, alreadyCompleted }) {
  const [pins, setPins] = useState(INITIAL_PINS);
  const [esdConcept, setEsdConcept] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const handleCoordChange = (id, newCoord) => {
    setPins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, coord: parseInt(newCoord, 10) || 0 } : p))
    );
  };

  const handleEdgeChange = (id, newEdge) => {
    setPins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, edge: newEdge } : p))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateFPPinPlacement({
      pins,
      esdConcept,
    });
    setValidationResult(result);
    if (result.passed && onVerify) {
      onVerify(result);
    }
  };

  return (
    <div className="fp-pin-challenge">
      <div className="combseq-concept-box">
        <h3 className="combseq-heading">
          📍 Core Boundary I/O Pin Placement
        </h3>
        <p className="combseq-desc">
          I/O pins define the electrical interface connecting the core logic to outer bonding pads or C4 bumps. Proper pin assignment requires:
          1. <strong>Minimum Pitch:</strong> At least 20 µm spacing between adjacent pins.
          2. <strong>Bus Grouping:</strong> Keep multi-bit bus signals (e.g. <code>DATA[3:0]</code>) on the same edge to prevent wire crossovers and signal skew.
        </p>
      </div>

      <div className="card combseq-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="badge badge--available">Live Boundary Pin Canvas</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Purple markers represent I/O pins along core edges
          </span>
        </div>
        <PhysicalCanvas
          dieWidth={600}
          dieHeight={500}
          coreWidth={500}
          coreHeight={400}
          margin={50}
          pins={pins}
          showPowerRings={false}
        />
      </div>

      {/* Pin Coordination Table */}
      <div className="card combseq-card">
        <h4 className="dff-challenge__section-title">
          📋 Step 1: Configure Boundary Pins (Min Pitch: 20 µm)
        </h4>
        <div className="table-responsive">
          <table className="dff-truth-table">
            <thead>
              <tr>
                <th>Pin ID</th>
                <th>Signal Type</th>
                <th>Assigned Edge</th>
                <th>Coordinate along Edge (µm)</th>
              </tr>
            </thead>
            <tbody>
              {pins.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 800, color: '#9333ea' }}>{p.id}</td>
                  <td>{p.id.startsWith('DATA') ? 'Data Bus [3:0]' : 'Control Input'}</td>
                  <td>
                    <select
                      className="mux-output-select"
                      value={p.edge}
                      onChange={(e) => handleEdgeChange(p.id, e.target.value)}
                    >
                      <option value="top">Top Edge</option>
                      <option value="bottom">Bottom Edge</option>
                      <option value="left">Left Edge</option>
                      <option value="right">Right Edge</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="5"
                      min="0"
                      max={p.edge === 'top' || p.edge === 'bottom' ? 500 : 400}
                      className="syn-opt-input"
                      value={p.coord}
                      onChange={(e) => handleCoordChange(p.id, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 2: ESD Concept */}
      <div className="dff-challenge__concept-section">
        <h4 className="dff-challenge__section-title">
          🛡️ Step 2: Electrostatic Discharge (ESD) Protection Pads
        </h4>
        <div className="mux-quiz-prompt">
          Why must primary I/O pins connect through dedicated peripheral ESD clamp cells before entering the internal standard cell core?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="ESD protection question">
          <label className={`mux-quiz-option ${esdConcept === CORRECT_ESD_CONCEPT_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="esdQuiz"
              value={CORRECT_ESD_CONCEPT_ID}
              checked={esdConcept === CORRECT_ESD_CONCEPT_ID}
              onChange={(e) => setEsdConcept(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>Prevents dielectric gate breakdown:</strong> External human touch or handling induces thousands of electrostatic volts (&gt; 2000 V). ESD diodes clamp and safely shunt high-voltage transients to power rails before the spike can puncture delicate nanometer transistor gate oxides.
            </span>
          </label>

          <label className={`mux-quiz-option ${esdConcept === 'opt-esd-speed' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="esdQuiz"
              value="opt-esd-speed"
              checked={esdConcept === 'opt-esd-speed'}
              onChange={(e) => setEsdConcept(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>Increases signal frequency:</strong> ESD clamps act as amplifiers that accelerate signals to exceed the speed of light.
            </span>
          </label>
        </div>
      </div>

      {validationResult && (
        <div className={`level-page__feedback ${validationResult.passed ? 'level-page__feedback--success' : 'level-page__feedback--error'}`} style={{ marginTop: '1.25rem' }}>
          <strong>{validationResult.passed ? '✓ Pin Placement Certified!' : '⚠️ Violation Detected:'}</strong> {validationResult.feedback}
        </div>
      )}

      <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
        <button type="button" className="btn btn--primary btn--lg" onClick={handleSubmit}>
          📍 Verify Pin Placement &amp; Spacing Rules
        </button>
      </div>
    </div>
  );
}
