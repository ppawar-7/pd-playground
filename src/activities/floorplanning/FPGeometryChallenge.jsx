/**
 * FPGeometryChallenge.jsx
 * =======================
 * Interactive challenge for Level 2 (fp-2): Die Size and Aspect Ratio.
 */

import React, { useState } from 'react';
import PhysicalCanvas from '../../components/engineering/PhysicalCanvas.jsx';
import {
  validateFPGeometry,
  CORRECT_UTIL_CONGESTION_ID,
} from './validators/validateFPGeometry.js';
import './FPGeometryChallenge.css';

export default function FPGeometryChallenge({ level, kingdom, onVerify, alreadyCompleted }) {
  const [coreWidth, setCoreWidth] = useState('');
  const [coreHeight, setCoreHeight] = useState('');
  const [coreArea, setCoreArea] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [nominalUtil, setNominalUtil] = useState('');
  const [effectiveUtil, setEffectiveUtil] = useState('');
  const [congestionConcept, setCongestionConcept] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateFPGeometry({
      coreWidth,
      coreHeight,
      coreArea,
      aspectRatio,
      nominalUtil,
      effectiveUtil,
      congestionConcept,
    });
    setValidationResult(result);
    if (result.passed && onVerify) {
      onVerify(result);
    }
  };

  return (
    <div className="fp-geom-challenge">
      <div className="combseq-concept-box">
        <h3 className="combseq-heading">
          📐 Core Geometry &amp; Placement Utilization
        </h3>
        <p className="combseq-desc">
          Given the physical specification from the system architect:<br />
          <strong>Die Dimensions:</strong> 600 µm (width) × 500 µm (height).<br />
          <strong>I/O Margin:</strong> 50 µm uniform padding on all four edges.<br />
          <strong>Total Standard Cell Area:</strong> 75,000 µm².<br />
          <strong>Hard Macro Area (SRAM block):</strong> 25,000 µm².
        </p>
      </div>

      <div className="card combseq-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="badge badge--available">Target Silicon Geometry</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Die: 600 × 500 µm, Margin: 50 µm
          </span>
        </div>
        <PhysicalCanvas
          dieWidth={600}
          dieHeight={500}
          coreWidth={500}
          coreHeight={400}
          margin={50}
          macros={[{ id: 'SRAM_1', x: 40, y: 40, width: 100, height: 80, halo: 10 }]}
          showPowerRings={true}
        />
      </div>

      {/* Step 1: Geometry Calculations */}
      <div className="card combseq-card">
        <h4 className="dff-challenge__section-title">
          📋 Step 1: Compute Core Dimensions and Area
        </h4>
        <p className="dff-challenge__subtext">
          Formula: Core Width = Die Width - (2 × Margin); Core Height = Die Height - (2 × Margin).
        </p>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <div>
            <label className="accum-port-label">Core Width (µm):</label>
            <input
              type="number"
              placeholder="e.g. 500"
              className="syn-opt-input"
              value={coreWidth}
              onChange={(e) => setCoreWidth(e.target.value)}
            />
          </div>

          <div>
            <label className="accum-port-label">Core Height (µm):</label>
            <input
              type="number"
              placeholder="e.g. 400"
              className="syn-opt-input"
              value={coreHeight}
              onChange={(e) => setCoreHeight(e.target.value)}
            />
          </div>

          <div>
            <label className="accum-port-label">Core Area (µm²):</label>
            <input
              type="number"
              placeholder="e.g. 200000"
              className="syn-opt-input"
              value={coreArea}
              onChange={(e) => setCoreArea(e.target.value)}
            />
          </div>

          <div>
            <label className="accum-port-label">Aspect Ratio ($H/W$):</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 0.80"
              className="syn-opt-input"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Step 2: Utilization Calculations */}
      <div className="card combseq-card">
        <h4 className="dff-challenge__section-title">
          📊 Step 2: Compute Nominal vs Effective Utilization
        </h4>
        <p className="dff-challenge__subtext">
          Nominal Util = (StdCells + Macros) / Core Area; Effective Util = StdCells / (Core Area - Macros).
        </p>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <div>
            <label className="accum-port-label">Nominal Core Utilization (%):</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 50.0"
              className="syn-opt-input"
              value={nominalUtil}
              onChange={(e) => setNominalUtil(e.target.value)}
            />
          </div>

          <div>
            <label className="accum-port-label">Effective Placement Util (%):</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 42.9"
              className="syn-opt-input"
              value={effectiveUtil}
              onChange={(e) => setEffectiveUtil(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Step 3: Utilization Concept */}
      <div className="dff-challenge__concept-section">
        <h4 className="dff-challenge__section-title">
          🧠 Step 3: Why Over-Utilized Floorplans Fail
        </h4>
        <div className="mux-quiz-prompt">
          What physical design hazard occurs if a floorplanner targets a core utilization greater than 75–80%?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="Utilization congestion question">
          <label className={`mux-quiz-option ${congestionConcept === CORRECT_UTIL_CONGESTION_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="utilConcept"
              value={CORRECT_UTIL_CONGESTION_ID}
              checked={congestionConcept === CORRECT_UTIL_CONGESTION_ID}
              onChange={(e) => setCongestionConcept(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>Routing Congestion &amp; Unclosable DRC Violations:</strong> Dense placement leaves insufficient routing tracks between standard cells. Routers run out of metal resources, causing hundreds of shorts, opens, and massive crosstalk noise delays.
            </span>
          </label>

          <label className={`mux-quiz-option ${congestionConcept === 'opt-util-higher-better' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="utilConcept"
              value="opt-util-higher-better"
              checked={congestionConcept === 'opt-util-higher-better'}
              onChange={(e) => setCongestionConcept(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>No impact:</strong> 100% utilization is ideal because metal wires do not occupy any physical routing tracks.
            </span>
          </label>
        </div>
      </div>

      {validationResult && (
        <div className={`level-page__feedback ${validationResult.passed ? 'level-page__feedback--success' : 'level-page__feedback--error'}`} style={{ marginTop: '1.25rem' }}>
          <strong>{validationResult.passed ? '✓ Geometry & Utilization Verified!' : '⚠️ Calculation Incomplete:'}</strong> {validationResult.feedback}
        </div>
      )}

      <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
        <button type="button" className="btn btn--primary btn--lg" onClick={handleSubmit}>
          📐 Verify Floorplan Geometry Calculations
        </button>
      </div>
    </div>
  );
}
