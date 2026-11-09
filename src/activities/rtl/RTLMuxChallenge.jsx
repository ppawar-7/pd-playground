/**
 * RTLMuxChallenge.jsx
 * ====================
 * Interactive digital design challenge for Level 1 (rtl-1: "What is RTL?").
 *
 * Learning Objectives:
 * 1. Understand what RTL represents: data flowing between registers through combinational logic.
 * 2. Signals vs Variables: Hardware signals are continuous voltage lines operating in parallel.
 * 3. Combinational nature: A 2:1 MUX has no clock or state memory; it steers signals based on current inputs.
 * 4. Verilog conditional expressions: `assign Y = SEL ? B : A;`.
 * 5. Synthesis reality: Synthesis tools translate dataflow expressions into optimal gates,
 *    not necessarily forcing an unoptimized physical MUX standard cell.
 */

import React, { useState } from 'react';
import {
  validateMuxChallenge,
  EXPECTED_MUX_TRUTH_TABLE,
  CORRECT_CONCEPT_ANSWER_ID,
} from './validators/validateMuxChallenge.js';
import './RTLMuxChallenge.css';

export default function RTLMuxChallenge({ onVerify, alreadyCompleted, level }) {
  // Live circuit simulator state
  const [liveSel, setLiveSel] = useState(0);
  const [liveA, setLiveA] = useState(1);
  const [liveB, setLiveB] = useState(0);

  // Student truth table inputs: array of 8 outputs (null initially)
  const [tableOutputs, setTableOutputs] = useState(Array(8).fill(null));

  // Conceptual synthesis question state
  const [conceptAnswer, setConceptAnswer] = useState('');

  // Local verification result state
  const [validationResult, setValidationResult] = useState(null);

  // Calculate live circuit internal states
  const liveNotSel = liveSel === 1 ? 0 : 1;
  const liveAnd1 = liveA === 1 && liveNotSel === 1 ? 1 : 0;
  const liveAnd2 = liveB === 1 && liveSel === 1 ? 1 : 0;
  const liveY = liveAnd1 === 1 || liveAnd2 === 1 ? 1 : 0;

  // Handle individual truth table cell change
  const handleTableCellChange = (idx, value) => {
    setTableOutputs((prev) => {
      const next = [...prev];
      next[idx] = value === '' ? null : Number(value);
      return next;
    });
  };

  // Set circuit controls to a specific truth table row for live inspection
  const testTableRowInCircuit = (row) => {
    setLiveSel(row.sel);
    setLiveA(row.a);
    setLiveB(row.b);
  };

  // Run pure deterministic validation
  const handleValidate = () => {
    const result = validateMuxChallenge({ tableOutputs, conceptAnswer });
    setValidationResult(result);
    if (onVerify) {
      onVerify(result);
    }
  };

  return (
    <div className="mux-challenge">
      {/* ─── 1. Educational Briefing ───────────────────────────────────────── */}
      <div className="mux-challenge__intro">
        <h3>What is Register Transfer Level (RTL)?</h3>
        <p>
          In digital IC design, <strong>RTL</strong> models a digital system as data stored in
          hardware registers and the combinational logic that transforms and transfers that data
          between registers from one clock cycle to the next.
        </p>
        <p>
          Unlike software code where instructions execute sequentially on a CPU, RTL describes
          <strong> physical hardware signals</strong>—wires carrying continuous electrical levels
          that evaluate in parallel.
        </p>
        <div className="mux-callout-box">
          <strong>The 2:1 Multiplexer (MUX):</strong> The foundational atom of RTL data steering.
          A 2:1 MUX is purely <strong>combinational</strong>—it has no clock, holds zero memory,
          and continuously routes one of two inputs to its output based on the control select signal:
          <br />
          <code>Boolean: Y = (~SEL · A) + (SEL · B) &nbsp;|&nbsp; Verilog: assign Y = SEL ? B : A;</code>
        </div>
      </div>

      {/* ─── 2. Interactive Circuit Schematic (Dark Technical EDA Canvas) ─── */}
      <div className="mux-challenge__schematic-card">
        <div className="mux-challenge__schematic-header">
          <div className="mux-challenge__schematic-title">
            <span>⚡ Interactive Gate-Level Schematic</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Y = (~SEL · A) + (SEL · B)</span>
          </div>

          <div className="mux-challenge__controls">
            <div className="mux-challenge__control-group">
              <label>SEL:</label>
              <button
                type="button"
                className={`mux-btn-toggle ${liveSel === 0 ? 'active-0' : 'active-1'}`}
                onClick={() => setLiveSel(liveSel === 0 ? 1 : 0)}
                aria-label={`Toggle Select input, currently ${liveSel}`}
              >
                {liveSel}
              </button>
            </div>
            <div className="mux-challenge__control-group">
              <label>A:</label>
              <button
                type="button"
                className={`mux-btn-toggle ${liveA === 0 ? 'active-0' : 'active-1'}`}
                onClick={() => setLiveA(liveA === 0 ? 1 : 0)}
                aria-label={`Toggle Input A, currently ${liveA}`}
              >
                {liveA}
              </button>
            </div>
            <div className="mux-challenge__control-group">
              <label>B:</label>
              <button
                type="button"
                className={`mux-btn-toggle ${liveB === 0 ? 'active-0' : 'active-1'}`}
                onClick={() => setLiveB(liveB === 0 ? 1 : 0)}
                aria-label={`Toggle Input B, currently ${liveB}`}
              >
                {liveB}
              </button>
            </div>
          </div>
        </div>

        {/* SVG Schematic */}
        <svg className="mux-svg-schematic" viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="2:1 Multiplexer gate-level schematic">
          {/* Input A Line */}
          <line x1="30" y1="45" x2="210" y2="45" stroke={liveA ? '#10b981' : '#475569'} strokeWidth="3" />
          <text x="15" y="50" fill="#f8fafc" fontSize="13" fontWeight="bold">A ({liveA})</text>

          {/* Input B Line */}
          <line x1="30" y1="155" x2="210" y2="155" stroke={liveB ? '#10b981' : '#475569'} strokeWidth="3" />
          <text x="15" y="160" fill="#f8fafc" fontSize="13" fontWeight="bold">B ({liveB})</text>

          {/* SEL Input Line */}
          <line x1="30" y1="100" x2="90" y2="100" stroke={liveSel ? '#10b981' : '#475569'} strokeWidth="3" />
          <text x="5" y="105" fill="#f8fafc" fontSize="13" fontWeight="bold">SEL ({liveSel})</text>

          {/* Inverter for SEL */}
          <polygon points="90,85 130,100 90,115" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="135" cy="100" r="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
          {/* Inverted SEL to AND1 */}
          <line x1="140" y1="100" x2="170" y2="100" stroke={liveNotSel ? '#10b981' : '#475569'} strokeWidth="2" />
          <line x1="170" y1="100" x2="170" y2="65" stroke={liveNotSel ? '#10b981' : '#475569'} strokeWidth="2" />
          <line x1="170" y1="65" x2="210" y2="65" stroke={liveNotSel ? '#10b981' : '#475569'} strokeWidth="2" />

          {/* Non-inverted SEL tap down to AND2 */}
          <circle cx="70" cy="100" r="4" fill={liveSel ? '#10b981' : '#475569'} />
          <line x1="70" y1="100" x2="70" y2="135" stroke={liveSel ? '#10b981' : '#475569'} strokeWidth="2" />
          <line x1="70" y1="135" x2="210" y2="135" stroke={liveSel ? '#10b981' : '#475569'} strokeWidth="2" />

          {/* AND1 Gate (Upper: A & ~SEL) */}
          <path d="M 210,35 L 245,35 A 25,25 0 0,1 245,75 L 210,75 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
          <text x="220" y="59" fill="#94a3b8" fontSize="11" fontWeight="bold">AND1</text>
          <line x1="270" y1="55" x2="350" y2="55" stroke={liveAnd1 ? '#10b981' : '#475569'} strokeWidth="3" />
          <line x1="350" y1="55" x2="380" y2="85" stroke={liveAnd1 ? '#10b981' : '#475569'} strokeWidth="2" />

          {/* AND2 Gate (Lower: B & SEL) */}
          <path d="M 210,125 L 245,125 A 25,25 0 0,1 245,165 L 210,165 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
          <text x="220" y="149" fill="#94a3b8" fontSize="11" fontWeight="bold">AND2</text>
          <line x1="270" y1="145" x2="350" y2="145" stroke={liveAnd2 ? '#10b981' : '#475569'} strokeWidth="3" />
          <line x1="350" y1="145" x2="380" y2="115" stroke={liveAnd2 ? '#10b981' : '#475569'} strokeWidth="2" />

          {/* OR Gate (Output) */}
          <path d="M 380,75 Q 405,100 380,125 Q 425,125 450,100 Q 425,75 380,75 Z" fill="#1e293b" stroke="#a855f7" strokeWidth="2" />
          <text x="400" y="104" fill="#d8b4fe" fontSize="11" fontWeight="bold">OR</text>

          {/* Output Line Y */}
          <line x1="450" y1="100" x2="520" y2="100" stroke={liveY ? '#10b981' : '#475569'} strokeWidth="4" />
          <circle cx="520" cy="100" r="6" fill={liveY ? '#10b981' : '#475569'} />
          <text x="535" y="105" fill="#f8fafc" fontSize="14" fontWeight="bold">Y = {liveY}</text>
        </svg>

        <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>
          Active state: When <strong>SEL = {liveSel}</strong>, the circuit steers Input <strong>{liveSel === 0 ? `A (${liveA})` : `B (${liveB})`}</strong> to Output <strong>Y = {liveY}</strong>.
        </div>
      </div>

      {/* ─── 3. Truth Table Verification (Clean Light Card) ───────────────── */}
      <div className="mux-challenge__table-section">
        <h4 className="mux-challenge__section-title">
          📋 Step 1: Exhaustive 8-State Truth Table Verification
        </h4>
        <p className="mux-challenge__section-desc">
          Because a 2:1 MUX has 3 binary inputs (<code>SEL</code>, <code>A</code>, <code>B</code>), there are exactly 2<sup>3</sup> = 8 possible states. Evaluate every state to demonstrate complete digital mastery. Click <em>"Inspect in Circuit ↗"</em> to load any state into the simulator above.
        </p>

        <div className="mux-table-wrapper">
          <table className="mux-table">
            <thead>
              <tr>
                <th>State</th>
                <th>SEL</th>
                <th>A</th>
                <th>B</th>
                <th>Dataflow Steering</th>
                <th>Your Output (Y)</th>
                <th>Circuit Probe</th>
              </tr>
            </thead>
            <tbody>
              {EXPECTED_MUX_TRUTH_TABLE.map((row, idx) => {
                const currentVal = tableOutputs[idx];
                const isChecked = validationResult !== null;
                const isRowCorrect = isChecked && currentVal === row.expectedY;
                const isRowWrong = isChecked && currentVal !== null && currentVal !== row.expectedY;

                return (
                  <tr key={idx}>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>#{idx + 1}</td>
                    <td><span className={`mux-val-pill val-${row.sel}`}>{row.sel}</span></td>
                    <td><span className={`mux-val-pill val-${row.a}`}>{row.a}</span></td>
                    <td><span className={`mux-val-pill val-${row.b}`}>{row.b}</span></td>
                    <td style={{ color: '#475569', fontSize: '0.88rem', fontWeight: 600 }}>
                      {row.sel === 0 ? 'Selects A' : 'Selects B'}
                    </td>
                    <td>
                      <select
                        className={`mux-output-select ${isRowCorrect ? 'correct' : isRowWrong ? 'incorrect' : ''}`}
                        value={currentVal === null ? '' : currentVal}
                        onChange={(e) => handleTableCellChange(idx, e.target.value)}
                        aria-label={`Truth table output for row ${idx + 1}`}
                      >
                        <option value="">— Select —</option>
                        <option value="0">0</option>
                        <option value="1">1</option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="mux-btn-apply-row"
                        onClick={() => testTableRowInCircuit(row)}
                        title="Load this state into the interactive schematic above"
                      >
                        Inspect in Circuit ↗
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. Conceptual Synthesis Quiz (High-Contrast Light Card) ──────── */}
      <div className="mux-challenge__concept-section">
        <h4 className="mux-challenge__section-title">
          🧠 Step 2: RTL Synthesis &amp; Architecture Concept
        </h4>
        <div className="mux-quiz-prompt">
          In hardware description languages (Verilog / SystemVerilog), dataflow steering is expressed using conditional expressions:<br />
          <code style={{ color: '#7c3aed', background: '#f5f3ff', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
            assign Y = SEL ? B : A;
          </code>
          <br /><br />
          How does an ASIC logic synthesis tool treat this conditional expression during technology mapping?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="RTL synthesis concept question options">
          {/* Option A (Correct) */}
          <label className={`mux-quiz-option ${conceptAnswer === CORRECT_CONCEPT_ANSWER_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="conceptAnswer"
              value={CORRECT_CONCEPT_ANSWER_ID}
              checked={conceptAnswer === CORRECT_CONCEPT_ANSWER_ID}
              onChange={(e) => setConceptAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>It describes dataflow steering between registers.</strong> The synthesis compiler maps the logic into target library gates, which it can optimize, restructure, or share based on timing, area, and power constraints.
            </span>
          </label>

          {/* Option B (Misconception) */}
          <label className={`mux-quiz-option ${conceptAnswer === 'opt-always-mux' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="conceptAnswer"
              value="opt-always-mux"
              checked={conceptAnswer === 'opt-always-mux'}
              onChange={(e) => setConceptAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>Every conditional statement always forces a physical standard-cell multiplexer</strong> into silicon without any Boolean minimization or gate sharing.
            </span>
          </label>

          {/* Option C */}
          <label className={`mux-quiz-option ${conceptAnswer === 'opt-clock-req' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="conceptAnswer"
              value="opt-clock-req"
              checked={conceptAnswer === 'opt-clock-req'}
              onChange={(e) => setConceptAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">C</span>
            <span className="mux-quiz-text">
              <strong>Conditional assignments require a clock edge</strong> and cannot be implemented using combinational gates.
            </span>
          </label>

          {/* Option D */}
          <label className={`mux-quiz-option ${conceptAnswer === 'opt-cpu-code' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="conceptAnswer"
              value="opt-cpu-code"
              checked={conceptAnswer === 'opt-cpu-code'}
              onChange={(e) => setConceptAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">D</span>
            <span className="mux-quiz-text">
              <strong>It compiles into sequential software instructions</strong> executed one instruction at a time by an on-chip CPU microcode interpreter.
            </span>
          </label>
        </div>
      </div>

      {/* ─── 5. Formative Feedback Panel ──────────────────────────────────── */}
      {validationResult && (
        <div className={`mux-challenge__feedback-panel ${validationResult.passed ? 'success' : 'warning'}`}>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.35rem' }}>
            {validationResult.passed ? '✅ Verification Passed!' : '⚠️ Incomplete / Incorrect Criteria'}
          </div>
          <div style={{ lineHeight: 1.5 }}>{validationResult.feedback}</div>

          <ul className="mux-breakdown-list">
            {validationResult.breakdown.map((item, i) => (
              <li key={i}>
                <strong style={{ color: item.passed ? '#047857' : '#b45309' }}>
                  {item.passed ? '✓' : '✗'} {item.label}:
                </strong>{' '}
                {item.explanation}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── 6. Verification Submit Action ─────────────────────────────────── */}
      <div className="mux-challenge__actions">
        <button
          type="button"
          className="btn btn--primary btn--lg w-full"
          onClick={handleValidate}
        >
          🔍 Verify Circuit &amp; Submit Challenge
        </button>
      </div>

      {/* ─── 7. Independent Standalone RTL Playground Suite Link ───────────── */}
      <div className="mux-external-lab-card">
        <div>
          <h4>🚀 Standalone RTL Playground Suite (Optional External Laboratory)</h4>
          <p>
            Ready for advanced experimentation? Explore 8-bit ALUs, sequential registers, counters, and Moore/Mealy State Machine studios with Verilog generation in the standalone suite.
          </p>
        </div>
        <a
          href="https://ppawar-7.github.io/rtl-playground/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--secondary btn--sm"
        >
          Open RTL Lab ↗
        </a>
      </div>
    </div>
  );
}
