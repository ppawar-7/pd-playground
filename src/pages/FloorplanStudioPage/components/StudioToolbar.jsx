/**
 * StudioToolbar.jsx
 * =================
 * Top action toolbar for Floorplan Studio.
 * Handles Project operations (New, Open Preset, Save, Export, Import),
 * Entity creation (+Macro, +Pin, +Blockage, +Strap, +Via),
 * Automated EDA Assistants (Macro Legalizer, Pin Legalizer, PDN Generator),
 * Interactive Measurement tool, Candidate Comparison,
 * History (Undo, Redo), View controls (Zoom, Pan, Fit, Snap),
 * Layer toggles, and Navigation back to Kingdom.
 */

import React, { useState, useRef } from 'react';
import AddEntityModal from './AddEntityModal.jsx';

export default function StudioToolbar({
  project,
  onNewProject,
  onLoadPreset,
  onSaveProject,
  onExport,
  onExportJson,
  onImportJson,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  snapToGrid,
  onToggleSnap,
  gridSize,
  onChangeGridSize,
  showCongestion,
  onToggleCongestion,
  showPowerNetwork,
  onTogglePowerNetwork,
  showBlockages,
  onToggleBlockages,
  isExploreMode = false,
  onReturnToHome,
  onReturnToKingdom,
  onAddMacro,
  onAddPin,
  onAddBlockage,
  onAddStrap,
  onAddVia,
  onLegalizeMacros,
  onLegalizePins,
  onGeneratePDNGrid,
  measureMode = false,
  onToggleMeasure,
  onOpenCandidateCompare,
  onSnapshotCandidate,
}) {
  const fileInputRef = useRef(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result;
        if (json && onImportJson) {
          onImportJson(json);
        }
      } catch (err) {
        alert('Failed to parse floorplan JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <header className="fp-studio__toolbar" role="toolbar" aria-label="Floorplanning Studio Actions" data-testid="fp-toolbar">
        <div className="fp-studio__toolbar-brand">
          📐 Floorplan Studio 3.0
        </div>

        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={onReturnToHome || onReturnToKingdom}
          title="Return to Three-Studio Home Hub"
          data-testid="btn-return-home"
        >
          ← Home Hub
        </button>

        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={onReturnToKingdom}
          title="Return to Kingdom view"
          data-testid="btn-return-kingdom"
        >
          ← Kingdom
        </button>

        <div className="fp-studio__toolbar-sep" />

        {/* Project Operations */}
        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={onNewProject}
          title="Create blank project"
          data-testid="btn-new"
        >
          📄 New
        </button>

        <select
          className="fp-toolbar-btn"
          onChange={(e) => {
            if (e.target.value) {
              onLoadPreset(e.target.value);
              e.target.value = '';
            }
          }}
          defaultValue=""
          title="Load Benchmark Scenario"
          data-testid="preset-select"
        >
          <option value="" disabled>Load Preset / Scenario...</option>
          <option value="scenario-a">Scenario A: Simple Control ASIC</option>
          <option value="scenario-b">Scenario B: Dual SRAM Controller (Missing Via)</option>
          <option value="scenario-c">Scenario C: Four-Macro Subsystem</option>
          <option value="scenario-d">Scenario D: Small SoC (Pin Pitch)</option>
          <option value="scenario-e">Scenario E: Broken PDN (Shorts &amp; Floating)</option>
          <option value="scenario-f">Scenario F: Congestion Stress Design</option>
          <option value="capstone-soc">Capstone: 6-Macro Multi-Core SoC</option>
          <option value="small-controller">Legacy: Small Controller (Overlap)</option>
          <option value="dual-sram">Legacy: Dual SRAM Controller</option>
          <option value="small-soc">Legacy: Small SoC Subsystem</option>
        </select>

        <button
          type="button"
          className="fp-toolbar-btn fp-toolbar-btn--primary"
          onClick={onSaveProject}
          title="Save project to persistent storage"
          data-testid="btn-save"
        >
          💾 Save
        </button>

        <div className="fp-toolbar-preset-dropdown" style={{ position: 'relative' }}>
          <button
            type="button"
            className="fp-toolbar-btn"
            onClick={() => setExportDropdownOpen((v) => !v)}
            title="Export design in industry EDA formats (LEF, DEF, JSON, Report)"
            data-testid="btn-export"
          >
            ⤓ Export ▾
          </button>
          {exportDropdownOpen && (
            <div className="fp-toolbar-preset-menu" style={{ minWidth: '180px', zIndex: 100 }}>
              <button
                type="button"
                className="fp-toolbar-preset-item"
                data-testid="btn-export-json"
                onClick={() => {
                  if (onExport) onExport('json');
                  else if (onExportJson) onExportJson();
                }}
              >
                Project (.json)
              </button>
              <button
                type="button"
                className="fp-toolbar-preset-item"
                data-testid="btn-export-lef"
                onClick={() => {
                  if (onExport) onExport('lef');
                }}
              >
                Physical Library (.lef)
              </button>
              <button
                type="button"
                className="fp-toolbar-preset-item"
                data-testid="btn-export-def"
                onClick={() => {
                  if (onExport) onExport('def');
                }}
              >
                Design Layout (.def)
              </button>
              <button
                type="button"
                className="fp-toolbar-preset-item"
                data-testid="btn-export-report"
                onClick={() => {
                  if (onExport) onExport('report');
                }}
              >
                Signoff Report (.txt)
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Import design JSON"
          data-testid="btn-import"
        >
          ⤒ Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="fp-studio__toolbar-sep" />

        {/* Entity Creation Dialog Launcher */}
        <button
          type="button"
          className="fp-toolbar-btn fp-toolbar-btn--accent"
          onClick={() => setIsAddModalOpen(true)}
          title="Add Macro, Pin, Blockage, Strap, or Via"
          data-testid="btn-open-add-entity"
        >
          ➕ Add Entity...
        </button>

        {/* Automated EDA Assistants */}
        <select
          className="fp-toolbar-btn"
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'legalize-macros' && onLegalizeMacros) onLegalizeMacros();
            else if (val === 'legalize-pins' && onLegalizePins) onLegalizePins();
            else if (val === 'generate-pdn' && onGeneratePDNGrid) onGeneratePDNGrid();
            e.target.value = '';
          }}
          defaultValue=""
          title="Run Automated EDA Design Assistants"
          data-testid="assistants-select"
        >
          <option value="" disabled>🤖 Assistants...</option>
          <option value="legalize-macros">Assist: Legalize Macros</option>
          <option value="legalize-pins">Assist: Legalize Pins</option>
          <option value="generate-pdn">Assist: Generate PDN Mesh</option>
        </select>

        {/* Measurement Tool Toggle */}
        <button
          type="button"
          className={`fp-toolbar-btn ${measureMode ? 'fp-toolbar-btn--active' : ''}`}
          onClick={onToggleMeasure}
          title="Toggle Canvas Measurement Ruler (Click 2 points to measure distance)"
          data-testid="btn-toggle-measure"
        >
          📏 {measureMode ? 'Measuring...' : 'Measure'}
        </button>

        {/* Candidate Comparison Modal Trigger */}
        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={onOpenCandidateCompare}
          title="Compare floorplan candidate snapshots and view Pareto trade-offs"
          data-testid="btn-compare-candidates"
        >
          ⚖️ Compare
        </button>

        <div className="fp-studio__toolbar-sep" />

        {/* Undo / Redo */}
        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          data-testid="btn-undo"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          data-testid="btn-redo"
        >
          ↷ Redo
        </button>

        <div className="fp-studio__toolbar-sep" />

        {/* Zoom / View controls */}
        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={onZoomOut}
          title="Zoom Out"
          data-testid="btn-zoom-out"
        >
          −
        </button>
        <span className="fp-toolbar-zoom" data-testid="zoom-level">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={onZoomIn}
          title="Zoom In"
          data-testid="btn-zoom-in"
        >
          +
        </button>
        <button
          type="button"
          className="fp-toolbar-btn"
          onClick={onFitView}
          title="Fit Design to View"
          data-testid="btn-fit-view"
        >
          ⛶ Fit
        </button>

        <div className="fp-studio__toolbar-sep" />

        {/* Grid & Snapping */}
        <button
          type="button"
          className={`fp-toolbar-btn ${snapToGrid ? 'fp-toolbar-btn--active' : ''}`}
          onClick={onToggleSnap}
          title="Toggle Grid Snapping"
          data-testid="btn-toggle-snap"
        >
          🧲 Snap: {snapToGrid ? `${gridSize}µm` : 'Off'}
        </button>

        <div className="fp-studio__toolbar-sep" />

        {/* Layer Toggles */}
        <button
          type="button"
          className={`fp-toolbar-btn ${showPowerNetwork ? 'fp-toolbar-btn--active' : ''}`}
          onClick={onTogglePowerNetwork}
          title="Toggle Power Distribution Network (Rings & Straps)"
          data-testid="btn-toggle-pdn"
        >
          ⚡ PDN
        </button>

        <button
          type="button"
          className={`fp-toolbar-btn ${showCongestion ? 'fp-toolbar-btn--active' : ''}`}
          onClick={onToggleCongestion}
          title="Toggle Routability / Congestion Heatmap Overlay"
          data-testid="btn-toggle-congestion"
        >
          🔥 Congestion
        </button>

        <button
          type="button"
          className={`fp-toolbar-btn ${showBlockages ? 'fp-toolbar-btn--active' : ''}`}
          onClick={onToggleBlockages}
          title="Toggle Placement Blockages"
          data-testid="btn-toggle-blockages"
        >
          🚫 Blockages
        </button>

        {isExploreMode && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.74rem',
              background: '#1e3a5f',
              color: '#38bdf8',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #0284c7',
              fontWeight: 700,
            }}
            data-testid="explore-sandbox-badge"
          >
            🧭 Explore Sandbox
          </span>
        )}
      </header>

      {/* Add Entity Modal */}
      <AddEntityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        project={project}
        onAddMacro={onAddMacro}
        onAddPin={onAddPin}
        onAddBlockage={onAddBlockage}
        onAddStrap={onAddStrap}
        onAddVia={onAddVia}
      />
    </>
  );
}
