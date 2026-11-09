/**
 * CandidateCompareModal.jsx
 * =========================
 * Candidate comparison & Pareto trade-off explorer modal.
 * Displays side-by-side metric comparison, deltas vs baseline,
 * and Pareto frontier highlighting.
 */

import React, { useState } from 'react';
import { compareCandidates, findParetoFrontier } from '../../../engine/floorplanCandidates.js';

export default function CandidateCompareModal({
  isOpen,
  onClose,
  candidates = [],
  onSnapshotCurrent,
  onLoadCandidate,
  onDeleteCandidate,
}) {
  const [baselineIndex, setBaselineIndex] = useState(0);

  if (!isOpen) return null;

  const comparison = candidates.length > 0 ? compareCandidates(candidates, baselineIndex) : null;
  const paretoFrontier = candidates.length > 0 ? findParetoFrontier(candidates) : [];
  const paretoNames = new Set(paretoFrontier.map((c) => c.name));

  return (
    <div className="fp-modal-backdrop" onClick={onClose} data-testid="candidate-compare-modal">
      <div className="fp-modal-card fp-modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <div className="fp-modal-header">
          <h3>⚖️ Candidate Floorplan Comparison &amp; Pareto Trade-Offs</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="fp-toolbar-btn fp-toolbar-btn--primary"
              onClick={onSnapshotCurrent}
              data-testid="btn-snapshot-candidate"
            >
              📸 Snapshot Current Design
            </button>
            <button type="button" className="fp-modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="fp-modal-body">
          {candidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              <p style={{ fontSize: '1.4rem' }}>📋</p>
              <p>No candidate snapshots saved yet.</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Make edits to your floorplan (e.g. adjust aspect ratio, move macros, or alter the PDN grid),
                then click <strong>Snapshot Current Design</strong> to compare variants.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                  Select Baseline Candidate for Delta Analysis:
                  <select
                    style={{ marginLeft: '0.5rem', background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '2px 6px' }}
                    value={baselineIndex}
                    onChange={(e) => setBaselineIndex(Number(e.target.value))}
                    data-testid="select-baseline-candidate"
                  >
                    {candidates.map((c, idx) => (
                      <option key={idx} value={idx}>
                        {idx + 1}. {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
                  ★ {paretoFrontier.length} Pareto-Optimal Candidate(s) on Frontier
                </div>
              </div>

              <div className="fp-compare-table-wrap">
                <table className="fp-compare-table" data-testid="candidate-comparison-table">
                  <thead>
                    <tr>
                      <th>Metric / Property</th>
                      {comparison.candidates.map((c, idx) => (
                        <th key={idx} className={idx === comparison.baselineIndex ? 'fp-compare-baseline-th' : ''}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{c.name}</span>
                            {paretoNames.has(c.name) && (
                              <span className="fp-pareto-badge" title="Pareto Optimal (Non-dominated in Wirelength, Area, or IR-Drop)">
                                ★ Pareto
                              </span>
                            )}
                          </div>
                          {idx === comparison.baselineIndex && (
                            <span style={{ fontSize: '0.65rem', color: '#38bdf8' }}>(Baseline)</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Core Area (µm²)</td>
                      {comparison.candidates.map((c, idx) => (
                        <td key={idx}>
                          {c.metrics?.coreArea?.toLocaleString()}
                          {c.deltasFromBaseline && (
                            <span className={`fp-delta ${c.deltasFromBaseline.coreAreaDelta < 0 ? 'fp-delta--better' : c.deltasFromBaseline.coreAreaDelta > 0 ? 'fp-delta--worse' : ''}`}>
                              {c.deltasFromBaseline.coreAreaDelta > 0 ? `+${c.deltasFromBaseline.coreAreaDelta.toLocaleString()}` : c.deltasFromBaseline.coreAreaDelta.toLocaleString()}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Nominal Utilization (%)</td>
                      {comparison.candidates.map((c, idx) => (
                        <td key={idx}>
                          {c.metrics?.nominalUtilization}%
                          {c.deltasFromBaseline && (
                            <span className="fp-delta">
                              {c.deltasFromBaseline.nominalUtilizationDelta > 0 ? `+${c.deltasFromBaseline.nominalUtilizationDelta}%` : `${c.deltasFromBaseline.nominalUtilizationDelta}%`}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Total HPWL (µm)</td>
                      {comparison.candidates.map((c, idx) => (
                        <td key={idx}>
                          {c.metrics?.totalHPWL?.toLocaleString()}
                          {c.deltasFromBaseline && (
                            <span className={`fp-delta ${c.deltasFromBaseline.totalHPWLDelta < 0 ? 'fp-delta--better' : c.deltasFromBaseline.totalHPWLDelta > 0 ? 'fp-delta--worse' : ''}`}>
                              {c.deltasFromBaseline.totalHPWLDelta > 0 ? `+${c.deltasFromBaseline.totalHPWLDelta.toLocaleString()}` : c.deltasFromBaseline.totalHPWLDelta.toLocaleString()}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Worst IR Drop (mV)</td>
                      {comparison.candidates.map((c, idx) => (
                        <td key={idx}>
                          {(c.metrics?.worstIRDropMv ?? c.metrics?.maxIRDropMv)} mV
                          {c.deltasFromBaseline && (
                            <span className={`fp-delta ${c.deltasFromBaseline.maxIRDropDelta < 0 ? 'fp-delta--better' : c.deltasFromBaseline.maxIRDropDelta > 0 ? 'fp-delta--worse' : ''}`}>
                              {c.deltasFromBaseline.maxIRDropDelta > 0 ? `+${c.deltasFromBaseline.maxIRDropDelta}` : c.deltasFromBaseline.maxIRDropDelta}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Peak Congestion Ratio</td>
                      {comparison.candidates.map((c, idx) => (
                        <td key={idx}>
                          {c.metrics?.maxCongestionRatio}
                          {c.deltasFromBaseline && (
                            <span className={`fp-delta ${c.deltasFromBaseline.congestionDelta < 0 ? 'fp-delta--better' : c.deltasFromBaseline.congestionDelta > 0 ? 'fp-delta--worse' : ''}`}>
                              {c.deltasFromBaseline.congestionDelta > 0 ? `+${c.deltasFromBaseline.congestionDelta}` : c.deltasFromBaseline.congestionDelta}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>DRC Clean?</td>
                      {comparison.candidates.map((c, idx) => (
                        <td key={idx}>
                          <span style={{ color: (c.metrics?.isClean ?? c.metrics?.clean) ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                            {(c.metrics?.isClean ?? c.metrics?.clean) ? '✓ Clean' : `⚠️ ${(c.metrics?.errorCount ?? c.metrics?.drcViolations ?? 0)} error(s)`}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Actions</td>
                      {comparison.candidates.map((c, idx) => (
                        <td key={idx}>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button
                              type="button"
                              className="fp-toolbar-btn"
                              style={{ fontSize: '0.7rem', padding: '2px 5px' }}
                              onClick={() => {
                                onLoadCandidate(c.projectData || c.project);
                                onClose();
                              }}
                              data-testid={`btn-restore-candidate-${idx}`}
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              className="fp-toolbar-btn fp-toolbar-btn--danger"
                              style={{ fontSize: '0.7rem', padding: '2px 5px' }}
                              onClick={() => onDeleteCandidate(idx)}
                              data-testid={`btn-delete-candidate-${idx}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
