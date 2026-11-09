/**
 * waveform_viewer.js — Digital Timing Waveform Visualizer
 * 
 * Renders signal timing diagrams (Clock, Flip-Flop D & Q, Inputs, Outputs)
 * onto an HTML5 Canvas based on actual simulation snapshots from SequentialEngine.
 * 
 * @module WaveformViewer
 */

export class WaveformViewer {
    /**
     * @param {string} containerId - Element ID for waveform tab
     * @param {import('../engine/sequential_engine.js').SequentialEngine} sequentialEngine
     * @param {import('../ui/circuit_editor.js').CircuitEditor} editor
     */
    constructor(containerId, sequentialEngine, editor) {
        this.container = document.getElementById(containerId);
        this.seq = sequentialEngine;
        this.editor = editor;

        this.autoRunTimer = null;
        this.autoRunSpeedMs = 400;

        this.renderUI();
    }

    renderUI() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="waveform-container">
                <div class="waveform-controls">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button id="wf-step-btn" class="btn btn-primary btn-sm">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5,4 15,12 5,20" />
                                <line x1="19" y1="4" x2="19" y2="20" />
                            </svg>
                            <span>Clock Step</span>
                        </button>
                        <button id="wf-autorun-btn" class="btn btn-sm">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5,3 19,12 5,21" />
                            </svg>
                            <span id="wf-autorun-text">Auto Run</span>
                        </button>
                        <button id="wf-reset-btn" class="btn btn-sm btn-danger">
                            <span>Reset Clock</span>
                        </button>
                    </div>
                    <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">
                        Clock: <span id="wf-clk-state" style="color:var(--accent-primary); font-weight:700;">0</span> | 
                        Step: <span id="wf-step-count" style="font-weight:700;">0</span>
                    </div>
                </div>
                <div class="waveform-canvas-box">
                    <canvas id="waveform-canvas"></canvas>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('waveform-canvas');
        this.ctx = this.canvas.getContext('2d');

