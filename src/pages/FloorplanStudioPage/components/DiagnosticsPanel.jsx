/**
 * DiagnosticsPanel.jsx
 * ====================
 * Interactive violations and design rule checks browser.
 * Clicking any violation highlights the offending object in the Studio canvas.
 * Provides quick fix actions (e.g. Add Missing Via).
 */

import React from 'react';

export default function DiagnosticsPanel({
  violations = [],
  onSelectViolation,
  onAddVia,
}) {
  if (violations.length === 0) {
    return (
      <div
        className="fp-diagnostics-clean"
        data-testid="diagnostics-clean"
        style={{ padding: '1rem', fontSize: '0.82rem', color: '#4ade80', textAlign: 'center' }}
      >
        ✓ 0 DRC or Connectivity Violations. Clean Floorplan Signoff!
      </div>
    );
  }

  return (
    <div className="fp-diagnostics" aria-label="Floorplan Diagnostics" data-testid="diagnostics-list">
      {violations.map((v, idx) => (
        <div
          key={`violation-${idx}`}
          className={`fp-violation-item ${v.severity === 'error' ? 'fp-violation-item--error' : 'fp-violation-item--warning'}`}
          onClick={() => onSelectViolation && onSelectViolation(v)}
          title="Click to locate on canvas"
          data-testid={`violation-item-${idx}`}
        >
          <span className="fp-violation-item__icon">
            {v.severity === 'error' ? '🚫' : '⚠️'}
          </span>
          <div className="fp-violation-item__text">
            <div className="fp-violation-item__rule">{v.rule}</div>
            <div className="fp-violation-item__detail">{v.message}</div>
            {v.suggestion && (
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '2px' }}>
                💡 Fix: {v.suggestion}
              </div>
            )}
            {v.viaFix && (
              <button
                type="button"
                className="fp-toolbar-btn fp-toolbar-btn--primary"
                style={{ marginTop: '0.4rem', fontSize: '0.72rem', padding: '3px 8px' }}
                data-testid="btn-add-missing-via"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddVia && onAddVia(v.viaFix);
                }}
              >
                ⚡ Add Missing Via
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
