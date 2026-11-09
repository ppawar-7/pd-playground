/**
 * WaveformViewer.jsx
 * ===================
 * Reusable digital timing waveform renderer using pure SVG.
 * Visualizes clock cycles, digital signals (0/1), transitions, and buses.
 */

import React from 'react';
import './WaveformViewer.css';

export default function WaveformViewer({ signals, cycles = 6, height = 180 }) {
  const cycleWidth = 60;
  const signalHeight = 32;
  const signalGap = 16;
  const labelWidth = 80;
  const svgWidth = labelWidth + cycles * cycleWidth + 20;

  return (
    <div className="waveform-viewer">
      <div className="waveform-viewer__scroll">
        <svg
          viewBox={`0 0 ${svgWidth} ${signals.length * (signalHeight + signalGap) + 40}`}
          className="waveform-svg"
          style={{ minWidth: svgWidth }}
        >
          {/* Cycle grid markers */}
          {Array.from({ length: cycles }).map((_, c) => {
            const x = labelWidth + c * cycleWidth;
            return (
              <g key={c} className="waveform-grid-col">
                <line
                  x1={x}
                  y1={24}
                  x2={x}
                  y2={signals.length * (signalHeight + signalGap) + 20}
                  stroke="#334155"
                  strokeDasharray="3 3"
                />
                <text x={x + cycleWidth / 2} y={16} fill="#94a3b8" fontSize="11" textAnchor="middle">
                  C{c + 1}
                </text>
              </g>
            );
          })}

          {/* Render each signal */}
          {signals.map((sig, sIdx) => {
            const yBase = 32 + sIdx * (signalHeight + signalGap);
            const yHigh = yBase;
            const yLow = yBase + signalHeight;

            let pathD = '';
            for (let c = 0; c < cycles; c++) {
              const val = sig.values[c] ?? 0;
              const xStart = labelWidth + c * cycleWidth;
              const xEnd = xStart + cycleWidth;
              const currentY = val === 1 ? yHigh : yLow;

              if (c === 0) {
                pathD += `M ${xStart} ${currentY} L ${xEnd} ${currentY}`;
              } else {
                const prevVal = sig.values[c - 1] ?? 0;
                const prevY = prevVal === 1 ? yHigh : yLow;
                if (prevVal !== val) {
                  // Transition edge
                  pathD += ` L ${xStart} ${currentY} L ${xEnd} ${currentY}`;
                } else {
                  pathD += ` L ${xEnd} ${currentY}`;
                }
              }
            }

            return (
              <g key={sig.name} className="waveform-signal-row">
                {/* Signal label */}
                <text
                  x={labelWidth - 10}
                  y={yBase + signalHeight / 2 + 4}
                  fill={sig.color || '#38bdf8'}
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="end"
                >
                  {sig.name}
                </text>

                {/* Signal trace */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={sig.color || '#38bdf8'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
