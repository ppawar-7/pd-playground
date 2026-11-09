/**
 * RTLDFFChallenge.jsx
 * ====================
 * Interactive engineering challenge for Level 2 (rtl-2): Signals and Registers.
 *
 * Teaches:
 * - D Flip-Flop architecture and rising-edge clock capture.
 * - Synchronous reset priority vs clock enable gating.
 * - Cycle-by-cycle register state evolution.
 * - Hardware timing window: setup time (t_setup) and hold time (t_hold).
 */

import React, { useState } from 'react';
import WaveformViewer from '../../components/engineering/WaveformViewer.jsx';
import {
  validateDFFChallenge,
  DFF_CHALLENGE_CYCLES,
  CORRECT_DFF_CONCEPT_ID,
} from './validators/validateDFFChallenge.js';
import { simulateDFF } from '../../engine/digitalLogic.js';
import './RTLDFFChallenge.css';

export default function RTLDFFChallenge({ level, kingdom, onVerify, alreadyCompleted }) {
  // Live interactive simulator state
  const [dInput, setDInput] = useState(1);
  const [rstInput, setRstInput] = useState(0);
  const [enInput, setEnInput] = useState(1);
  const [currentQ, setCurrentQ] = useState(0);
  const [cycleCount, setCycleCount] = useState(1);
  const [waveformHistory, setWaveformHistory] = useState([
    { cycle: 1, clk: 0, d: 1, rst: 0, en: 1, q: 0 },
  ]);

  // Challenge submission state
  const [cycleAnswers, setCycleAnswers] = useState(Array(6).fill(null));
  const [conceptAnswer, setConceptAnswer] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  // Clock pulse step
  const handleClockPulse = () => {
    const nextQ = simulateDFF({
      d: dInput,
      currentQ,
      rst: rstInput,
      en: enInput,
    });
    setCurrentQ(nextQ);
    const newCycle = cycleCount + 1;
    setCycleCount(newCycle);

    const newHistory = [
      ...waveformHistory.slice(-5),
      { cycle: newCycle, clk: 1, d: dInput, rst: rstInput, en: enInput, q: nextQ },
    ];
    setWaveformHistory(newHistory);
  };

  const handleCellChange = (idx, val) => {
    setCycleAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[idx] = val === '' ? null : parseInt(val, 10);
      return newAnswers;
    });
  };

  const loadCycleStimulus = (stim) => {
    setDInput(stim.d);
    setRstInput(stim.rst);
    setEnInput(stim.en);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateDFFChallenge({
      cycleAnswers,
      conceptAnswer,
    });
    setValidationResult(result);
    if (result.passed && onVerify) {
      onVerify(result);
    }
  };

  // Prepare waveforms for viewer
  const waveSignals = [
    { name: 'CLK', values: [0, 1, 0, 1, 0, 1], color: '#38bdf8' },
    { name: 'RST', values: DFF_CHALLENGE_CYCLES.map((c) => c.rst), color: '#f87171' },
    { name: 'EN', values: DFF_CHALLENGE_CYCLES.map((c) => c.en), color: '#fbbf24' },
    { name: 'D', values: DFF_CHALLENGE_CYCLES.map((c) => c.d), color: '#a78bfa' },
    { name: 'Q (Sim)', values: DFF_CHALLENGE_CYCLES.map((c) => c.expectedQ), color: '#34d399' },
  ];

  return (
    <div className="dff-challenge">
      {/* ─── 1. Engineering Context ────────────────────────────────────────── */}
      <div className="dff-challenge__concept-box">
        <h3 className="dff-challenge__heading">
          📦 Sequential Building Blocks: The D Flip-Flop
        </h3>
        <p className="dff-challenge__lead">
          While combinational logic evaluates continuously, <strong>sequential circuits</strong> depend on past states. The fundamental storage element in digital ASIC design is the <strong>edge-triggered D Flip-Flop (DFF)</strong>.
        </p>
        <div className="dff-challenge__callout">
          <strong>Key Hardware Rule:</strong> On the rising clock edge (<code>posedge clk</code>), the input <code>D</code> is sampled and transferred to output <code>Q</code>. When <code>RST = 1</code>, synchronous reset forces <code>Q = 0</code> regardless of input. When <code>EN = 0</code>, clock gating preserves the prior value of <code>Q</code>.
        </div>
      </div>

      {/* ─── 2. Interactive Schematic & Live Stepper ───────────────────────── */}
      <div className="card dff-challenge__schematic-card">
        <div className="dff-challenge__card-header">
          <span className="badge badge--available">Live DFF Simulation Laboratory</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Pulse the clock to observe edge-triggered state capture
          </span>
        </div>

        <div className="dff-schematic-wrapper">
          <svg viewBox="0 0 540 220" className="dff-svg-canvas">
            {/* DFF Cell Outline */}
            <rect x="180" y="30" width="180" height="160" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <text x="270" y="55" fill="#f8fafc" fontSize="14" fontWeight="800" textAnchor="middle">
              D-FLIP-FLOP
            </text>

            {/* Inputs: D, RST, EN, CLK */}
            {/* D Pin */}
            <line x1="80" y1="80" x2="180" y2="80" stroke={dInput ? '#a78bfa' : '#475569'} strokeWidth="3" />
            <text x="170" y="75" fill="#cbd5e1" fontSize="12" fontWeight="700" textAnchor="end">D</text>
            <text x="130" y="72" fill="#a78bfa" fontSize="11" fontWeight="700">={dInput}</text>

            {/* EN Pin */}
            <line x1="80" y1="120" x2="180" y2="120" stroke={enInput ? '#fbbf24' : '#475569'} strokeWidth="3" />
            <text x="170" y="115" fill="#cbd5e1" fontSize="12" fontWeight="700" textAnchor="end">EN</text>
            <text x="130" y="112" fill="#fbbf24" fontSize="11" fontWeight="700">={enInput}</text>

            {/* RST Pin (top) */}
            <line x1="270" y1="0" x2="270" y2="30" stroke={rstInput ? '#f87171' : '#475569'} strokeWidth="3" />
            <text x="280" y="22" fill="#f87171" fontSize="11" fontWeight="700">RST={rstInput}</text>

            {/* CLK Pin with triangle edge-detector symbol */}
            <line x1="80" y1="160" x2="180" y2="160" stroke="#38bdf8" strokeWidth="3" />
            <polygon points="180,152 196,160 180,168" fill="none" stroke="#38bdf8" strokeWidth="2" />
            <text x="170" y="155" fill="#38bdf8" fontSize="12" fontWeight="700" textAnchor="end">CLK</text>

            {/* Output Q Pin */}
            <line x1="360" y1="90" x2="460" y2="90" stroke={currentQ ? '#34d399' : '#475569'} strokeWidth="4" />
            <text x="375" y="85" fill="#cbd5e1" fontSize="12" fontWeight="700">Q</text>
            <circle cx="460" cy="90" r="10" fill={currentQ ? '#34d399' : '#334155'} />
            <text x="460" y="94" fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="middle">
              {currentQ}
            </text>
          </svg>
        </div>

        {/* Controls row */}
        <div className="dff-controls-row">
          <div className="dff-control-group">
            <span className="dff-control-label">D Input:</span>
            <button
              type="button"
              className={`dff-btn-toggle ${dInput === 1 ? 'active' : ''}`}
              onClick={() => setDInput(dInput === 1 ? 0 : 1)}
            >
              D = {dInput}
            </button>
          </div>

          <div className="dff-control-group">
            <span className="dff-control-label">Enable:</span>
            <button
              type="button"
              className={`dff-btn-toggle ${enInput === 1 ? 'active' : ''}`}
              onClick={() => setEnInput(enInput === 1 ? 0 : 1)}
            >
              EN = {enInput}
            </button>
          </div>

          <div className="dff-control-group">
            <span className="dff-control-label">Reset:</span>
            <button
              type="button"
              className={`dff-btn-toggle ${rstInput === 1 ? 'active-rst' : ''}`}
              onClick={() => setRstInput(rstInput === 1 ? 0 : 1)}
            >
              RST = {rstInput}
            </button>
          </div>

          <div className="dff-control-group">
            <button type="button" className="btn btn--primary" onClick={handleClockPulse}>
              ⚡ Pulse Rising Clock Edge (Cycle #{cycleCount})
            </button>
          </div>
        </div>

        {/* Dynamic Timing Waveform Display */}
        <div className="dff-waveform-section">
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>
            📈 Multi-Cycle Waveform Simulation
          </h4>
          <WaveformViewer signals={waveSignals} cycles={6} />
        </div>
      </div>

      {/* ─── 3. Cycle-by-Cycle Prediction Challenge Table ───────────────────── */}
      <div className="card dff-challenge__table-card">
        <h4 className="dff-challenge__section-title">
          📋 Step 1: Predict Register Output Across 6 Clock Cycles
        </h4>
        <p className="dff-challenge__subtext">
          Predict the state of output <strong>Q</strong> immediately after the rising clock edge for each cycle.
        </p>

        <div className="table-responsive">
          <table className="dff-truth-table">
            <thead>
              <tr>
                <th>Cycle</th>
                <th>RST</th>
                <th>EN</th>
                <th>D Input</th>
                <th>Expected Rule</th>
                <th>Your Predicted Q</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {DFF_CHALLENGE_CYCLES.map((stim, idx) => {
                const currentVal = cycleAnswers[idx];
                const isChecked = validationResult !== null;
                const isCorrect = isChecked && currentVal === stim.expectedQ;
                const isWrong = isChecked && currentVal !== null && currentVal !== stim.expectedQ;

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: '#64748b' }}>Cycle #{stim.cycle}</td>
                    <td><span className={`mux-val-pill val-${stim.rst}`}>{stim.rst}</span></td>
                    <td><span className={`mux-val-pill val-${stim.en}`}>{stim.en}</span></td>
                    <td><span className={`mux-val-pill val-${stim.d}`}>{stim.d}</span></td>
                    <td style={{ fontSize: '0.85rem', color: '#475569' }}>{stim.reason}</td>
                    <td>
                      <select
                        className={`mux-output-select ${isCorrect ? 'correct' : isWrong ? 'incorrect' : ''}`}
                        value={currentVal === null ? '' : currentVal}
                        onChange={(e) => handleCellChange(idx, e.target.value)}
                        aria-label={`Prediction for cycle ${stim.cycle}`}
                      >
                        <option value="">— Select —</option>
                        <option value="0">Q = 0</option>
                        <option value="1">Q = 1</option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="mux-btn-apply-row"
                        onClick={() => loadCycleStimulus(stim)}
                      >
                        Load State ↗
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. High-Contrast Conceptual Quiz Card ─────────────────────────── */}
      <div className="dff-challenge__concept-section">
        <h4 className="dff-challenge__section-title">
          🧠 Step 2: Physical Design &amp; Timing Window Concept
        </h4>
        <div className="mux-quiz-prompt">
          In real ASIC silicon, a register cannot instantaneously capture data if the signal changes exactly at the clock edge. What is the fundamental physical constraint required for reliable sequential operation?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="Register timing concept options">
          <label className={`mux-quiz-option ${conceptAnswer === CORRECT_DFF_CONCEPT_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="dffConcept"
              value={CORRECT_DFF_CONCEPT_ID}
              checked={conceptAnswer === CORRECT_DFF_CONCEPT_ID}
              onChange={(e) => setConceptAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>Setup and Hold Time window:</strong> Data input <code>D</code> must remain stable for a minimum setup time (<code>t_setup</code>) before the clock edge and hold time (<code>t_hold</code>) after the clock edge to prevent metastability.
            </span>
          </label>

          <label className={`mux-quiz-option ${conceptAnswer === 'opt-clock-infinite' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="dffConcept"
              value="opt-clock-infinite"
              checked={conceptAnswer === 'opt-clock-infinite'}
              onChange={(e) => setConceptAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>Zero-delay ideal capture:</strong> Real physical silicon registers can capture data transitions of zero picoseconds duration with no timing margins required.
            </span>
          </label>

          <label className={`mux-quiz-option ${conceptAnswer === 'opt-comb-speed' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="dffConcept"
              value="opt-comb-speed"
              checked={conceptAnswer === 'opt-comb-speed'}
              onChange={(e) => setConceptAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">C</span>
            <span className="mux-quiz-text">
              <strong>Clock frequency limitation only:</strong> Setup and hold times only matter in FPGA chips and do not apply to custom ASIC standard cells.
            </span>
          </label>
        </div>
      </div>

      {/* ─── 5. Validation Feedback & Submission ────────────────────────────── */}
      {validationResult && (
        <div className={`level-page__feedback ${validationResult.passed ? 'level-page__feedback--success' : 'level-page__feedback--error'}`} style={{ marginTop: '1.25rem' }}>
          <strong>{validationResult.passed ? '✓ Solution Verified!' : '⚠️ Verification Incomplete:'}</strong> {validationResult.feedback}
        </div>
      )}

      <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
        <button type="button" className="btn btn--primary btn--lg" onClick={handleSubmit}>
          ⚡ Verify Register Predictions &amp; Submit Challenge
        </button>
      </div>
    </div>
  );
}
