/**
 * RTLAccumulatorChallenge.jsx
 * ============================
 * Interactive block-diagram wiring and simulation challenge for Level 4 (rtl-4).
 *
 * Teaches:
 * - Datapath block construction: Multiplexers, Adders, and Registers.
 * - Feedback loops in sequential datapaths.
 * - 8-bit arithmetic bit-width clamping and overflow flags.
 */

import React, { useState } from 'react';
import {
  validateAccumulatorChallenge,
  ACCUMULATOR_TEST_VECTORS,
  CORRECT_ACCUMULATOR_CONCEPT_ID,
} from './validators/validateAccumulatorChallenge.js';
import './RTLAccumulatorChallenge.css';

export default function RTLAccumulatorChallenge({ level, kingdom, onVerify, alreadyCompleted }) {
  // Wiring selections
  const [wiring, setWiring] = useState({
    muxInput0: 'feedback', // 'feedback' | 'zero'
    muxInput1: 'inData',   // 'inData' | 'operand'
    adderInputA: 'muxOut', // 'muxOut' | 'inData'
    adderInputB: 'operand',// 'operand' | 'feedback'
    regInputD: 'adderSum', // 'adderSum' | 'muxOut'
  });

  // Vector prediction state
  const [vectorOutputs, setVectorOutputs] = useState([
    { acc: null, ovf: false },
    { acc: null, ovf: false },
    { acc: null, ovf: false },
    { acc: null, ovf: false },
  ]);

  const [conceptAnswer, setConceptAnswer] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const handleWiringChange = (port, value) => {
    setWiring((prev) => ({ ...prev, [port]: value }));
  };

  const handleVectorChange = (idx, field, value) => {
    setVectorOutputs((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        [field]: field === 'acc' ? (value === '' ? null : parseInt(value, 10)) : Boolean(value),
      };
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = validateAccumulatorChallenge({
      wiring,
      vectorOutputs,
      conceptAnswer,
    });
    setValidationResult(result);
    if (result.passed && onVerify) {
      onVerify(result);
    }
  };

  return (
    <div className="accum-challenge">
      {/* ─── 1. Engineering Concept ────────────────────────────────────────── */}
      <div className="combseq-concept-box">
        <h3 className="combseq-heading">
          🏗️ Datapath Architecture: Pipelined 8-Bit Accumulator
        </h3>
        <p className="combseq-desc">
          ASIC datapaths are constructed by combining combinational operators (multiplexers, adders) with sequential registers that store intermediate results and feed them back to subsequent clock cycles.
        </p>
        <div className="dff-challenge__callout">
          <strong>Design Goal:</strong> Wire the blocks below to construct an accumulator with a <code>LOAD</code> control signal. When <code>LOAD = 1</code>, it loads an initial value from <code>InData</code>. When <code>LOAD = 0</code>, it preserves the accumulated register value as the base addend.
        </div>
      </div>

      {/* ─── 2. Interactive Block Diagram Schematic ────────────────────────── */}
      <div className="card combseq-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span className="badge badge--available">Interactive Datapath Wiring</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Configure port assignments below
          </span>
        </div>

        <div className="dff-schematic-wrapper">
          <svg viewBox="0 0 680 260" className="accum-svg-canvas">
            {/* Mux Block */}
            <polygon points="120,60 170,80 170,160 120,180" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <text x="145" y="125" fill="#38bdf8" fontSize="12" fontWeight="800" textAnchor="middle">2:1 MUX</text>
            <text x="130" y="85" fill="#94a3b8" fontSize="10">0</text>
            <text x="130" y="160" fill="#94a3b8" fontSize="10">1</text>

            {/* Adder Block */}
            <polygon points="260,70 330,100 330,140 260,170" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
            <text x="290" y="125" fill="#fbbf24" fontSize="14" fontWeight="800" textAnchor="middle">+</text>

            {/* Register Block */}
            <rect x="420" y="80" width="100" height="90" rx="6" fill="#1e293b" stroke="#34d399" strokeWidth="2" />
            <text x="470" y="115" fill="#34d399" fontSize="12" fontWeight="800" textAnchor="middle">ACC REG</text>
            <polygon points="420,140 432,148 420,156" fill="none" stroke="#38bdf8" strokeWidth="2" />
            <text x="435" y="100" fill="#94a3b8" fontSize="10">D[7:0]</text>
            <text x="505" y="100" fill="#94a3b8" fontSize="10" textAnchor="end">Q[7:0]</text>

            {/* Output Wire */}
            <line x1="520" y1="105" x2="630" y2="105" stroke="#34d399" strokeWidth="3" />
            <text x="635" y="109" fill="#34d399" fontSize="12" fontWeight="700">AccOut[7:0]</text>

            {/* Feedback Wire (Q back to Mux 0) */}
            <path d="M 570 105 L 570 230 L 60 230 L 60 85 L 120 85" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="5 3" />
            <text x="320" y="245" fill="#a78bfa" fontSize="11" fontWeight="700" textAnchor="middle">
              Sequential Feedback Loop (Acc Feedback → Mux Pin 0)
            </text>

            {/* Inter-block connection wires */}
            <line x1="170" y1="120" x2="260" y2="100" stroke="#38bdf8" strokeWidth="2.5" />
            <line x1="330" y1="120" x2="420" y2="105" stroke="#fbbf24" strokeWidth="2.5" />

            {/* External inputs */}
            <line x1="40" y1="155" x2="120" y2="155" stroke="#cbd5e1" strokeWidth="2" />
            <text x="35" y="159" fill="#cbd5e1" fontSize="11" textAnchor="end">InData[7:0]</text>

            <line x1="190" y1="150" x2="260" y2="140" stroke="#cbd5e1" strokeWidth="2" />
            <text x="185" y="154" fill="#cbd5e1" fontSize="11" textAnchor="end">Operand[7:0]</text>
          </svg>
        </div>

        {/* Wiring Port Selectors */}
        <h4 className="dff-challenge__section-title" style={{ marginTop: '1.25rem' }}>
          🔌 Step 1: Assign Datapath Port Connections
        </h4>
        <div className="accum-wiring-grid">
          <div className="accum-wiring-card">
            <label className="accum-port-label">MUX Input 0 (LOAD=0):</label>
            <select
              className="mux-output-select"
              value={wiring.muxInput0}
              onChange={(e) => handleWiringChange('muxInput0', e.target.value)}
            >
              <option value="feedback">Acc Feedback (Register Q)</option>
              <option value="zero">Constant Zero (8'h00)</option>
            </select>
          </div>

          <div className="accum-wiring-card">
            <label className="accum-port-label">MUX Input 1 (LOAD=1):</label>
            <select
              className="mux-output-select"
              value={wiring.muxInput1}
              onChange={(e) => handleWiringChange('muxInput1', e.target.value)}
            >
              <option value="inData">External InData[7:0]</option>
              <option value="operand">Operand[7:0]</option>
            </select>
          </div>

          <div className="accum-wiring-card">
            <label className="accum-port-label">Adder Input A:</label>
            <select
              className="mux-output-select"
              value={wiring.adderInputA}
              onChange={(e) => handleWiringChange('adderInputA', e.target.value)}
            >
              <option value="muxOut">Mux Output (Base Addend)</option>
              <option value="inData">Direct InData</option>
            </select>
          </div>

          <div className="accum-wiring-card">
            <label className="accum-port-label">Adder Input B:</label>
            <select
              className="mux-output-select"
              value={wiring.adderInputB}
              onChange={(e) => handleWiringChange('adderInputB', e.target.value)}
            >
              <option value="operand">Operand[7:0] to accumulate</option>
              <option value="feedback">Feedback direct</option>
            </select>
          </div>

          <div className="accum-wiring-card">
            <label className="accum-port-label">Register Input D:</label>
            <select
              className="mux-output-select"
              value={wiring.regInputD}
              onChange={(e) => handleWiringChange('regInputD', e.target.value)}
            >
              <option value="adderSum">Adder Sum Output (Sum[7:0])</option>
              <option value="muxOut">Mux Output (Skip Adder)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── 3. Test Vector Predictions Table ──────────────────────────────── */}
      <div className="card combseq-card">
        <h4 className="dff-challenge__section-title">
          📊 Step 2: Validate Datapath Output Across 4 Test Vectors
        </h4>
        <p className="dff-challenge__subtext">
          Predict the next 8-bit accumulator value (0–255) and whether an 8-bit overflow occurs ($Sum &gt; 255$).
        </p>

        <div className="table-responsive">
          <table className="dff-truth-table">
            <thead>
              <tr>
                <th>Vector</th>
                <th>Current Acc</th>
                <th>RST</th>
                <th>LOAD</th>
                <th>InData</th>
                <th>Operand</th>
                <th>Predicted Next Acc (0–255)</th>
                <th>Overflow Flag</th>
              </tr>
            </thead>
            <tbody>
              {ACCUMULATOR_TEST_VECTORS.map((vec, idx) => {
                const out = vectorOutputs[idx] || {};
                const res = validationResult?.vectorResults?.[idx];

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: '#64748b' }}>#{vec.vector}</td>
                    <td>{vec.currentAcc}</td>
                    <td><span className={`mux-val-pill val-${vec.rst}`}>{vec.rst}</span></td>
                    <td><span className={`mux-val-pill val-${vec.load}`}>{vec.load}</span></td>
                    <td>{vec.inData}</td>
                    <td>+{vec.operand}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="255"
                        placeholder="0–255"
                        style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        className={res ? (res.accOk ? 'correct' : 'incorrect') : ''}
                        value={out.acc === null ? '' : out.acc}
                        onChange={(e) => handleVectorChange(idx, 'acc', e.target.value)}
                      />
                    </td>
                    <td>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(out.ovf)}
                          onChange={(e) => handleVectorChange(idx, 'ovf', e.target.checked)}
                        />
                        Overflow (Sum &gt; 255)
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. Architectural Bit-Width Concept ────────────────────────────── */}
      <div className="dff-challenge__concept-section">
        <h4 className="dff-challenge__section-title">
          🧠 Step 3: Bit-Width Growth &amp; Carry Architecture
        </h4>
        <div className="mux-quiz-prompt">
          When adding two N-bit numbers in digital hardware (A[N-1:0] + B[N-1:0]), what bit-width is required for the sum to guarantee no arithmetic overflow without information loss?
        </div>

        <div className="mux-quiz-options-group" role="radiogroup" aria-label="Bit width growth question">
          <label className={`mux-quiz-option ${conceptAnswer === CORRECT_ACCUMULATOR_CONCEPT_ID ? 'selected' : ''}`}>
            <input
              type="radio"
              name="accumConcept"
              value={CORRECT_ACCUMULATOR_CONCEPT_ID}
              checked={conceptAnswer === CORRECT_ACCUMULATOR_CONCEPT_ID}
              onChange={(e) => setConceptAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">A</span>
            <span className="mux-quiz-text">
              <strong>N + 1 bits:</strong> Adding two N-bit operands produces a maximum sum of (2^N - 1) + (2^N - 1) = 2^(N+1) - 2, requiring exactly one carry bit (N+1 bits total) to avoid saturation or modulo wrap-around.
            </span>
          </label>

          <label className={`mux-quiz-option ${conceptAnswer === 'opt-same-width' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="accumConcept"
              value="opt-same-width"
              checked={conceptAnswer === 'opt-same-width'}
              onChange={(e) => setConceptAnswer(e.target.value)}
            />
            <span className="mux-quiz-letter">B</span>
            <span className="mux-quiz-text">
              <strong>Exactly N bits:</strong> Arithmetic addition never produces a number larger than the original operand bit width.
            </span>
          </label>
        </div>
      </div>

      {/* ─── Feedback & Submission ────────────────────────────────────────── */}
      {validationResult && (
        <div className={`level-page__feedback ${validationResult.passed ? 'level-page__feedback--success' : 'level-page__feedback--error'}`} style={{ marginTop: '1.25rem' }}>
          <strong>{validationResult.passed ? '✓ Solution Verified!' : '⚠️ Verification Incomplete:'}</strong> {validationResult.feedback}
        </div>
      )}

      <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
        <button type="button" className="btn btn--primary btn--lg" onClick={handleSubmit}>
          ⚡ Verify Datapath Wiring &amp; Test Vectors
        </button>
      </div>
    </div>
  );
}
