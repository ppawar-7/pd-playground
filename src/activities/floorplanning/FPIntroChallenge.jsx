/**
 * FPIntroChallenge.jsx
 * ====================
 * Interactive challenge for Level 1 (fp-1): Introduction to Floorplanning.
 */

import React, { useState } from 'react';
import PhysicalCanvas from '../../components/engineering/PhysicalCanvas.jsx';
import {
  validateFPIntro,
  CORRECT_CORE_VS_DIE_ID,
  CORRECT_POWER_RING_ID,
} from './validators/validateFPIntro.js';
import './FPIntroChallenge.css';

export default function FPIntroChallenge({ level, kingdom, onVerify, alreadyCompleted }) {
  const [coreDieAnswer, setCoreDieAnswer] = useState('');
  const [powerRingAnswer, setPowerRingAnswer] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateFPIntro({
      coreDieAnswer,
      powerRingAnswer,
    });
    setValidationResult(result);
    if (result.passed && onVerify) {
      onVerify(result);
    }
  };

  return (
    <div className="fp-intro-challenge">
      <div className="combseq-concept-box">
        <h3 className="combseq-heading">
          🏛️ Physical Organization: Die, Core, and Power Grid
        </h3>
        <p className="combseq-desc">
          Floorplanning is the first physical implementation stage. It establishes the physical chip dimensions, creates the core area, plans power distribution rings, and reserves space for I/O bonding pads.
        </p>
      </div>

      {/* Visual Canvas Demo */}
      <div className="card combseq-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="badge badge--available">Interactive Silicon Floorplan Visualizer</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Die (Gray), Core (Blue Dash), Power Rings (Red/Blue)
          </span>
        </div>
        <PhysicalCanvas
          dieWidth={540}
          dieHeight={440}
          coreWidth={440}
          coreHeight={340}
          margin={50}
          showPowerRings={true}
        />
      </div>

      {/* Question 1: Die vs Core */}
      <div className="dff-challenge__concept-section">
        <h4 className="dff-challenge__section-title">
          📐 Step 1: Core Area vs Die Boundary
        </h4>
        <div className="mux-quiz-prompt">
          What is the physical relationship between the <strong>Die</strong> and the <strong>Core</strong> in an ASIC floorplan?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="Die vs Core question">
          <label className={`mux-quiz-option ${coreDieAnswer === CORRECT_CORE_VS_DIE_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="dieCoreQuiz"
              value={CORRECT_CORE_VS_DIE_ID}
              checked={coreDieAnswer === CORRECT_CORE_VS_DIE_ID}
              onChange={(e) => setCoreDieAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>The Core is enclosed within the Die boundary, separated by an I/O margin:</strong> The Core contains all standard cells and hard IP macros. The peripheral region between core and die edges houses I/O pads, ESD protection clamps, and outer power supply rings.
            </span>
          </label>

          <label className={`mux-quiz-option ${coreDieAnswer === 'opt-die-inside-core' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="dieCoreQuiz"
              value="opt-die-inside-core"
              checked={coreDieAnswer === 'opt-die-inside-core'}
              onChange={(e) => setCoreDieAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>The Die is located inside the Core:</strong> Standard cells are placed outside the die boundary on raw printed circuit boards.
            </span>
          </label>
        </div>
      </div>

      {/* Question 2: Power Rings */}
      <div className="dff-challenge__concept-section" style={{ marginTop: '1.5rem' }}>
        <h4 className="dff-challenge__section-title">
          ⚡ Step 2: Function of Peripheral Power Rings
        </h4>
        <div className="mux-quiz-prompt">
          Why does every ASIC floorplan include concentric low-impedance VDD and VSS rings around the core?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="Power ring question">
          <label className={`mux-quiz-option ${powerRingAnswer === CORRECT_POWER_RING_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="powerRingQuiz"
              value={CORRECT_POWER_RING_ID}
              checked={powerRingAnswer === CORRECT_POWER_RING_ID}
              onChange={(e) => setPowerRingAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>Minimizes IR drop and distributes clean current:</strong> Power rings tap external supply pins and encircle the chip on thick top metal layers, feeding vertical/horizontal power straps that deliver uniform VDD/VSS to millions of standard cell transistors without voltage droop.
            </span>
          </label>

          <label className={`mux-quiz-option ${powerRingAnswer === 'opt-clock-power' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="powerRingQuiz"
              value="opt-clock-power"
              checked={powerRingAnswer === 'opt-clock-power'}
              onChange={(e) => setPowerRingAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>They carry clock signals:</strong> Power rings oscillate at gigahertz speeds to generate clock pulses.
            </span>
          </label>
        </div>
      </div>

      {validationResult && (
        <div className={`level-page__feedback ${validationResult.passed ? 'level-page__feedback--success' : 'level-page__feedback--error'}`} style={{ marginTop: '1.25rem' }}>
          <strong>{validationResult.passed ? '✓ Floorplan Fundamentals Certified!' : '⚠️ Incomplete Submission:'}</strong> {validationResult.feedback}
        </div>
      )}

      <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
        <button type="button" className="btn btn--primary btn--lg" onClick={handleSubmit}>
          🏛️ Verify Floorplanning Fundamentals
        </button>
      </div>
    </div>
  );
}
