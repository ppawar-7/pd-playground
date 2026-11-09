/**
 * RTLCombSeqChallenge.jsx
 * =======================
 * Interactive engineering challenge for Level 3 (rtl-3): Combinational vs Sequential Logic.
 *
 * Teaches:
 * - Immediate combinational propagation vs edge-triggered sequential latching.
 * - Clock boundaries as synchronization barriers against combinational glitching.
 * - Latch inference hazard in synthesizable Verilog.
 */

import React, { useState } from 'react';
import WaveformViewer from '../../components/engineering/WaveformViewer.jsx';
import {
  validateCombSeqChallenge,
  COMB_SEQ_CYCLES,
  CORRECT_LATCH_HAZARD_ID,
  CORRECT_GLITCH_CONCEPT_ID,
} from './validators/validateCombSeqChallenge.js';
import './RTLCombSeqChallenge.css';

export default function RTLCombSeqChallenge({ level, kingdom, onVerify, alreadyCompleted }) {
  const [cyclePredictions, setCyclePredictions] = useState([
    { combY: null, seqY: null },
    { combY: null, seqY: null },
    { combY: null, seqY: null },
    { combY: null, seqY: null },
  ]);
  const [latchAnswer, setLatchAnswer] = useState('');
  const [glitchAnswer, setGlitchAnswer] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const handlePredictionChange = (idx, field, val) => {
    setCyclePredictions((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        [field]: val === '' ? null : parseInt(val, 10),
      };
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateCombSeqChallenge({
      cyclePredictions,
      latchAnswer,
      glitchAnswer,
    });
    setValidationResult(result);
    if (result.passed && onVerify) {
      onVerify(result);
    }
  };

  const waveSignals = [
    { name: 'CLK', values: [0, 1, 0, 1], color: '#38bdf8' },
    { name: 'A', values: [1, 0, 1, 1], color: '#a78bfa' },
    { name: 'B', values: [1, 1, 0, 1], color: '#f472b6' },
    { name: 'Y_comb (A & B)', values: [1, 0, 0, 1], color: '#fbbf24' },
    { name: 'Y_seq (Reg)', values: [0, 1, 0, 0], color: '#34d399' },
  ];

  return (
    <div className="combseq-challenge">
      {/* ─── 1. Engineering Concept ────────────────────────────────────────── */}
      <div className="combseq-concept-box">
        <h3 className="combseq-heading">
          ⚡ Memoryless Logic vs Clock-Aligned State
        </h3>
        <p className="combseq-desc">
          Digital systems combine two fundamental types of circuits:
        </p>
        <div className="combseq-compare-grid">
          <div className="combseq-compare-card">
            <h4 style={{ color: '#d97706', marginBottom: '0.25rem' }}>🔀 Combinational Logic</h4>
            <p style={{ fontSize: '0.88rem', margin: 0, color: '#475569' }}>
              Outputs depend <em>only</em> on present inputs. Signals propagate through gates with continuous electrical delay (t_pd). Memoryless and susceptible to dynamic glitches.
            </p>
          </div>
          <div className="combseq-compare-card">
            <h4 style={{ color: '#059669', marginBottom: '0.25rem' }}>⏱️ Sequential Logic</h4>
            <p style={{ fontSize: '0.88rem', margin: 0, color: '#475569' }}>
              Outputs depend on present inputs <em>and past stored state</em>. State updates only at discrete clock edges ($\uparrow CLK$), isolating glitching stages from one another.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2. Dual Circuit Waveform Comparison ───────────────────────────── */}
      <div className="card combseq-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="badge badge--available">Live Comparative Waveform</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Notice how Y_seq is delayed by 1 clock cycle relative to Y_comb
          </span>
        </div>
        <WaveformViewer signals={waveSignals} cycles={4} />
      </div>

      {/* ─── 3. Cycle Comparison Predictions ───────────────────────────────── */}
      <div className="card combseq-card">
        <h4 className="dff-challenge__section-title">
          📋 Step 1: Predict Combinational vs Sequential Outputs
        </h4>
        <p className="dff-challenge__subtext">
          For inputs A and B, predict both the immediate combinational output Y_comb = A &amp; B and the registered sequential output Y_seq &lt;= A &amp; B.
        </p>

        <div className="table-responsive">
          <table className="dff-truth-table">
            <thead>
              <tr>
                <th>Cycle</th>
                <th>Input A</th>
                <th>Input B</th>
                <th>Predicted Y_comb (A &amp; B)</th>
                <th>Predicted Y_seq (Register)</th>
                <th>Engineering Explanation</th>
              </tr>
            </thead>
            <tbody>
              {COMB_SEQ_CYCLES.map((stim, idx) => {
                const pred = cyclePredictions[idx] || {};
                const res = validationResult?.cycleResults?.[idx];

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: '#64748b' }}>Cycle #{stim.cycle}</td>
                    <td><span className={`mux-val-pill val-${stim.a}`}>{stim.a}</span></td>
                    <td><span className={`mux-val-pill val-${stim.b}`}>{stim.b}</span></td>
                    <td>
                      <select
                        className={`mux-output-select ${res ? (res.combOk ? 'correct' : 'incorrect') : ''}`}
                        value={pred.combY === null ? '' : pred.combY}
                        onChange={(e) => handlePredictionChange(idx, 'combY', e.target.value)}
                        aria-label={`Combinational prediction cycle ${stim.cycle}`}
                      >
                        <option value="">— Select —</option>
                        <option value="0">Y_comb = 0</option>
                        <option value="1">Y_comb = 1</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className={`mux-output-select ${res ? (res.seqOk ? 'correct' : 'incorrect') : ''}`}
                        value={pred.seqY === null ? '' : pred.seqY}
                        onChange={(e) => handlePredictionChange(idx, 'seqY', e.target.value)}
                        aria-label={`Sequential prediction cycle ${stim.cycle}`}
                      >
                        <option value="">— Select —</option>
                        <option value="0">Y_seq = 0</option>
                        <option value="1">Y_seq = 1</option>
                      </select>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#475569' }}>{stim.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. Latch Inference Review ─────────────────────────────────────── */}
      <div className="dff-challenge__concept-section">
        <h4 className="dff-challenge__section-title">
          ⚠️ Step 2: RTL Latch Inference Hazard
        </h4>
        <div className="mux-quiz-prompt">
          Consider this Verilog combinational block written by a junior engineer:
          <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', margin: '10px 0' }}>
{`always @(*) begin
    if (enable)
        data_out = data_in;
    // Note: No else branch defined!
end`}
          </pre>
          Why is this code considered hazardous in an ASIC synthesis flow?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="Latch inference hazard question">
          <label className={`mux-quiz-option ${latchAnswer === CORRECT_LATCH_HAZARD_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="latchHazard"
              value={CORRECT_LATCH_HAZARD_ID}
              checked={latchAnswer === CORRECT_LATCH_HAZARD_ID}
              onChange={(e) => setLatchAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>It infers an unintentional transparent latch:</strong> Because <code>data_out</code> is unspecified when <code>enable == 0</code>, the synthesis tool must synthesize hardware that holds the prior value, generating level-sensitive latches that cause severe timing closure and STA testability issues.
            </span>
          </label>

          <label className={`mux-quiz-option ${latchAnswer === 'opt-dff-inferred' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="latchHazard"
              value="opt-dff-inferred"
              checked={latchAnswer === 'opt-dff-inferred'}
              onChange={(e) => setLatchAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>It synthesizes an edge-triggered DFF:</strong> The synthesizer automatically infers a rising-edge clock flip-flop to protect the circuit.
            </span>
          </label>
        </div>
      </div>

      {/* ─── 5. Glitch Filter Concept ──────────────────────────────────────── */}
      <div className="dff-challenge__concept-section" style={{ marginTop: '1.5rem' }}>
        <h4 className="dff-challenge__section-title">
          🛡️ Step 3: Why Clock Domains Filter Glitches
        </h4>
        <div className="mux-quiz-prompt">
          Why do high-speed ASIC physical designs place registers between deep combinational logic trees?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="Glitch filtering question">
          <label className={`mux-quiz-option ${glitchAnswer === CORRECT_GLITCH_CONCEPT_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="glitchConcept"
              value={CORRECT_GLITCH_CONCEPT_ID}
              checked={glitchAnswer === CORRECT_GLITCH_CONCEPT_ID}
              onChange={(e) => setGlitchAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>Timing boundary &amp; Glitch barrier:</strong> Intermediate combinational gates experience transient hazards and glitches as unequal path delays settle. Clocked flip-flops sample data only after all transients have stabilized before the setup window.
            </span>
          </label>

          <label className={`mux-quiz-option ${glitchAnswer === 'opt-reduce-area' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="glitchConcept"
              value="opt-reduce-area"
              checked={glitchAnswer === 'opt-reduce-area'}
              onChange={(e) => setGlitchAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>Area reduction:</strong> Registers consume zero silicon area compared to logic gates, lowering total cell count.
            </span>
          </label>
        </div>
      </div>

      {/* ─── Validation Result Feedback ───────────────────────────────────── */}
      {validationResult && (
        <div className={`level-page__feedback ${validationResult.passed ? 'level-page__feedback--success' : 'level-page__feedback--error'}`} style={{ marginTop: '1.25rem' }}>
          <strong>{validationResult.passed ? '✓ Solution Verified!' : '⚠️ Verification Incomplete:'}</strong> {validationResult.feedback}
        </div>
      )}

      <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
        <button type="button" className="btn btn--primary btn--lg" onClick={handleSubmit}>
          ⚡ Verify Combinational/Sequential Answers
        </button>
      </div>
    </div>
  );
}
