/**
 * DesignExplorer.jsx
 * ==================
 * Left sidebar tree view of Floorplan design entities:
 * - Boundaries (Die, Core)
 * - Hard Macros (selectable, show halos & orientation, actions: lock, duplicate, delete)
 * - I/O Pins (grouped by edge, selectable, delete)
 * - Power Network (Rings, Straps, Vias)
 * - Blockages (hard & soft, selectable, delete)
 * - Nets & Connectivity (logical netlist, pin counts)
 * - Macro Masters (standard master library reference)
 * - Active Violations (diagnostic remediation)
 */

import React, { useState } from 'react';
import { MACRO_MASTERS_LIBRARY } from '../../../engine/floorplanProjectModel.js';

export default function DesignExplorer({
  project,
  selectedId,
  selectedType,
  onSelect,
  violations = [],
  onSelectViolation,
  onAddVia,
  onDeleteSelected,
  onDuplicateMacro,
  onToggleLockMacro,
}) {
  const [openSections, setOpenSections] = useState({
    boundaries: true,
    macros: true,
    pins: true,
    power: true,
    blockages: false,
    nets: false,
    masters: false,
    violations: true,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const macros = project?.macros || [];
  const pins = project?.pins || [];
  const rings = project?.powerNetwork?.rings || [];
  const straps = project?.powerNetwork?.straps || [];
  const vias = project?.powerNetwork?.vias || [];
  const blockages = project?.blockages || [];
  const nets = project?.nets || [];
  const masterKeys = Object.keys(MACRO_MASTERS_LIBRARY);

  return (
    <aside className="fp-studio__left" aria-label="Design Hierarchy Explorer" data-testid="design-explorer">
      {/* Violations Section (if any) */}
      {violations.length > 0 && (
        <div className="fp-explorer__section" data-testid="explorer-section-violations">
          <div
            className="fp-explorer__section-header"
            onClick={() => toggleSection('violations')}
          >
            <span>⚠️ Violations</span>
            <span className="fp-explorer__badge fp-explorer__badge--error" data-testid="explorer-violations-badge">
              {violations.length}
            </span>
          </div>
          {openSections.violations && (
            <div>
              {violations.map((v, idx) => (
                <div
                  key={`v-${idx}`}
                  className="fp-explorer__item fp-explorer__item--error"
                  onClick={() => onSelectViolation && onSelectViolation(v)}
                  data-testid={`explorer-violation-${idx}`}
                >
                  <span>●</span>
                  <span style={{ fontSize: '0.74rem' }}>{v.rule}</span>
                  {v.viaFix && onAddVia && (
                    <button
                      type="button"
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.65rem',
                        padding: '1px 5px',
                        background: '#0284c7',
                        border: 'none',
                        borderRadius: '3px',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                      data-testid="explorer-add-via-fix"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddVia(v.viaFix);
                      }}
                    >
                      + Via
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Boundaries */}
      <div className="fp-explorer__section">
        <div
          className="fp-explorer__section-header"
          onClick={() => toggleSection('boundaries')}
        >
          <span>📐 Boundaries</span>
          <span style={{ fontSize: '0.7rem' }}>{openSections.boundaries ? '▼' : '▶'}</span>
        </div>
        {openSections.boundaries && (
          <div>
            <div
              className={`fp-explorer__item ${selectedType === 'die' ? 'fp-explorer__item--selected' : ''}`}
              onClick={() => onSelect('die', 'die')}
              data-testid="explorer-die"
              data-test="explorer-item-die"
            >
              <span>🔳</span>
              <span>Die ({project.die.width}×{project.die.height})</span>
            </div>
            <div
              className={`fp-explorer__item ${selectedType === 'core' ? 'fp-explorer__item--selected' : ''}`}
              onClick={() => onSelect('core', 'core')}
              data-testid="explorer-core"
              data-test="explorer-item-core"
            >
              <span>⬚</span>
              <span>Core ({project.core.width}×{project.core.height})</span>
            </div>
          </div>
        )}
      </div>

      {/* Hard Macros */}
      <div className="fp-explorer__section">
        <div
          className="fp-explorer__section-header"
          onClick={() => toggleSection('macros')}
        >
          <span>🧱 Macros</span>
          <span className="fp-explorer__badge" data-testid="explorer-badge-macros">{macros.length}</span>
        </div>
        {openSections.macros && (
          <div>
            {macros.map((m) => (
              <div
                key={m.id}
                className={`fp-explorer__item ${selectedId === m.id ? 'fp-explorer__item--selected' : ''}`}
                onClick={() => onSelect('macro', m.id)}
                data-testid={`explorer-item-macro-${m.id}`}
              >
                <span>📦</span>
                <span>{m.name || m.id}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {m.fixed && <span title="Fixed Macro" style={{ fontSize: '0.65rem' }}>🔒</span>}
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{m.orientation || 'R0'}</span>
                  {onDuplicateMacro && (
                    <button
                      type="button"
                      className="fp-explorer-action-btn"
                      title="Duplicate Macro"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateMacro(m.id);
                      }}
                      data-testid={`btn-dup-macro-${m.id}`}
                    >
                      📋
                    </button>
                  )}
                  {onDeleteSelected && (
                    <button
                      type="button"
                      className="fp-explorer-action-btn fp-explorer-action-btn--danger"
                      title="Delete Macro"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSelected('macro', m.id);
                      }}
                      data-testid={`btn-del-macro-${m.id}`}
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
            ))}
            {macros.length === 0 && (
              <div style={{ padding: '0.2rem 1.25rem', fontSize: '0.74rem', color: '#475569' }}>
                No macros defined
              </div>
            )}
          </div>
        )}
      </div>

      {/* I/O Pins */}
      <div className="fp-explorer__section">
        <div
          className="fp-explorer__section-header"
          onClick={() => toggleSection('pins')}
        >
          <span>📍 I/O Pins</span>
          <span className="fp-explorer__badge" data-testid="explorer-badge-pins">{pins.length}</span>
        </div>
        {openSections.pins && (
          <div>
            {pins.map((p) => (
              <div
                key={p.id}
                className={`fp-explorer__item ${selectedId === p.id ? 'fp-explorer__item--selected' : ''}`}
                onClick={() => onSelect('pin', p.id)}
                data-testid={`explorer-item-pin-${p.id}`}
              >
                <span>•</span>
                <span>{p.id}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {p.edge} ({p.coord}µm)
                  </span>
                  {onDeleteSelected && (
                    <button
                      type="button"
                      className="fp-explorer-action-btn fp-explorer-action-btn--danger"
                      title="Delete Pin"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSelected('pin', p.id);
                      }}
                      data-testid={`btn-del-pin-${p.id}`}
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Power Network */}
      <div className="fp-explorer__section">
        <div
          className="fp-explorer__section-header"
          onClick={() => toggleSection('power')}
        >
          <span>⚡ Power Grid (PDN)</span>
          <span className="fp-explorer__badge" data-testid="explorer-badge-power">{rings.length + straps.length + vias.length}</span>
        </div>
        {openSections.power && (
          <div>
            {rings.map((r) => (
              <div
                key={r.id}
                className={`fp-explorer__item ${selectedId === r.id ? 'fp-explorer__item--selected' : ''}`}
                onClick={() => onSelect('ring', r.id)}
                data-testid={`explorer-item-ring-${r.id}`}
              >
                <span>⭕</span>
                <span>{r.net} Ring ({r.layer})</span>
              </div>
            ))}
            {straps.map((s) => (
              <div
                key={s.id}
                className={`fp-explorer__item ${selectedId === s.id ? 'fp-explorer__item--selected' : ''}`}
                onClick={() => onSelect('strap', s.id)}
                data-testid={`explorer-item-strap-${s.id}`}
              >
                <span>═</span>
                <span>{s.net} Strap ({s.layer})</span>
                {onDeleteSelected && (
                  <button
                    type="button"
                    className="fp-explorer-action-btn fp-explorer-action-btn--danger"
                    title="Delete Strap"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSelected('strap', s.id);
                    }}
                    data-testid={`btn-del-strap-${s.id}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {vias.map((v) => (
              <div
                key={v.id}
                className={`fp-explorer__item ${selectedId === v.id ? 'fp-explorer__item--selected' : ''}`}
                onClick={() => onSelect('via', v.id)}
                data-testid={`explorer-item-via-${v.id}`}
              >
                <span>✦</span>
                <span>Via {v.id} ({v.net})</span>
                {onDeleteSelected && (
                  <button
                    type="button"
                    className="fp-explorer-action-btn fp-explorer-action-btn--danger"
                    title="Remove Via"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSelected('via', v.id);
                    }}
                    data-testid={`btn-del-via-${v.id}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blockages */}
      <div className="fp-explorer__section">
        <div
          className="fp-explorer__section-header"
          onClick={() => toggleSection('blockages')}
        >
          <span>🚫 Blockages</span>
          <span className="fp-explorer__badge" data-testid="explorer-badge-blockages">{blockages.length}</span>
        </div>
        {openSections.blockages && (
          <div>
            {blockages.map((b) => (
              <div
                key={b.id}
                className={`fp-explorer__item ${selectedId === b.id ? 'fp-explorer__item--selected' : ''}`}
                onClick={() => onSelect('blockage', b.id)}
                data-testid={`explorer-item-blockage-${b.id}`}
              >
                <span>▦</span>
                <span>{b.id} ({b.width}×{b.height})</span>
                {onDeleteSelected && (
                  <button
                    type="button"
                    className="fp-explorer-action-btn fp-explorer-action-btn--danger"
                    title="Delete Blockage"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSelected('blockage', b.id);
                    }}
                    data-testid={`btn-del-blockage-${b.id}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {blockages.length === 0 && (
              <div style={{ padding: '0.2rem 1.25rem', fontSize: '0.74rem', color: '#475569' }}>
                No blockages
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nets & Connectivity */}
      <div className="fp-explorer__section">
        <div
          className="fp-explorer__section-header"
          onClick={() => toggleSection('nets')}
        >
          <span>🔗 Nets</span>
          <span className="fp-explorer__badge" data-testid="explorer-badge-nets">{nets.length}</span>
        </div>
        {openSections.nets && (
          <div>
            {nets.map((n) => (
              <div
                key={n.id}
                className={`fp-explorer__item ${selectedId === n.id ? 'fp-explorer__item--selected' : ''}`}
                onClick={() => onSelect('net', n.id)}
                data-testid={`explorer-item-net-${n.id}`}
              >
                <span>〰</span>
                <span>{n.name || n.id}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#64748b' }}>
                  {(n.pins || []).length} pins
                </span>
              </div>
            ))}
            {nets.length === 0 && (
              <div style={{ padding: '0.2rem 1.25rem', fontSize: '0.74rem', color: '#475569' }}>
                No logical nets defined
              </div>
            )}
          </div>
        )}
      </div>

      {/* Macro Masters Library Reference */}
      <div className="fp-explorer__section">
        <div
          className="fp-explorer__section-header"
          onClick={() => toggleSection('masters')}
        >
          <span>📚 Master Library</span>
          <span className="fp-explorer__badge">{masterKeys.length}</span>
        </div>
        {openSections.masters && (
          <div>
            {masterKeys.map((k) => {
              const m = MACRO_MASTERS_LIBRARY[k];
              return (
                <div
                  key={k}
                  className="fp-explorer__item"
                  title={`${k}: ${m.width}×${m.height}µm, ${(m.pins || []).length} pins`}
                  data-testid={`explorer-item-master-${k}`}
                >
                  <span>📖</span>
                  <span>{k}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#64748b' }}>
                    {m.width}×{m.height}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
