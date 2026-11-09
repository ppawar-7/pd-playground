/**
 * register_visualizer.js — Multi-Bit Register, Counter & Shift Register UI Visualizer
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

import { MultiBitRegister, SequentialSimulationEngine } from '../engine/register_engine.js';
import { BinaryCounter, UniversalShiftRegister } from '../engine/counter_engine.js';
import { VectorSignal } from '../engine/vector_model.js';

export class RegisterVisualizer {
    constructor(container, onCycleRecorded = null) {
        this.container = container;
        this.onCycleRecorded = onCycleRecorded;

        // Engines
        this.reg = new MultiBitRegister({ name: 'r0', width: 4, resetValue: 0 });
        this.counter = new BinaryCounter({ width: 4, modulo: 10 });
        this.shiftReg = new UniversalShiftRegister({ width: 4 });

        // State controls
        this.regD = new VectorSignal({ width: 4, value: 5 });
        this.regEn = 1;
        this.regRst = 0;

        this.cntEn = 1;
        this.cntUp = 1;
        this.cntRst = 0;

        this.shiftMode = UniversalShiftRegister.MODE_SHR;
        this.shiftSinMsb = 1;
        this.shiftSinLsb = 0;
        this.shiftParallelD = new VectorSignal({ width: 4, value: 0b1010 });

        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="sequential-grid">
                <!-- Section 1: Multi-Bit Register -->
                <div class="card seq-card">
                    <h3>1. Multi-Bit Register (DFF Bus)</h3>
                    <div class="reg-display-box">
                        <div class="reg-q-container">
                            <span class="reg-label">Q Output:</span>
                            <span id="reg-q-val" class="mono-val lg">0x0 (0)</span>
                            <div id="reg-q-bits" class="bit-strip readonly"></div>
                        </div>

                        <div class="reg-inputs-container">
                            <div class="input-line">
                                <label>Input D:</label>
                                <div id="reg-d-bits" class="bit-strip"></div>
                                <span id="reg-d-val" class="mono-val">0x5</span>
                            </div>
                            <div class="control-line">
                                <label><input type="checkbox" id="reg-en-cb" checked> Clock Enable (EN)</label>
                                <label><input type="checkbox" id="reg-rst-cb"> Sync Reset (RST)</label>
                            </div>
                            <div class="action-line">
                                <button id="btn-reg-step" class="btn btn-primary">Step Clock (posedge clk)</button>
                                <button id="btn-reg-reset" class="btn btn-secondary">Direct Reset</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section 2: Modulo Counter -->
                <div class="card seq-card">
                    <h3>2. Modulo-N Binary Counter</h3>
                    <div class="counter-display-box">
                        <div class="counter-main-val">
                            <span class="cnt-label">Count:</span>
                            <span id="cnt-val" class="mono-val xl">0</span>
                            <div id="cnt-bits" class="bit-strip readonly"></div>
                        </div>

                        <div class="counter-flags">
                            <div class="flag-indicator" id="flag-tc">
                                <span class="flag-dot"></span>
                                <span class="flag-name">TC (Terminal Count)</span>
                            </div>
                            <div class="flag-indicator" id="flag-roll">
                                <span class="flag-dot"></span>
                                <span class="flag-name">Rollover</span>
                            </div>
                        </div>

                        <div class="counter-controls">
                            <div class="form-group inline">
                                <label>Modulo:</label>
                                <select id="cnt-mod-select" class="select-input">
                                    <option value="6">Modulo 6 (0..5)</option>
                                    <option value="10" selected>Modulo 10 Decade (0..9)</option>
                                    <option value="16">Modulo 16 Full 4-bit (0..15)</option>
                                </select>
                            </div>
                            <div class="control-line">
                                <label><input type="checkbox" id="cnt-up-cb" checked> Count Up (1=Up, 0=Down)</label>
                                <label><input type="checkbox" id="cnt-en-cb" checked> Enable</label>
                            </div>
                            <div class="action-line">
                                <button id="btn-cnt-step" class="btn btn-primary">Step Counter Clock</button>
                                <button id="btn-cnt-reset" class="btn btn-secondary">Reset to 0</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section 3: Universal Shift Register -->
                <div class="card seq-card">
                    <h3>3. Universal Shift Register (SISO / SIPO / PISO)</h3>
                    <div class="shift-display-box">
                        <div class="shift-cells" id="shift-cells-container"></div>

                        <div class="shift-controls">
                            <div class="form-group inline">
                                <label>Mode:</label>
                                <select id="shift-mode-select" class="select-input">
                                    <option value="0">0: HOLD (Retain)</option>
                                    <option value="1" selected>1: SHIFT RIGHT (Serial in MSB)</option>
                                    <option value="2">2: SHIFT LEFT (Serial in LSB)</option>
                                    <option value="3">3: PARALLEL LOAD</option>
                                </select>
                            </div>

                            <div class="shift-inputs-row">
                                <label>Serial In MSB: <input type="number" id="shift-sin-msb" min="0" max="1" value="1" class="num-input-sm"></label>
                                <label>Serial In LSB: <input type="number" id="shift-sin-lsb" min="0" max="1" value="0" class="num-input-sm"></label>
                            </div>

                            <div class="action-line">
                                <button id="btn-shift-step" class="btn btn-primary">Step Shift Clock</button>
                                <button id="btn-shift-reset" class="btn btn-secondary">Clear Register</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.updateRegisterUI();
        this.updateCounterUI();
        this.updateShiftUI();
    }

    attachEventListeners() {
        // Register events
        const btnRegStep = this.container.querySelector('#btn-reg-step');
        btnRegStep.addEventListener('click', () => {
            this.regEn = this.container.querySelector('#reg-en-cb').checked ? 1 : 0;
            this.regRst = this.container.querySelector('#reg-rst-cb').checked ? 1 : 0;
            this.reg.step({ d: this.regD, en: this.regEn, rst: this.regRst, clkEdge: true });
            this.updateRegisterUI();
            if (this.onCycleRecorded) this.onCycleRecorded({ type: 'reg', q: this.reg.q.value });
        });

        const btnRegReset = this.container.querySelector('#btn-reg-reset');
        btnRegReset.addEventListener('click', () => {
            this.reg.reset();
            this.updateRegisterUI();
        });

        // Counter events
        const btnCntStep = this.container.querySelector('#btn-cnt-step');
        btnCntStep.addEventListener('click', () => {
            this.cntEn = this.container.querySelector('#cnt-en-cb').checked ? 1 : 0;
            this.cntUp = this.container.querySelector('#cnt-up-cb').checked ? 1 : 0;
            const res = this.counter.step({ en: this.cntEn, up: this.cntUp, rst: 0 });
            this.updateCounterUI(res);
            if (this.onCycleRecorded) this.onCycleRecorded({ type: 'counter', count: this.counter.count.value });
        });

        const cntModSelect = this.container.querySelector('#cnt-mod-select');
        cntModSelect.addEventListener('change', (e) => {
            const m = parseInt(e.target.value, 10);
            this.counter = new BinaryCounter({ width: 4, modulo: m });
            this.updateCounterUI();
        });

        const btnCntReset = this.container.querySelector('#btn-cnt-reset');
        btnCntReset.addEventListener('click', () => {
            this.counter.reset();
            this.updateCounterUI();
        });

        // Shift Register events
        const btnShiftStep = this.container.querySelector('#btn-shift-step');
        btnShiftStep.addEventListener('click', () => {
            const mode = parseInt(this.container.querySelector('#shift-mode-select').value, 10);
            const sinMsb = parseInt(this.container.querySelector('#shift-sin-msb').value, 10) || 0;
            const sinLsb = parseInt(this.container.querySelector('#shift-sin-lsb').value, 10) || 0;
            this.shiftReg.step({ mode, sin_msb: sinMsb, sin_lsb: sinLsb });
            this.updateShiftUI();
            if (this.onCycleRecorded) this.onCycleRecorded({ type: 'shift', q: this.shiftReg.q.value });
        });

        const btnShiftReset = this.container.querySelector('#btn-shift-reset');
        btnShiftReset.addEventListener('click', () => {
            this.shiftReg.reset();
            this.updateShiftUI();
        });
    }

    updateRegisterUI() {
        const qVal = this.container.querySelector('#reg-q-val');
        qVal.textContent = `${this.reg.q.toHexString()} (${this.reg.q.toUnsignedDecimal()})`;

        const qBits = this.container.querySelector('#reg-q-bits');
        qBits.innerHTML = '';
        for (let i = 3; i >= 0; i--) {
            const b = this.reg.q.getBit(i);
            const el = document.createElement('div');
            el.className = `bit-cell readonly ${b ? 'active' : ''}`;
            el.innerHTML = `<span class="bit-idx">${i}</span><span class="bit-val">${b}</span>`;
            qBits.appendChild(el);
        }

        const dBits = this.container.querySelector('#reg-d-bits');
        dBits.innerHTML = '';
        for (let i = 3; i >= 0; i--) {
            const b = this.regD.getBit(i);
            const btn = document.createElement('button');
            btn.className = `bit-cell ${b ? 'active' : ''}`;
            btn.innerHTML = `<span class="bit-idx">${i}</span><span class="bit-val">${b}</span>`;
            btn.addEventListener('click', () => {
                this.regD = this.regD.withBit(i, b ? 0 : 1);
                this.updateRegisterUI();
            });
            dBits.appendChild(btn);
        }
        this.container.querySelector('#reg-d-val').textContent = `${this.regD.toHexString()}`;
    }

    updateCounterUI(stepResult = null) {
        this.container.querySelector('#cnt-val').textContent = `${this.counter.count.toUnsignedDecimal()}`;

        const cntBits = this.container.querySelector('#cnt-bits');
        cntBits.innerHTML = '';
        for (let i = 3; i >= 0; i--) {
            const b = this.counter.count.getBit(i);
            const el = document.createElement('div');
            el.className = `bit-cell readonly ${b ? 'active' : ''}`;
            el.innerHTML = `<span class="bit-idx">${i}</span><span class="bit-val">${b}</span>`;
            cntBits.appendChild(el);
        }

        const tcEl = this.container.querySelector('#flag-tc');
        if (this.counter.terminalCount) tcEl.classList.add('active');
        else tcEl.classList.remove('active');

        const rollEl = this.container.querySelector('#flag-roll');
        if (stepResult && stepResult.rollover) rollEl.classList.add('active');
        else rollEl.classList.remove('active');
    }

    updateShiftUI() {
        const container = this.container.querySelector('#shift-cells-container');
        container.innerHTML = '';

        for (let i = 3; i >= 0; i--) {
            const b = this.shiftReg.q.getBit(i);
            const card = document.createElement('div');
            card.className = `shift-stage-box ${b ? 'bit-high' : ''}`;
            card.innerHTML = `
                <div class="shift-stage-title">FF_${i}</div>
                <div class="shift-bit-val">${b}</div>
            `;
            container.appendChild(card);
        }
    }
}
