/**
 * PropertiesInspector.jsx
 * =======================
 * Right-hand property editor for the selected floorplan element.
 * Provides live numerical controls for:
 * - Hard Macros (coordinates, size, orientation, keepout halo, fixed state, duplicate, delete)
 * - I/O Pins (edge assignment, coordinate along edge, metal layer, net, delete)
 * - Blockages (type: hard/soft, coordinates, dimensions, delete)
 * - Die & Core boundaries (dimensions, margins, area)
 * - Power rings, straps, and vias (including removal)
 * - Diagnostics tab with interactive violation remediation
 */

import React, { useState } from 'react';
import DiagnosticsPanel from './DiagnosticsPanel.jsx';

export default function PropertiesInspector({
  project,
  selectedId,
  selectedType,
  onUpdateMacro,
  onUpdatePin,
  onUpdateBlockage,
  onUpdateStrap,
  onUpdateRing,
  onUpdateDie,
  onUpdateCore,
  onDeleteSelected,
  onDuplicateMacro,
  violations = [],
  onSelectViolation,
  onAddVia,
}) {
  const [activeTab, setActiveTab] = useState('properties');

  return (
    <aside className="fp-studio__right" aria-label="Properties and Diagnostics Inspector" data-testid="properties-inspector">
      <div className="fp-inspector__tabs">
        <button
          type="button"
          className={`fp-tab-btn ${activeTab === 'properties' ? 'fp-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('properties')}
          data-testid="tab-properties"
        >
          Properties
        </button>
        <button
          type="button"
          className={`fp-tab-btn ${activeTab === 'diagnostics' ? 'fp-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('diagnostics')}
          data-testid="tab-diagnostics"
        >
          Diagnostics {violations.length > 0 ? `(${violations.length})` : ''}
        </button>
      </div>

      {activeTab === 'diagnostics' ? (
        <DiagnosticsPanel
          violations={violations}
          onSelectViolation={onSelectViolation}
          onAddVia={onAddVia}
        />
      ) : (
        <div className="fp-inspector__body">
          {!selectedId || !selectedType ? (
            <div className="fp-inspector__empty">
              <p style={{ margin: 0, fontSize: '1.2rem' }}>🖱️</p>
              <p style={{ marginTop: '0.5rem' }}>Select an object in the Canvas or Design Explorer to inspect and edit its physical properties.</p>
            </div>
          ) : selectedType === 'macro' ? (
            (() => {
              const macro = (project?.macros || []).find((m) => m.id === selectedId);
              if (!macro) return null;
              return (
                <div>
                  <div className="fp-inspector__header">🧱 Macro: {macro.name || macro.id}</div>
                  <div className="fp-prop-group">
                    <div className="fp-prop-group__title">Identification &amp; Master</div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">ID:</span>
                      <span className="fp-prop-value">{macro.id}</span>
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Name:</span>
                      <input
                        type="text"
                        className="fp-prop-input"
                        style={{ width: '120px' }}
                        value={macro.name || ''}
                        onChange={(e) => onUpdateMacro(macro.id, { name: e.target.value })}
                        data-testid="input-macro-name"
                      />
                    </div>
                    {macro.masterId && (
                      <div className="fp-prop-row">
                        <span className="fp-prop-label">Master:</span>
                        <span className="fp-prop-value">{macro.masterId}</span>
                      </div>
                    )}
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Fixed:</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(macro.fixed)}
                          onChange={(e) => onUpdateMacro(macro.id, { fixed: e.target.checked })}
                          data-testid="checkbox-macro-fixed"
                        />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Lock position</span>
                      </label>
                    </div>
                  </div>

                  <div className="fp-prop-group">
                    <div className="fp-prop-group__title">Position &amp; Size (µm)</div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">X:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={macro.x}
                        onChange={(e) => onUpdateMacro(macro.id, { x: Number(e.target.value) || 0 })}
                        data-testid="input-macro-x"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Y:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={macro.y}
                        onChange={(e) => onUpdateMacro(macro.id, { y: Number(e.target.value) || 0 })}
                        data-testid="input-macro-y"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Width:</span>
                      <span className="fp-prop-value">{macro.width} µm</span>
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Height:</span>
                      <span className="fp-prop-value">{macro.height} µm</span>
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Area:</span>
                      <span className="fp-prop-value">{(macro.width * macro.height).toLocaleString()} µm²</span>
                    </div>
                  </div>

                  <div className="fp-prop-group">
                    <div className="fp-prop-group__title">Orientation &amp; Halos</div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Orient:</span>
                      <select
                        className="fp-prop-input"
                        style={{ width: '90px' }}
                        value={macro.orientation || 'R0'}
                        onChange={(e) => onUpdateMacro(macro.id, { orientation: e.target.value })}
                        data-testid="select-macro-orient"
                      >
                        <option value="R0">R0 (0°)</option>
                        <option value="R90">R90 (90°)</option>
                        <option value="R180">R180 (180°)</option>
                        <option value="R270">R270 (270°)</option>
                        <option value="MY">MY (Flip X)</option>
                        <option value="MX">MX (Flip Y)</option>
                      </select>
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Keepout:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={macro.halo || 0}
                        min={0}
                        onChange={(e) => onUpdateMacro(macro.id, { halo: Math.max(0, Number(e.target.value) || 0) })}
                        data-testid="input-macro-halo"
                      />
                    </div>
                  </div>

                  <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {onDuplicateMacro && (
                      <button
                        type="button"
                        className="fp-toolbar-btn"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => onDuplicateMacro(macro.id)}
                        data-testid="btn-duplicate-macro"
                      >
                        📋 Duplicate Macro
                      </button>
                    )}
                    <button
                      type="button"
                      className="fp-toolbar-btn fp-toolbar-btn--danger"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => onDeleteSelected('macro', macro.id)}
                      data-testid="btn-delete-macro"
                    >
                      🗑️ Delete Macro
                    </button>
                  </div>
                </div>
              );
            })()
          ) : selectedType === 'pin' ? (
            (() => {
              const pin = (project?.pins || []).find((p) => p.id === selectedId);
              if (!pin) return null;
              return (
                <div>
                  <div className="fp-inspector__header">📍 I/O Pin: {pin.id}</div>
                  <div className="fp-prop-group">
                    <div className="fp-prop-group__title">Pin Attributes</div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">ID:</span>
                      <span className="fp-prop-value">{pin.id}</span>
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Net:</span>
                      <input
                        type="text"
                        className="fp-prop-input"
                        style={{ width: '100px' }}
                        value={pin.net || ''}
                        onChange={(e) => onUpdatePin(pin.id, { net: e.target.value })}
                        data-testid="input-pin-net"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Edge:</span>
                      <select
                        className="fp-prop-input"
                        style={{ width: '90px' }}
                        value={pin.edge || 'top'}
                        onChange={(e) => onUpdatePin(pin.id, { edge: e.target.value })}
                        data-testid="select-pin-edge"
                      >
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Coord:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={pin.coord || 0}
                        onChange={(e) => onUpdatePin(pin.id, { coord: Number(e.target.value) || 0 })}
                        data-testid="input-pin-coord"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Layer:</span>
                      <select
                        className="fp-prop-input"
                        style={{ width: '80px' }}
                        value={pin.layer || 'M3'}
                        onChange={(e) => onUpdatePin(pin.id, { layer: e.target.value })}
                        data-testid="select-pin-layer"
                      >
                        <option value="M2">M2</option>
                        <option value="M3">M3</option>
                        <option value="M4">M4</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ padding: '0.85rem' }}>
                    <button
                      type="button"
                      className="fp-toolbar-btn fp-toolbar-btn--danger"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => onDeleteSelected('pin', pin.id)}
                      data-testid="btn-delete-pin"
                    >
                      🗑️ Delete Pin
                    </button>
                  </div>
                </div>
              );
            })()
          ) : selectedType === 'blockage' ? (
            (() => {
              const blk = (project?.blockages || []).find((b) => b.id === selectedId);
              if (!blk) return null;
              return (
                <div>
                  <div className="fp-inspector__header">🚫 Blockage: {blk.id}</div>
                  <div className="fp-prop-group">
                    <div className="fp-prop-group__title">Blockage Attributes</div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">ID:</span>
                      <span className="fp-prop-value">{blk.id}</span>
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Type:</span>
                      <select
                        className="fp-prop-input"
                        style={{ width: '90px' }}
                        value={blk.type || 'hard'}
                        onChange={(e) => onUpdateBlockage && onUpdateBlockage(blk.id, { type: e.target.value })}
                        data-testid="select-blk-type"
                      >
                        <option value="hard">Hard</option>
                        <option value="soft">Soft</option>
                      </select>
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">X:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={blk.x}
                        onChange={(e) => onUpdateBlockage && onUpdateBlockage(blk.id, { x: Number(e.target.value) || 0 })}
                        data-testid="input-blk-x"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Y:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={blk.y}
                        onChange={(e) => onUpdateBlockage && onUpdateBlockage(blk.id, { y: Number(e.target.value) || 0 })}
                        data-testid="input-blk-y"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Width:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={blk.width}
                        onChange={(e) => onUpdateBlockage && onUpdateBlockage(blk.id, { width: Number(e.target.value) || 0 })}
                        data-testid="input-blk-w"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Height:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={blk.height}
                        onChange={(e) => onUpdateBlockage && onUpdateBlockage(blk.id, { height: Number(e.target.value) || 0 })}
                        data-testid="input-blk-h"
                      />
                    </div>
                  </div>

                  <div style={{ padding: '0.85rem' }}>
                    <button
                      type="button"
                      className="fp-toolbar-btn fp-toolbar-btn--danger"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => onDeleteSelected('blockage', blk.id)}
                      data-testid="btn-delete-blockage"
                    >
                      🗑️ Delete Blockage
                    </button>
                  </div>
                </div>
              );
            })()
          ) : selectedType === 'core' || selectedType === 'die' ? (
            (() => {
              const die = project?.die || { width: 500, height: 400 };
              const core = project?.core || { width: 420, height: 320, x: 40, y: 40 };
              return (
                <div>
                  <div className="fp-inspector__header">📐 Boundaries</div>
                  <div className="fp-prop-group">
                    <div className="fp-prop-group__title">Die Boundary</div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Width:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={die.width}
                        onChange={(e) => onUpdateDie && onUpdateDie({ width: Math.max(100, Number(e.target.value) || 100) })}
                        data-testid="input-die-width"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Height:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={die.height}
                        onChange={(e) => onUpdateDie && onUpdateDie({ height: Math.max(100, Number(e.target.value) || 100) })}
                        data-testid="input-die-height"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Die Area:</span>
                      <span className="fp-prop-value">{(die.width * die.height).toLocaleString()} µm²</span>
                    </div>
                  </div>

                  <div className="fp-prop-group">
                    <div className="fp-prop-group__title">Core Boundary</div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Margin X:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={core.x}
                        onChange={(e) => onUpdateCore && onUpdateCore({ x: Math.max(0, Number(e.target.value) || 0) })}
                        data-testid="input-core-margin-x"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Margin Y:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={core.y}
                        onChange={(e) => onUpdateCore && onUpdateCore({ y: Math.max(0, Number(e.target.value) || 0) })}
                        data-testid="input-core-margin-y"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Width:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={core.width}
                        onChange={(e) => onUpdateCore && onUpdateCore({ width: Math.max(50, Number(e.target.value) || 50) })}
                        data-testid="input-core-width"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Height:</span>
                      <input
                        type="number"
                        className="fp-prop-input"
                        value={core.height}
                        onChange={(e) => onUpdateCore && onUpdateCore({ height: Math.max(50, Number(e.target.value) || 50) })}
                        data-testid="input-core-height"
                      />
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Core Area:</span>
                      <span className="fp-prop-value">{(core.width * core.height).toLocaleString()} µm²</span>
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Aspect Ratio:</span>
                      <span className="fp-prop-value">{(core.height / (core.width || 1)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : selectedType === 'ring' || selectedType === 'strap' || selectedType === 'via' ? (
            (() => {
              const power = project?.powerNetwork || {};
              let entity = null;
              if (selectedType === 'ring') entity = (power.rings || []).find((r) => r.id === selectedId);
              if (selectedType === 'strap') entity = (power.straps || []).find((s) => s.id === selectedId);
              if (selectedType === 'via') entity = (power.vias || []).find((v) => v.id === selectedId);

              if (!entity) return null;

              return (
                <div>
                  <div className="fp-inspector__header">⚡ Power Network: {selectedType.toUpperCase()}</div>
                  <div className="fp-prop-group">
                    <div className="fp-prop-group__title">Entity Details</div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">ID:</span>
                      <span className="fp-prop-value">{entity.id}</span>
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Net:</span>
                      <span className="fp-prop-value">{entity.net}</span>
                    </div>
                    <div className="fp-prop-row">
                      <span className="fp-prop-label">Layer:</span>
                      <span className="fp-prop-value">{entity.layer || `${entity.layer1}→${entity.layer2}`}</span>
                    </div>
                    {entity.width !== undefined && (
                      <div className="fp-prop-row">
                        <span className="fp-prop-label">Width:</span>
                        <span className="fp-prop-value">{entity.width} µm</span>
                      </div>
                    )}
                    {entity.x !== undefined && entity.y !== undefined && (
                      <div className="fp-prop-row">
                        <span className="fp-prop-label">Pos:</span>
                        <span className="fp-prop-value">({entity.x}, {entity.y}) µm</span>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '0.85rem' }}>
                    <button
                      type="button"
                      className="fp-toolbar-btn fp-toolbar-btn--danger"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => onDeleteSelected(selectedType, entity.id)}
                      data-testid={selectedType === 'via' ? 'btn-remove-via' : `btn-delete-${selectedType}`}
                    >
                      🗑️ Remove {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
                    </button>
                  </div>
                </div>
              );
            })()
          ) : null}
        </div>
      )}
    </aside>
  );
}
