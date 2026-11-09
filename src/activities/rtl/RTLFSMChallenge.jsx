/**
 * RTLFSMChallenge.jsx
 * ====================
 * Capstone engineering challenge for Level 5 (rtl-5): RTL Kingdom Capstone.
 *
 * Teaches:
 * - Finite State Machine (FSM) architecture: 3-process vs 2-process RTL styles.
 * - Sequence detection with overlapping states (pattern '1011').
 * - Moore vs Mealy machine timing and glitch susceptibility.
 * - Synthesizable Verilog state encoding (one-hot vs binary).
 */

import React, { useState } from 'react';
import {
  validateFSMChallenge,
  FSM_TRANSITION_ROWS,
  CAPSTONE_STREAM,
  CORRECT_FSM_CONCEPT_ID,
} from './validators/validateFSMChallenge.js';
import './RTLFSMChallenge.css';

export default function RTLFSMChallenge({ level, kingdom, onVerify, alreadyCompleted }) {
  // State transition table rows
  const [transitions, setTransitions] = useState(
    FSM_TRANSITION_ROWS.map(() => ({ nextState: '', match: false }))
  );

  // Stream detection flags (7 cycles)
  const [streamMatches, setStreamMatches] = useState(Array(7).fill(false));
  const [conceptAnswer, setConceptAnswer] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const handleTransitionChange = (idx, field, value) => {
    setTransitions((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        [field]: field === 'match' ? Boolean(value) : value,
      };
      return updated;
    });
  };

  const handleStreamToggle = (idx) => {
    setStreamMatches((prev) => {
      const updated = [...prev];
      updated[idx] = !updated[idx];
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateFSMChallenge({
      transitions,
      streamMatches,
      conceptAnswer,
    });
    setValidationResult(result);
    if (result.passed && onVerify) {
      onVerify(result);
    }
  };

  return (
    <div className="fsm-challenge">
      {/* ─── 1. Engineering Concept ────────────────────────────────────────── */}
      <div className="combseq-concept-box">
        <h3 className="combseq-heading">
          👑 RTL Capstone: 1011 Sequence Detector FSM
        </h3>
        <p className="combseq-desc">
          Finite State Machines (FSMs) form the control path of modern processors, memory controllers, and bus arbiters. In this capstone, you will design and verify a sequential pattern detector that searches for the binary bitstream <strong>1011</strong>.
        </p>
        <div className="dff-challenge__callout">
          <strong>Overlapping Detection Rule:</strong> The pattern <code>1011</code> ends with <code>1</code>. In a continuous stream such as <code>1-0-1-1-0-1-1</code>, the trailing <code>1</code> of the first match serves as the leading <code>1</code> of the next potential pattern.
        </div>
      </div>

      {/* ─── 2. State Diagram Visualizer ───────────────────────────────────── */}
      <div className="card combseq-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="badge badge--available">FSM State Transition Graph</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            States: S0 (IDLE), S1 (Saw 1), S2 (Saw 10), S3 (Saw 101)
          </span>
        </div>

        <div className="dff-schematic-wrapper">
          <svg viewBox="0 0 640 180" className="fsm-svg-canvas">
            {/* S0 */}
            <circle cx="80" cy="90" r="32" fill="#1e293b" stroke="#38bdf8" strokeWidth="2.5" />
            <text x="80" y="86" fill="#38bdf8" fontSize="13" fontWeight="800" textAnchor="middle">S0</text>
            <text x="80" y="104" fill="#94a3b8" fontSize="10" textAnchor="middle">IDLE</text>

            {/* S1 */}
            <circle cx="240" cy="90" r="32" fill="#1e293b" stroke="#a78bfa" strokeWidth="2.5" />
            <text x="240" y="86" fill="#a78bfa" fontSize="13" fontWeight="800" textAnchor="middle">S1</text>
            <text x="240" y="104" fill="#94a3b8" fontSize="10" textAnchor="middle">Saw '1'</text>

            {/* S2 */}
            <circle cx="400" cy="90" r="32" fill="#1e293b" stroke="#fbbf24" strokeWidth="2.5" />
            <text x="400" y="86" fill="#fbbf24" fontSize="13" fontWeight="800" textAnchor="middle">S2</text>
            <text x="400" y="104" fill="#94a3b8" fontSize="10" textAnchor="middle">Saw '10'</text>

            {/* S3 */}
            <circle cx="560" cy="90" r="32" fill="#1e293b" stroke="#34d399" strokeWidth="2.5" />
            <text x="560" y="86" fill="#34d399" fontSize="13" fontWeight="800" textAnchor="middle">S3</text>
            <text x="560" y="104" fill="#94a3b8" fontSize="10" textAnchor="middle">Saw '101'</text>

            {/* Forward arrows */}
            {/* S0 -> S1 (1) */}
            <line x1="112" y1="90" x2="208" y2="90" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="160" y="82" fill="#38bdf8" fontSize="12" fontWeight="700" textAnchor="middle">in=1</text>

            {/* S1 -> S2 (0) */}
            <line x1="272" y1="90" x2="368" y2="90" stroke="#a78bfa" strokeWidth="2" />
            <text x="320" y="82" fill="#a78bfa" fontSize="12" fontWeight="700" textAnchor="middle">in=0</text>

            {/* S2 -> S3 (1) */}
            <line x1="432" y1="90" x2="528" y2="90" stroke="#fbbf24" strokeWidth="2" />
            <text x="480" y="82" fill="#fbbf24" fontSize="12" fontWeight="700" textAnchor="middle">in=1</text>

            {/* S3 -> S1 overlap arc (1/MATCH) */}
            <path d="M 560 58 Q 400 -10 240 58" fill="none" stroke="#34d399" strokeWidth="2.5" strokeDasharray="4 2" />
            <text x="400" y="24" fill="#34d399" fontSize="11" fontWeight="800" textAnchor="middle">
              in=1 [MATCH=1 / Next=S1]
            </text>
          </svg>
        </div>
      </div>

      {/* ─── 3. State Transition Table Completion ──────────────────────────── */}
      <div className="card combseq-card">
        <h4 className="dff-challenge__section-title">
          📋 Step 1: Complete FSM State Transition Table
        </h4>
        <p className="dff-challenge__subtext">
          Fill in the next state and whether output <code>MATCH</code> is asserted for all 8 input transitions.
        </p>

        <div className="table-responsive">
          <table className="dff-truth-table">
            <thead>
              <tr>
                <th>Current State</th>
                <th>Input Bit</th>
                <th>Next State</th>
                <th>Pattern Match?</th>
                <th>Design Note</th>
              </tr>
            </thead>
            <tbody>
              {FSM_TRANSITION_ROWS.map((row, idx) => {
                const tr = transitions[idx] || {};
                const res = validationResult?.transitionResults?.[idx];

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: '#6d28d9' }}>{row.state}</td>
                    <td><span className={`mux-val-pill val-${row.inBit}`}>{row.inBit}</span></td>
                    <td>
                      <select
                        className={`mux-output-select ${res ? (res.nextOk ? 'correct' : 'incorrect') : ''}`}
                        value={tr.nextState}
                        onChange={(e) => handleTransitionChange(idx, 'nextState', e.target.value)}
                        aria-label={`Next state for ${row.state} with input ${row.inBit}`}
                      >
                        <option value="">— Next State —</option>
                        <option value="S0">S0 (IDLE)</option>
                        <option value="S1">S1 (Saw 1)</option>
                        <option value="S2">S2 (Saw 10)</option>
                        <option value="S3">S3 (Saw 101)</option>
                      </select>
                    </td>
                    <td>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(tr.match)}
                          onChange={(e) => handleTransitionChange(idx, 'match', e.target.checked)}
                        />
                        MATCH = 1
                      </label>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{row.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. Stream Evaluation ──────────────────────────────────────────── */}
      <div className="card combseq-card">
        <h4 className="dff-challenge__section-title">
          🔍 Step 2: Stream Detection Verification
        </h4>
        <p className="dff-challenge__subtext">
          Click the cycles where pattern <code>1011</code> is successfully completed in this stream:
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '1rem' }}>
          {CAPSTONE_STREAM.map((bit, idx) => {
            const isSelected = streamMatches[idx];
            return (
              <button
                key={idx}
                type="button"
                className={`fsm-stream-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => handleStreamToggle(idx)}
              >
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>C#{idx + 1}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{bit}</div>
                <div style={{ fontSize: '0.7rem', marginTop: '2px', color: isSelected ? '#15803d' : '#94a3b8' }}>
                  {isSelected ? 'MATCH' : '—'}
                </div>
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.75rem' }}>
          💡 Hint: Identify when the 4-bit substring <code>1, 0, 1, 1</code> appears. Remember that index 6 overlaps with index 3!
        </p>
      </div>

      {/* ─── 5. Moore vs Mealy Architecture Concept ────────────────────────── */}
      <div className="dff-challenge__concept-section">
        <h4 className="dff-challenge__section-title">
          🧠 Step 3: Moore vs Mealy Architecture in Synthesis
        </h4>
        <div className="mux-quiz-prompt">
          In ASIC synthesis and Static Timing Analysis (STA), how do Moore and Mealy FSM output architectures differ?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="Moore vs Mealy question">
          <label className={`mux-quiz-option ${conceptAnswer === CORRECT_FSM_CONCEPT_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="fsmConcept"
              value={CORRECT_FSM_CONCEPT_ID}
              checked={conceptAnswer === CORRECT_FSM_CONCEPT_ID}
              onChange={(e) => setConceptAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>Moore outputs depend strictly on state registers; Mealy outputs depend on state AND direct inputs.</strong> In STA, Mealy outputs can allow combinational paths to pass through the module directly from input pins to output pins within the same cycle, potentially causing combinational loops or multi-module timing violations.
            </span>
          </label>

          <label className={`mux-quiz-option ${conceptAnswer === 'opt-fsm-no-diff' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="fsmConcept"
              value="opt-fsm-no-diff"
              checked={conceptAnswer === 'opt-fsm-no-diff'}
              onChange={(e) => setConceptAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>They have identical timing and delay:</strong> Moore and Mealy machines produce identical electrical delay paths and have no effect on timing closure.
            </span>
          </label>
        </div>
      </div>

      {/* ─── Feedback & Submission ────────────────────────────────────────── */}
      {validationResult && (
        <div className={`level-page__feedback ${validationResult.passed ? 'level-page__feedback--success' : 'level-page__feedback--error'}`} style={{ marginTop: '1.25rem' }}>
          <strong>{validationResult.passed ? '✓ Capstone Challenge Certified!' : '⚠️ Capstone Incomplete:'}</strong> {validationResult.feedback}
        </div>
      )}

      <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
        <button type="button" className="btn btn--primary btn--lg" onClick={handleSubmit}>
          👑 Certify RTL Kingdom Capstone &amp; Unlock Synthesis
        </button>
      </div>
    </div>
  );
}
