/**
 * AnalysisPanel.jsx
 * =================
 * Professional 8-Tab Floorplan Studio Dock:
 * - Tab 1: Overview (Live PPA & Signoff metrics - preserved legacy testids)
 * - Tab 2: Geometry (Aspect ratio, Core/Die dimensions, row stats, area breakdown)
 * - Tab 3: Connectivity (Netlist table, individual HPWL, pin counts)
 * - Tab 4: PDN & IR Drop (Rings, Straps, Vias, Nodal resistive solver results)
 * - Tab 5: Congestion (Heatmap stats, peak ratio, channel bottlenecks)
 * - Tab 6: Diagnostics (Rule-by-rule signoff deck & violation inspector)
 * - Tab 7: Reports (Complete ASIC design handoff report generation & export)
 * - Tab 8: Candidates (Candidate snapshot comparison & Pareto frontier)
 */

import React, { useState } from 'react';
import { compareCandidates, findParetoFrontier } from '../../../engine/floorplanCandidates.js';

export default function AnalysisPanel({
  project,
  utilization,
  maxUtilization = 100,
  hpwl,
  pdnAnalysis,
  congestionMap,
  signoff,
  candidates = [],
  onSnapshotCandidate,
  onLoadCandidate,
  onDeleteCandidate,
  onSelectViolation,
  onAddVia,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [baselineIndex, setBaselineIndex] = useState(0);

  // High level metrics
  const nominal = utilization?.rawNominalUtilization ?? utilization?.nominalUtilization ?? 0;
  const effective = utilization?.effectiveUtilization ?? 0;
  const budget = Number(maxUtilization) || 100;
  const isOverutilized = utilization?.overutilized || nominal > budget;
  const placeable = utilization?.placeableArea ?? utilization?.routableArea ?? 0;

  const totalHPWL = hpwl?.totalHPWL ?? 0;
  const vddOpen = pdnAnalysis?.openNets?.vddOpen;
  const vssOpen = pdnAnalysis?.openNets?.vssOpen;
  const missingVias = pdnAnalysis?.missingVias?.missingViaCount ?? 0;
  const maxIRDrop = pdnAnalysis?.irDrop?.maxDropMv ?? 0;
  const irOpen = Boolean(pdnAnalysis?.irDrop?.hasOpenLoad);
  const shortCount = pdnAnalysis?.shorts?.shorts?.length ?? 0;
  const congestionHotspots = congestionMap?.hotspots?.length ?? 0;
  const violations = signoff?.violations || [];

  // Generate handoff report text
  const generateReportText = () => {
    const p = project || {};
    const d = p.die || {};
    const c = p.core || {};
    const mCount = (p.macros || []).length;
    const pCount = (p.pins || []).length;
    const straps = p.powerNetwork?.straps || [];
    const vias = p.powerNetwork?.vias || [];
    const clean = violations.length === 0;

    return `================================================================================
          PD PLAYGROUND ASIC FLOORPLAN HANDOFF REPORT
================================================================================
Generated: ${new Date().toISOString()}
Project: ${p.name || 'ASIC Floorplan'} (Schema v${p.schemaVersion || 2})

1. CHIP BOUNDARIES & AREA
   Die Size:       ${d.width} x ${d.height} um (Area: ${(d.width * d.height).toLocaleString()} um2)
   Core Size:      ${c.width} x ${c.height} um (Area: ${(c.width * c.height).toLocaleString()} um2)
   Core Margins:   X=${c.x} um, Y=${c.y} um
   Aspect Ratio:   ${(c.height / (c.width || 1)).toFixed(3)} (H/W)

2. UTILIZATION & PACKING
   Nominal Util:   ${nominal}% (Budget: ${budget}%) [${isOverutilized ? 'EXCEEDED' : 'PASSED'}]
   Effective Util: ${effective}%
   Placeable Area: ${placeable.toLocaleString()} um2
   Macro Count:    ${mCount} instances
   I/O Pin Count:  ${pCount} pins

3. INTERCONNECT & ROUTABILITY
   Total HPWL:     ${totalHPWL.toLocaleString()} um
   Peak Congestion: ${Math.round((congestionMap?.maxRatio || 0) * 100)}%
   Hotspots (>90%): ${congestionHotspots} bins

4. POWER DISTRIBUTION NETWORK (PDN)
   VDD Net:        ${vddOpen ? 'OPEN (FAILED)' : 'CONTINUOUS (PASSED)'}
   VSS Net:        ${vssOpen ? 'OPEN (FAILED)' : 'CONTINUOUS (PASSED)'}
   Power Straps:   ${straps.length} conductors
   Power Vias:     ${vias.length} vias
   Missing Vias:   ${missingVias}
   Short Circuits: ${shortCount}
   Worst IR Drop:  ${maxIRDrop} mV (Budget: <= 30 mV) [${maxIRDrop <= 30 && !irOpen ? 'PASSED' : 'FAILED'}]

5. SIGNOFF DIAGNOSTIC SUMMARY
   Overall Status: ${clean ? 'PASSED / DRC CLEAN' : 'FAILED / VIOLATIONS PRESENT'}
   Total Errors:   ${violations.length}
${violations.map((v, i) => `   [${i + 1}] ${v.rule}: ${v.message}`).join('\n')}

================================================================================
End of Floorplan Handoff Report
`;
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateReportText());
    alert('Handoff report copied to clipboard!');
  };

  const handleDownloadReport = () => {
    const text = generateReportText();
    const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${(project?.name || 'floorplan').toLowerCase().replace(/\s+/g, '_')}_handoff_report.txt`);
    dlAnchor.click();
  };

  // Candidates comparison
  const comparison = candidates.length > 0 ? compareCandidates(candidates, baselineIndex) : null;
  const paretoFrontier = candidates.length > 0 ? findParetoFrontier(candidates) : [];
  const paretoNames = new Set(paretoFrontier.map((c) => c.name));

  return (
    <footer className="fp-studio__bottom" aria-label="Floorplan Metrics & Live Signoff Analysis" data-testid="analysis-panel">
      {/* 8 DOCK TABS */}
      <div className="fp-dock-tabs" role="tablist">
        <button
          type="button"
          className={`fp-dock-tab ${activeTab === 'overview' ? 'fp-dock-tab--active' : ''}`}
          onClick={() => setActiveTab('overview')}
          data-testid="dock-tab-overview"
        >
          📊 Overview
        </button>
        <button
          type="button"
          className={`fp-dock-tab ${activeTab === 'geometry' ? 'fp-dock-tab--active' : ''}`}
          onClick={() => setActiveTab('geometry')}
          data-testid="dock-tab-geometry"
        >
          📐 Geometry
        </button>
        <button
          type="button"
          className={`fp-dock-tab ${activeTab === 'connectivity' ? 'fp-dock-tab--active' : ''}`}
          onClick={() => setActiveTab('connectivity')}
          data-testid="dock-tab-connectivity"
        >
          🔗 Connectivity
        </button>
        <button
          type="button"
          className={`fp-dock-tab ${activeTab === 'pdn' ? 'fp-dock-tab--active' : ''}`}
          onClick={() => setActiveTab('pdn')}
          data-testid="dock-tab-pdn"
        >
          ⚡ PDN &amp; IR Drop
        </button>
        <button
          type="button"
          className={`fp-dock-tab ${activeTab === 'congestion' ? 'fp-dock-tab--active' : ''}`}
          onClick={() => setActiveTab('congestion')}
          data-testid="dock-tab-congestion"
        >
          🔥 Congestion
        </button>
        <button
          type="button"
          className={`fp-dock-tab ${activeTab === 'diagnostics' ? 'fp-dock-tab--active' : ''}`}
          onClick={() => setActiveTab('diagnostics')}
          data-testid="dock-tab-diagnostics"
        >
          🛡️ Diagnostics {violations.length > 0 ? `(${violations.length})` : ''}
        </button>
        <button
          type="button"
          className={`fp-dock-tab ${activeTab === 'reports' ? 'fp-dock-tab--active' : ''}`}
          onClick={() => setActiveTab('reports')}
          data-testid="dock-tab-reports"
        >
          📋 Reports
        </button>
        <button
          type="button"
          className={`fp-dock-tab ${activeTab === 'candidates' ? 'fp-dock-tab--active' : ''}`}
          onClick={() => setActiveTab('candidates')}
          data-testid="dock-tab-candidates"
        >
          ⚖️ Candidates ({candidates.length})
        </button>
      </div>

      <div className="fp-dock-content">
        {/* TAB 1: OVERVIEW (Existing selectors & structure) */}
        {activeTab === 'overview' && (
          <div className="fp-analysis-panel">
            {/* Area Metrics */}
            <div className="fp-metric-group">
              <div className="fp-metric-group__title">Area Geometry</div>
              <div className="fp-metric">
                <span className="fp-metric__label">Core Area:</span>
                <span className="fp-metric__value" data-testid="metric-core-area">{utilization?.coreArea?.toLocaleString() || 0} µm²</span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric__label">Macro Area:</span>
                <span className="fp-metric__value" data-testid="metric-macro-area">{utilization?.macroArea?.toLocaleString() || 0} µm²</span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric__label">StdCell Area:</span>
                <span className="fp-metric__value" data-testid="metric-stdcell-area">{utilization?.stdCellArea?.toLocaleString() || 0} µm²</span>
              </div>
            </div>

            {/* Utilization Metrics */}
            <div className="fp-metric-group">
              <div className="fp-metric-group__title">PPA Utilization</div>
              <div className="fp-metric">
                <span className="fp-metric__label">Nominal:</span>
                <span
                  className={`fp-metric__value ${isOverutilized ? 'fp-metric__value--error' : nominal > budget - 5 ? 'fp-metric__value--warn' : 'fp-metric__value--ok'}`}
                  data-testid="metric-nominal-util"
                  title={`(StdCell + Macro) / Core. Budget: ${budget}%`}
                >
                  {nominal}% <span className="fp-metric__hint">/ {budget}%</span>
                </span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric__label">Effective:</span>
                <span
                  className={`fp-metric__value ${effective > 100 ? 'fp-metric__value--error' : effective > 85 ? 'fp-metric__value--warn' : 'fp-metric__value--ok'}`}
                  data-testid="metric-effective-util"
                  title={utilization?.allNames?.effective}
                >
                  {effective}%
                </span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric__label">Placeable:</span>
                <span className="fp-metric__value" data-testid="metric-routable-area" title="Core minus the union of macro+halo keepouts and blockages">{placeable.toLocaleString()} µm²</span>
              </div>
            </div>

            {/* Wirelength & Congestion */}
            <div className="fp-metric-group">
              <div className="fp-metric-group__title">Interconnect &amp; Routability</div>
              <div className="fp-metric">
                <span className="fp-metric__label">HPWL Wire:</span>
                <span className="fp-metric__value" data-testid="metric-hpwl">{totalHPWL.toLocaleString()} µm</span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric__label">Congestion:</span>
                <span className={`fp-metric__value ${congestionHotspots > 0 ? 'fp-metric__value--warn' : 'fp-metric__value--ok'}`} data-testid="metric-congestion-hotspots">
                  {congestionHotspots} hotspots
                </span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric__label">Max Demand:</span>
                <span className="fp-metric__value" data-testid="metric-max-demand">{Math.round((congestionMap?.maxRatio || 0) * 100)}%</span>
              </div>
            </div>

            {/* Power Grid Integrity */}
            <div className="fp-metric-group">
              <div className="fp-metric-group__title">Power Grid (PDN) Integrity</div>
              <div className="fp-metric">
                <span className="fp-metric__label">VDD Net:</span>
                <span className={`fp-metric__value ${vddOpen ? 'fp-metric__value--error' : 'fp-metric__value--ok'}`} data-testid="metric-vdd-net">
                  {vddOpen ? '⚠️ Open Net' : '✓ Continuous'}
                </span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric__label">VSS Net:</span>
                <span className={`fp-metric__value ${vssOpen ? 'fp-metric__value--error' : 'fp-metric__value--ok'}`} data-testid="metric-vss-net">
                  {vssOpen ? '⚠️ Open Net' : '✓ Continuous'}
                </span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric__label">Missing Vias:</span>
                <span className={`fp-metric__value ${missingVias > 0 ? 'fp-metric__value--error' : 'fp-metric__value--ok'}`} data-testid="metric-missing-vias">
                  {missingVias} dropped
                </span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric__label">Est. IR-Drop:</span>
                <span
                  className={`fp-metric__value ${irOpen ? 'fp-metric__value--error' : maxIRDrop > 30 ? 'fp-metric__value--warn' : 'fp-metric__value--ok'}`}
                  data-testid="metric-ir-drop"
                  title={pdnAnalysis?.irDrop?.assumptions}
                >
                  {irOpen ? `open strap (${maxIRDrop} mV on connected)` : `${maxIRDrop} mV`}
                </span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric__label">Shorts:</span>
                <span className={`fp-metric__value ${shortCount > 0 ? 'fp-metric__value--error' : 'fp-metric__value--ok'}`} data-testid="metric-shorts">
                  {shortCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GEOMETRY */}
        {activeTab === 'geometry' && (
          <div className="fp-dock-pane" data-testid="dock-pane-geometry">
            <div className="fp-dock-pane-row">
              <div className="fp-dock-card">
                <h4>📐 Dimensions &amp; Aspect Ratio</h4>
                <p>Core Dimensions: <strong>{project?.core?.width} × {project?.core?.height} µm</strong></p>
                <p>Die Dimensions: <strong>{project?.die?.width} × {project?.die?.height} µm</strong></p>
                <p>Core Aspect Ratio (H/W): <strong>{(project?.core?.height / (project?.core?.width || 1)).toFixed(3)}</strong></p>
                <p>Die Margins: <strong>X: {project?.core?.x} µm, Y: {project?.core?.y} µm</strong></p>
              </div>
              <div className="fp-dock-card">
                <h4>📦 Area Breakdown</h4>
                <p>Total Core Area: <strong>{utilization?.coreArea?.toLocaleString()} µm²</strong></p>
                <p>Macro Area: <strong>{utilization?.macroArea?.toLocaleString()} µm²</strong></p>
                <p>Standard Cell Area: <strong>{utilization?.stdCellArea?.toLocaleString()} µm²</strong></p>
                <p>Placeable Area (Core - Halos - Blockages): <strong>{placeable.toLocaleString()} µm²</strong></p>
              </div>
              <div className="fp-dock-card">
                <h4>🧱 Placement Rows &amp; Sites</h4>
                <p>Row Height: <strong>2.72 µm</strong></p>
                <p>Site Width: <strong>0.46 µm</strong></p>
                <p>Total Estimated Placement Rows: <strong>{Math.floor((project?.core?.height || 0) / 2.72)}</strong></p>
                <p>Standard Cell Sites per Row: <strong>{Math.floor((project?.core?.width || 0) / 0.46)}</strong></p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONNECTIVITY */}
        {activeTab === 'connectivity' && (
          <div className="fp-dock-pane" data-testid="dock-pane-connectivity">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600 }}>Total Logical Nets: {(project?.nets || []).length} | Cumulative HPWL: {totalHPWL.toLocaleString()} µm</span>
            </div>
            {(project?.nets || []).length === 0 ? (
              <p style={{ color: '#64748b' }}>No logical nets defined. Add nets or pins to analyze interconnect wirelength.</p>
            ) : (
              <div className="fp-dock-table-wrap">
                <table className="fp-dock-table">
                  <thead>
                    <tr>
                      <th>Net ID</th>
                      <th>Pins Connected</th>
                      <th>HPWL (µm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(project?.nets || []).map((net) => (
                      <tr key={net.id || net.name}>
                        <td>{net.name || net.id}</td>
                        <td>{(net.pins || []).length} pins</td>
                        <td>{hpwl?.netHPWL?.[net.id]?.toLocaleString() || '—'} µm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PDN & IR DROP */}
        {activeTab === 'pdn' && (
          <div className="fp-dock-pane" data-testid="dock-pane-pdn">
            <div className="fp-dock-pane-row">
              <div className="fp-dock-card">
                <h4>⚡ Power Grid Topology</h4>
                <p>Power Rings: <strong>{(project?.powerNetwork?.rings || []).length}</strong> (VDD &amp; VSS)</p>
                <p>Power Straps: <strong>{(project?.powerNetwork?.straps || []).length}</strong></p>
                <p>Interlayer Vias: <strong>{(project?.powerNetwork?.vias || []).length}</strong></p>
                <p>VDD Net Continuity: <strong style={{ color: vddOpen ? '#f87171' : '#4ade80' }}>{vddOpen ? 'Open (Failed)' : 'Continuous (Passed)'}</strong></p>
                <p>VSS Net Continuity: <strong style={{ color: vssOpen ? '#f87171' : '#4ade80' }}>{vssOpen ? 'Open (Failed)' : 'Continuous (Passed)'}</strong></p>
              </div>
              <div className="fp-dock-card">
                <h4>📉 Nodal Resistive IR Drop</h4>
                <p>Worst Combined Drop: <strong style={{ color: maxIRDrop > 30 ? '#f87171' : '#4ade80' }}>{maxIRDrop} mV</strong></p>
                <p>Static Voltage Drop Budget: <strong>≤ 30 mV</strong></p>
                <p>VDD Max Drop: <strong>{pdnAnalysis?.resistiveSolve?.maxVDDDropMv ?? maxIRDrop} mV</strong></p>
                <p>VSS Ground Bounce: <strong>{pdnAnalysis?.resistiveSolve?.maxVSSBounceMv ?? 0} mV</strong></p>
                <p>Status: <strong style={{ color: maxIRDrop <= 30 && !irOpen ? '#4ade80' : '#f87171' }}>{maxIRDrop <= 30 && !irOpen ? '✓ Pass' : '⚠️ Exceeded'}</strong></p>
              </div>
              <div className="fp-dock-card">
                <h4>🛡️ Fault Diagnostics</h4>
                <p>Missing Vias (Strap-to-Ring): <strong style={{ color: missingVias > 0 ? '#f87171' : '#4ade80' }}>{missingVias}</strong></p>
                <p>Electrical Shorts (VDD↔VSS): <strong style={{ color: shortCount > 0 ? '#f87171' : '#4ade80' }}>{shortCount}</strong></p>
                <p>Floating Straps: <strong>{pdnAnalysis?.openNets?.floatingStraps?.length || 0}</strong></p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CONGESTION */}
        {activeTab === 'congestion' && (
          <div className="fp-dock-pane" data-testid="dock-pane-congestion">
            <div className="fp-dock-pane-row">
              <div className="fp-dock-card">
                <h4>🔥 Early Routability &amp; Congestion</h4>
                <p>Peak Bin Demand/Capacity: <strong style={{ color: (congestionMap?.maxRatio || 0) > 0.9 ? '#f87171' : '#4ade80' }}>{Math.round((congestionMap?.maxRatio || 0) * 100)}%</strong></p>
                <p>Critical Overflow Bins (&gt;100%): <strong>{congestionMap?.overflowCount || 0}</strong></p>
                <p>Congestion Hotspots (&gt;90%): <strong>{congestionHotspots}</strong></p>
                <p>Early Routability Status: <strong style={{ color: (congestionMap?.maxRatio || 0) < 0.95 ? '#4ade80' : '#f87171' }}>{(congestionMap?.maxRatio || 0) < 0.95 ? '✓ Routable' : '⚠️ Routing Bottlenecks Present'}</strong></p>
              </div>
              <div className="fp-dock-card">
                <h4>🚧 Macro Channel Clearances</h4>
                <p>Minimum Recommended Channel Width: <strong>35 µm</strong></p>
                <p>Narrow Channel Penalty (&lt;35µm): <strong>Active in 2D Congestion Solver</strong></p>
                <p>Blockage Track Derating: <strong>100% (Hard) / 40% (Soft)</strong></p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DIAGNOSTICS */}
        {activeTab === 'diagnostics' && (
          <div className="fp-dock-pane" data-testid="dock-pane-diagnostics">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600 }}>Physical Design Rule Deck &amp; Diagnostic Checks</span>
              <span style={{ color: violations.length === 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                {violations.length === 0 ? '✓ 0 Violations (Clean Floorplan)' : `⚠️ ${violations.length} Active Violation(s)`}
              </span>
            </div>
            {violations.length === 0 ? (
              <p style={{ color: '#4ade80' }}>✓ Floorplan passes all physical design rules! Ready for power routing and placement.</p>
            ) : (
              <div className="fp-dock-table-wrap">
                <table className="fp-dock-table">
                  <thead>
                    <tr>
                      <th>Rule</th>
                      <th>Severity</th>
                      <th>Target</th>
                      <th>Message</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {violations.map((v, idx) => (
                      <tr key={idx} className="fp-violation-row">
                        <td style={{ color: v.severity === 'error' ? '#f87171' : '#fcd34d' }}>{v.rule}</td>
                        <td>{v.severity.toUpperCase()}</td>
                        <td>{v.targetId || 'Global'}</td>
                        <td>{v.message}</td>
                        <td>
                          {v.viaFix && onAddVia ? (
                            <button
                              type="button"
                              className="fp-toolbar-btn fp-toolbar-btn--primary"
                              style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                              onClick={() => onAddVia(v.viaFix)}
                              data-testid="dock-add-via-fix"
                            >
                              + Via Fix
                            </button>
                          ) : v.targetId && onSelectViolation ? (
                            <button
                              type="button"
                              className="fp-toolbar-btn"
                              style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                              onClick={() => onSelectViolation(v)}
                            >
                              Inspect
                            </button>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: REPORTS */}
        {activeTab === 'reports' && (
          <div className="fp-dock-pane" data-testid="dock-pane-reports">
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '8px' }}>
              <button
                type="button"
                className="fp-toolbar-btn fp-toolbar-btn--primary"
                onClick={handleCopyReport}
                data-testid="btn-copy-report"
              >
                📋 Copy Report to Clipboard
              </button>
              <button
                type="button"
                className="fp-toolbar-btn"
                onClick={handleDownloadReport}
                data-testid="btn-download-report"
              >
                ⤓ Download Report (.txt)
              </button>
            </div>
            <pre className="fp-report-preview" data-testid="report-text-preview">
              {generateReportText()}
            </pre>
          </div>
        )}

        {/* TAB 8: CANDIDATES */}
        {activeTab === 'candidates' && (
          <div className="fp-dock-pane" data-testid="dock-pane-candidates">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <button
                type="button"
                className="fp-toolbar-btn fp-toolbar-btn--primary"
                onClick={onSnapshotCandidate}
                data-testid="btn-dock-snapshot-candidate"
              >
                📸 Snapshot Current Design as Candidate
              </button>
              {candidates.length > 0 && (
                <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                  ★ {paretoFrontier.length} Pareto-Optimal Candidate(s) on Frontier
                </span>
              )}
            </div>

            {candidates.length === 0 ? (
              <p style={{ color: '#64748b' }}>No candidate snapshots saved yet. Click above to capture design alternatives.</p>
            ) : (
              <div className="fp-dock-table-wrap">
                <table className="fp-dock-table">
                  <thead>
                    <tr>
                      <th>Candidate Name</th>
                      <th>Core Area</th>
                      <th>Nominal Util</th>
                      <th>Total HPWL</th>
                      <th>Worst IR Drop</th>
                      <th>Peak Congestion</th>
                      <th>DRC Clean</th>
                      <th>Pareto</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c, idx) => {
                      const m = c.metrics || {};
                      const isClean = m.isClean ?? m.clean;
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td>{m.coreArea ? m.coreArea.toLocaleString() : '—'} µm²</td>
                          <td>{m.nominalUtilization ?? '—'}%</td>
                          <td>{m.totalHPWL ? m.totalHPWL.toLocaleString() : '—'} µm</td>
                          <td>{m.worstIRDropMv ?? m.maxIRDropMv ?? '—'} mV</td>
                          <td>{m.maxCongestionRatio ? (m.maxCongestionRatio * 100).toFixed(0) + '%' : '—'}</td>
                          <td style={{ color: isClean ? '#4ade80' : '#f87171' }}>{isClean ? '✓ Clean' : '⚠️ Errors'}</td>
                          <td>
                            {paretoNames.has(c.name) && (
                              <span className="fp-pareto-badge">★ Pareto</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                className="fp-toolbar-btn"
                                style={{ fontSize: '0.68rem', padding: '1px 5px' }}
                                onClick={() => onLoadCandidate && onLoadCandidate(c.projectData || c.project)}
                              >
                                Restore
                              </button>
                            <button
                              type="button"
                              className="fp-toolbar-btn fp-toolbar-btn--danger"
                              style={{ fontSize: '0.68rem', padding: '1px 5px' }}
                              onClick={() => onDeleteCandidate && onDeleteCandidate(idx)}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
