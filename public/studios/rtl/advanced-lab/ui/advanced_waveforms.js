/**
 * advanced_waveforms.js — Multi-Bit Bus and Sequential Waveform Canvas Visualizer
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

export class AdvancedWaveformViewer {
    constructor(canvas, maxCycles = 16) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.maxCycles = maxCycles;

        // Trace history buffer: array of cycle data objects
        this.history = [];
        this.autoPlayTimer = null;

        // Visual layout constants
        this.cycleWidth = 50;
        this.rowHeight = 36;
        this.labelWidth = 110;
        this.margin = 15;

        this.initDemoHistory();
        this.render();
    }

    initDemoHistory() {
        this.history = [];
        let count = 0;
        let reg = 0;
        for (let c = 0; c < 12; c++) {
            count = (c % 10);
            if (c % 2 === 0) reg = (reg + 3) & 0xF;
            this.history.push({
                cycle: c,
                clk: 1,
                rst: c === 0 ? 1 : 0,
                en: 1,
                count: count,
                tc: count === 9 ? 1 : 0,
                reg_q: reg,
                fsm_state: c < 4 ? 'RED' : (c < 8 ? 'GREEN' : 'YELLOW')
            });
        }
    }

    recordCycle(data) {
        if (this.history.length >= this.maxCycles) {
            this.history.shift();
        }
        this.history.push({
            cycle: this.history.length > 0 ? this.history[this.history.length - 1].cycle + 1 : 0,
            clk: 1,
            rst: data.rst ?? 0,
            en: data.en ?? 1,
            count: data.count ?? 0,
            tc: data.tc ?? 0,
            reg_q: data.reg_q ?? 0,
            fsm_state: data.fsm_state ?? 'IDLE',
            ...data
        });
        this.render();
    }

    clear() {
        this.history = [];
        this.render();
    }

    render() {
        const { width, height } = this.canvas;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        const signals = [
            { name: 'CLK', type: 'clk' },
            { name: 'RST', type: 'digital', key: 'rst' },
            { name: 'EN', type: 'digital', key: 'en' },
            { name: 'REG_Q[3:0]', type: 'bus', key: 'reg_q' },
            { name: 'COUNT[3:0]', type: 'bus', key: 'count' },
            { name: 'TC', type: 'digital', key: 'tc' },
            { name: 'FSM_STATE', type: 'str_bus', key: 'fsm_state' }
        ];

        let currentY = this.margin;

        // 1. Draw Time Axis / Cycle Rulers
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';

        const numCycles = Math.max(this.history.length, 12);
        for (let c = 0; c < numCycles; c++) {
            const x = this.labelWidth + c * this.cycleWidth;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            ctx.fillText(`T${c}`, x + 5, 12);
        }

        // 2. Draw Each Signal Track
        for (const sig of signals) {
            // Signal label
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px sans-serif';
            ctx.fillText(sig.name, 10, currentY + this.rowHeight / 2 + 4);

            // Signal wave
            if (sig.type === 'clk') {
                this.drawClockTrack(currentY, numCycles);
            } else if (sig.type === 'digital') {
                this.drawDigitalTrack(currentY, sig.key);
            } else if (sig.type === 'bus') {
                this.drawBusTrack(currentY, sig.key);
            } else if (sig.type === 'str_bus') {
                this.drawStringBusTrack(currentY, sig.key);
            }

            // Horizontal grid divider
            ctx.strokeStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(0, currentY + this.rowHeight);
            ctx.lineTo(width, currentY + this.rowHeight);
            ctx.stroke();

            currentY += this.rowHeight;
        }
    }

    drawClockTrack(topY, totalCycles) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        const half = this.cycleWidth / 2;
        const highY = topY + 6;
        const lowY = topY + this.rowHeight - 8;

        for (let c = 0; c < totalCycles; c++) {
            const x = this.labelWidth + c * this.cycleWidth;
            // Low to High posedge
            ctx.moveTo(x, lowY);
            ctx.lineTo(x, highY);
            ctx.lineTo(x + half, highY);
            ctx.lineTo(x + half, lowY);
            ctx.lineTo(x + this.cycleWidth, lowY);
        }
        ctx.stroke();
    }

    drawDigitalTrack(topY, key) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        const highY = topY + 6;
        const lowY = topY + this.rowHeight - 8;

        for (let i = 0; i < this.history.length; i++) {
            const val = this.history[i][key] ? 1 : 0;
            const x = this.labelWidth + i * this.cycleWidth;
            const targetY = val ? highY : lowY;

            if (i === 0) {
                ctx.moveTo(x, targetY);
            } else {
                ctx.lineTo(x, targetY);
            }
            ctx.lineTo(x + this.cycleWidth, targetY);
        }
        ctx.stroke();
    }

    drawBusTrack(topY, key) {
        const ctx = this.ctx;
        const highY = topY + 6;
        const lowY = topY + this.rowHeight - 8;
        const midY = (highY + lowY) / 2;

        ctx.font = '10px monospace';
        ctx.textAlign = 'center';

        for (let i = 0; i < this.history.length; i++) {
            const val = this.history[i][key];
            const x = this.labelWidth + i * this.cycleWidth;
            const xNext = x + this.cycleWidth;

            // Draw hexagonal crossover bus shape
            ctx.strokeStyle = '#f59e0b';
            ctx.fillStyle = '#1e1b4b';
            ctx.lineWidth = 1.2;

            ctx.beginPath();
            ctx.moveTo(x, midY);
            ctx.lineTo(x + 5, highY);
            ctx.lineTo(xNext - 5, highY);
            ctx.lineTo(xNext, midY);
            ctx.lineTo(xNext - 5, lowY);
            ctx.lineTo(x + 5, lowY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Label inside bus
            ctx.fillStyle = '#fbbf24';
            const hexText = typeof val === 'number' ? `0x${val.toString(16).toUpperCase()}` : `${val}`;
            ctx.fillText(hexText, x + this.cycleWidth / 2, midY + 3);
        }
    }

    drawStringBusTrack(topY, key) {
        const ctx = this.ctx;
        const highY = topY + 6;
        const lowY = topY + this.rowHeight - 8;
        const midY = (highY + lowY) / 2;

        ctx.font = '9px monospace';
        ctx.textAlign = 'center';

        for (let i = 0; i < this.history.length; i++) {
            const val = this.history[i][key] || 'IDLE';
            const x = this.labelWidth + i * this.cycleWidth;
            const xNext = x + this.cycleWidth;

            ctx.strokeStyle = '#a855f7';
            ctx.fillStyle = '#2e1065';
            ctx.lineWidth = 1.2;

            ctx.beginPath();
            ctx.moveTo(x, midY);
            ctx.lineTo(x + 5, highY);
            ctx.lineTo(xNext - 5, highY);
            ctx.lineTo(xNext, midY);
            ctx.lineTo(xNext - 5, lowY);
            ctx.lineTo(x + 5, lowY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#d8b4fe';
            ctx.fillText(val, x + this.cycleWidth / 2, midY + 3);
        }
    }
}
