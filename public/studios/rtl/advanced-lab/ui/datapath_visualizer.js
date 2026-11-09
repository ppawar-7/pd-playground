/**
 * datapath_visualizer.js — Vector & Arithmetic Datapath UI Visualizer
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

import { VectorSignal, VectorOps } from '../engine/vector_model.js';
import { RippleCarryAdder, EducationalALU } from '../engine/arithmetic_engine.js';
import { AdvancedVerilogGenerator } from '../engine/advanced_verilog.js';

export class DatapathVisualizer {
    constructor(container) {
        this.container = container;
        this.width = 4;
        this.vecA = new VectorSignal({ width: 4, value: 5 });
        this.vecB = new VectorSignal({ width: 4, value: 3 });
        this.alu = new EducationalALU(4);
        this.rca = new RippleCarryAdder(4);
        this.currentOp = EducationalALU.OP_ADD;

        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="datapath-grid">
                <!-- Controls Panel -->
                <div class="card panel-controls">
                    <h3>Datapath Operands</h3>
                    <div class="form-group">
                        <label>Bus Width:</label>
                        <select id="dp-width-select" class="select-input">
                            <option value="4" ${this.width === 4 ? 'selected' : ''}>4-Bit</option>
                            <option value="8" ${this.width === 8 ? 'selected' : ''}>8-Bit</option>
                        </select>
                    </div>

                    <!-- Operand A -->
                    <div class="operand-box">
                        <div class="operand-header">
                            <span class="badge">Operand A</span>
                            <span id="dp-a-hex" class="mono-val">0x${this.vecA.toHexString()}</span>
                            <span id="dp-a-dec" class="mono-val">(${this.vecA.toUnsignedDecimal()})</span>
                        </div>
                        <div id="dp-a-bits" class="bit-strip"></div>
                    </div>

                    <!-- Operand B -->
                    <div class="operand-box">
                        <div class="operand-header">
                            <span class="badge">Operand B</span>
                            <span id="dp-b-hex" class="mono-val">0x${this.vecB.toHexString()}</span>
                            <span id="dp-b-dec" class="mono-val">(${this.vecB.toUnsignedDecimal()})</span>
                        </div>
                        <div id="dp-b-bits" class="bit-strip"></div>
                    </div>

                    <!-- Operation Selector -->
                    <div class="form-group" style="margin-top: 15px;">
                        <label>ALU Operation:</label>
                        <div class="op-buttons">
                            ${Object.entries(EducationalALU.OP_NAMES).map(([opCode, name]) => `
                                <button class="btn btn-sm btn-op ${Number(opCode) === this.currentOp ? 'active' : ''}" data-opcode="${opCode}">
                                    ${name}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Live Results Panel -->
                <div class="card panel-results">
                    <h3>ALU Output & Status Flags</h3>
                    <div class="result-display">
                        <div class="result-main">
                            <div class="result-label">Result:</div>
                            <div id="alu-result-val" class="result-number">--</div>
                            <div id="alu-result-bin" class="result-bin mono">0000</div>
                        </div>

                        <!-- Flags -->
                        <div class="flags-box">
                            <div class="flag-indicator" id="flag-z">
                                <span class="flag-dot"></span>
                                <span class="flag-name">Z (Zero)</span>
                            </div>
                            <div class="flag-indicator" id="flag-c">
                                <span class="flag-dot"></span>
                                <span class="flag-name">C (Carry)</span>
                            </div>
                            <div class="flag-indicator" id="flag-v">
                                <span class="flag-dot"></span>
                                <span class="flag-name">V (Overflow)</span>
                            </div>
                            <div class="flag-indicator" id="flag-n">
                                <span class="flag-dot"></span>
                                <span class="flag-name">N (Negative)</span>
                            </div>
                        </div>
                    </div>
                    <div id="flag-descriptions" class="flag-notes"></div>

                    <!-- Ripple Carry Chain Visualizer -->
                    <h3 style="margin-top: 25px;">Ripple-Carry Carry Chain Breakdown</h3>
                    <div id="rca-stages-container" class="rca-stages"></div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.updateBitStrips();
        this.evaluate();
    }

    attachEventListeners() {
        // Width select
        const widthSelect = this.container.querySelector('#dp-width-select');
        widthSelect.addEventListener('change', (e) => {
            this.width = parseInt(e.target.value, 10);
            this.vecA = new VectorSignal({ width: this.width, value: this.vecA.value });
            this.vecB = new VectorSignal({ width: this.width, value: this.vecB.value });
            this.alu = new EducationalALU(this.width);
            this.rca = new RippleCarryAdder(this.width);
            this.updateBitStrips();
            this.evaluate();
        });

        // Op buttons
        const opBtns = this.container.querySelectorAll('.btn-op');
        opBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                opBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentOp = parseInt(btn.dataset.opcode, 10);
                this.evaluate();
            });
        });
    }

    updateBitStrips() {
        const stripA = this.container.querySelector('#dp-a-bits');
        const stripB = this.container.querySelector('#dp-b-bits');

        stripA.innerHTML = '';
        stripB.innerHTML = '';

        for (let i = this.width - 1; i >= 0; i--) {
            const bitA = this.vecA.getBit(i);
            const btnA = document.createElement('button');
            btnA.className = `bit-cell ${bitA === 1 ? 'active' : ''}`;
            btnA.innerHTML = `<span class="bit-idx">${i}</span><span class="bit-val">${bitA}</span>`;
            btnA.addEventListener('click', () => {
                this.vecA = this.vecA.withBit(i, bitA === 1 ? 0 : 1);
                this.updateBitStrips();
                this.evaluate();
            });
            stripA.appendChild(btnA);

            const bitB = this.vecB.getBit(i);
            const btnB = document.createElement('button');
            btnB.className = `bit-cell ${bitB === 1 ? 'active' : ''}`;
            btnB.innerHTML = `<span class="bit-idx">${i}</span><span class="bit-val">${bitB}</span>`;
            btnB.addEventListener('click', () => {
                this.vecB = this.vecB.withBit(i, bitB === 1 ? 0 : 1);
                this.updateBitStrips();
                this.evaluate();
            });
            stripB.appendChild(btnB);
        }

        this.container.querySelector('#dp-a-hex').textContent = this.vecA.toHexString();
        this.container.querySelector('#dp-a-dec').textContent = `(${this.vecA.toUnsignedDecimal()})`;
        this.container.querySelector('#dp-b-hex').textContent = this.vecB.toHexString();
        this.container.querySelector('#dp-b-dec').textContent = `(${this.vecB.toUnsignedDecimal()})`;
    }

    evaluate() {
        // Execute ALU
        const aluOut = this.alu.execute(this.currentOp, this.vecA, this.vecB);

        this.container.querySelector('#alu-result-val').textContent = `${aluOut.result.toUnsignedDecimal()} (${aluOut.result.toHexString()})`;
        this.container.querySelector('#alu-result-bin').textContent = aluOut.result.toBinaryString();

        // Update Flags
        this._updateFlag('flag-z', aluOut.flags.Z);
        this._updateFlag('flag-c', aluOut.flags.C);
        this._updateFlag('flag-v', aluOut.flags.V);
        this._updateFlag('flag-n', aluOut.flags.N);

        // Notes
        const notes = this.container.querySelector('#flag-descriptions');
        notes.innerHTML = `
            <ul>
                <li><strong>Z:</strong> ${aluOut.flagExplanations.Z}</li>
                <li><strong>C:</strong> ${aluOut.flagExplanations.C}</li>
                <li><strong>V:</strong> ${aluOut.flagExplanations.V}</li>
                <li><strong>N:</strong> ${aluOut.flagExplanations.N}</li>
            </ul>
        `;

        // Execute RCA for carry propagation visualization
        const rcaOut = this.rca.compute(this.vecA, this.vecB, 0);
        const rcaContainer = this.container.querySelector('#rca-stages-container');
        rcaContainer.innerHTML = rcaOut.stages.slice().reverse().map(st => `
            <div class="rca-stage-card ${st.cout === 1 ? 'has-carry' : ''}">
                <div class="stage-title">FA Stage ${st.stage}</div>
                <div class="stage-io">
                    <span>A=${st.a}</span>
                    <span>B=${st.b}</span>
                    <span>Cin=${st.cin}</span>
                </div>
                <div class="stage-p-g">
                    <span class="badge ${st.g ? 'badge-warn' : ''}">G=${st.g}</span>
                    <span class="badge ${st.p ? 'badge-info' : ''}">P=${st.p}</span>
                </div>
                <div class="stage-out">
                    <span>Sum=${st.sum}</span>
                    <span class="${st.cout ? 'carry-active' : ''}">Cout=${st.cout}</span>
                </div>
                <div class="stage-desc">${st.carryReason}</div>
            </div>
        `).join('');
    }

    _updateFlag(elemId, isActive) {
        const el = this.container.querySelector(`#${elemId}`);
        if (el) {
            if (isActive) el.classList.add('active');
            else el.classList.remove('active');
        }
    }
}