        this._bindControls();
        this.redraw();
    }

    _bindControls() {
        const stepBtn = document.getElementById('wf-step-btn');
        if (stepBtn) {
            stepBtn.addEventListener('click', () => {
                this.stepClock();
            });
        }

        const autoRunBtn = document.getElementById('wf-autorun-btn');
        if (autoRunBtn) {
            autoRunBtn.addEventListener('click', () => {
                this.toggleAutoRun();
            });
        }

        const resetBtn = document.getElementById('wf-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.reset();
            });
        }

        window.addEventListener('resize', () => {
            this.redraw();
        });
    }

    stepClock() {
        const res = this.seq.clockStep();
        if (this.editor) {
            this.editor.updateSignals();
        }
        this._updateStatusLabels();
        this.redraw();
    }

    toggleAutoRun() {
        const textSpan = document.getElementById('wf-autorun-text');
        const btn = document.getElementById('wf-autorun-btn');

        if (this.autoRunTimer) {
            // Stop
            clearInterval(this.autoRunTimer);
            this.autoRunTimer = null;
            if (textSpan) textSpan.textContent = 'Auto Run';
            if (btn) btn.classList.remove('btn-success');
        } else {
            // Start
            this.autoRunTimer = setInterval(() => {
                this.stepClock();
            }, this.autoRunSpeedMs);
            if (textSpan) textSpan.textContent = 'Pause';
            if (btn) btn.classList.add('btn-success');
        }
    }

    reset() {
        if (this.autoRunTimer) {
            this.toggleAutoRun();
        }
        this.seq.reset();
        if (this.editor) {
            this.editor.updateSignals();
        }
        this._updateStatusLabels();
        this.redraw();
    }

    _updateStatusLabels() {
        const clkSpan = document.getElementById('wf-clk-state');
        const stepSpan = document.getElementById('wf-step-count');
        if (clkSpan) clkSpan.textContent = this.seq.clockState;
        if (stepSpan) stepSpan.textContent = this.seq.stepCount;
    }

    redraw() {
        if (!this.canvas || !this.ctx) return;

        // Resize canvas to parent box (with safe fallback if tab is hidden)
        const parent = this.canvas.parentElement;
        const rect = parent ? parent.getBoundingClientRect() : { width: 600, height: 180 };
        const safeWidth = rect.width > 50 ? rect.width : (parent?.clientWidth > 50 ? parent.clientWidth : 700);
        const safeHeight = rect.height > 50 ? rect.height : (parent?.clientHeight > 50 ? parent.clientHeight : 180);
        this.canvas.width = safeWidth;
        this.canvas.height = Math.max(160, safeHeight);

        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        // Clear canvas background
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);

        const history = this.seq.getWaveformHistory();
        const labelWidth = 90;
        const timeAreaWidth = width - labelWidth - 20;

        // Determine list of signals to display
        // Priority: CLK, DFFs (D, Q), Inputs, Outputs
        const signalChannels = [];
        signalChannels.push({ id: 'CLK', label: 'CLK', type: 'CLOCK', color: '#38bdf8' });

        for (const dff of this.seq.graph.getDFFComponents()) {
            signalChannels.push({
                id: `${dff.id}_D`,
                label: `${dff.label} (D)`,
                compId: dff.id,
                role: 'D',
                color: '#f59e0b'
            });
            signalChannels.push({
                id: `${dff.id}_Q`,
                label: `${dff.label} (Q)`,
                compId: dff.id,
                role: 'Q',
                color: '#22c55e'
            });
        }

        for (const inp of this.seq.graph.getInputComponents()) {
            signalChannels.push({
                id: inp.id,
                label: inp.label,
                compId: inp.id,
                role: 'INPUT',
                color: '#94a3b8'
            });
        }

        for (const out of this.seq.graph.getOutputComponents()) {
            signalChannels.push({
                id: out.id,
                label: out.label,
                compId: out.id,
                role: 'OUTPUT',
                color: '#818cf8'
            });
        }

        const channelHeight = Math.max(28, Math.floor((height - 24) / Math.max(1, signalChannels.length)));
        const highOffset = 6;
        const lowOffset = channelHeight - 8;

        // If no history yet, draw placeholder grid
        const maxSteps = Math.max(16, history.length);
        const stepWidth = Math.max(20, Math.floor(timeAreaWidth / maxSteps));

        // Draw vertical grid lines and step numbers
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.font = '10px monospace';
        ctx.fillStyle = '#64748b';

        for (let i = 0; i <= maxSteps; i++) {
            const x = labelWidth + i * stepWidth;
            if (x > width - 10) break;
            ctx.beginPath();
            ctx.moveTo(x, 18);
            ctx.lineTo(x, height);
            ctx.stroke();

            // Step number on top
            if (i % 2 === 0) {
                ctx.fillText(`T${i}`, x + 2, 12);
            }
        }

        // Draw channels
        signalChannels.forEach((ch, idx) => {
            const yTop = 20 + idx * channelHeight;

            // Channel label on left
            ctx.fillStyle = ch.color;
            ctx.font = '11px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(ch.label, 8, yTop + channelHeight / 2 + 4);

            // Channel baseline
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath();
            ctx.moveTo(0, yTop + channelHeight);
            ctx.lineTo(width, yTop + channelHeight);
            ctx.stroke();

            if (history.length === 0) return;

            // Draw signal waveform
            ctx.strokeStyle = ch.color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            let prevX = labelWidth;
            let prevY = null;

            for (let stepIdx = 0; stepIdx < history.length; stepIdx++) {
                const snap = history[stepIdx];
                let val = null;

                if (ch.type === 'CLOCK') {
                    val = snap.clock;
                } else if (ch.role === 'D') {
                    val = snap.signals[ch.compId]?.D ?? null;
                } else if (ch.role === 'Q') {
                    val = snap.signals[ch.compId]?.Q ?? null;
                } else if (ch.role === 'INPUT' || ch.role === 'OUTPUT') {
                    val = snap.signals[ch.compId]?.value ?? null;
                }

                const currentY = val === 1 ? (yTop + highOffset) : (val === 0 ? (yTop + lowOffset) : (yTop + channelHeight / 2));
                const currentX = labelWidth + stepIdx * stepWidth;

                if (prevY === null) {
                    ctx.moveTo(currentX, currentY);
                } else {
                    // Vertical transition
                    ctx.lineTo(currentX, prevY);
                    ctx.lineTo(currentX, currentY);
                }

                // Horizontal hold
                const nextX = labelWidth + (stepIdx + 1) * stepWidth;
                ctx.lineTo(nextX, currentY);

                prevX = nextX;
                prevY = currentY;
            }

            ctx.stroke();
        });
    }
}
