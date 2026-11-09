/**
 * fsm_editor.js — Interactive Finite State Machine Visual Editor and Graph Visualizer
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

import { FSMModel, FSMPresets } from '../engine/fsm_engine.js';
import { AdvancedVerilogGenerator } from '../engine/advanced_verilog.js';

export class FSMEditor {
    constructor(container, onVerilogRequested = null) {
        this.container = container;
        this.onVerilogRequested = onVerilogRequested;

        // Current active FSM
        this.fsm = FSMPresets.trafficLight();
        this.inputVals = { timer: 0 };

        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="fsm-grid">
                <!-- Controls & Inspector Sidebar -->
                <div class="card fsm-controls-panel">
                    <h3>FSM Preset & Controls</h3>

                    <div class="form-group">
                        <label>Preset FSM:</label>
                        <select id="fsm-preset-select" class="select-input">
                            <option value="trafficLight" selected>Traffic Light Controller</option>
                            <option value="twoStateToggle">2-State Pushbutton Toggle</option>
                            <option value="sequenceDetector1011">1011 Sequence Detector</option>
                            <option value="vendingMachine">Vending Machine (20 Cents)</option>
                        </select>
                    </div>

                    <div class="fsm-status-box">
                        <div class="status-row">
                            <span>Current State:</span>
                            <span id="fsm-curr-state" class="badge badge-primary lg">${this.fsm.currentState}</span>
                        </div>
                        <div class="status-row">
                            <span>Last Transition:</span>
                            <span id="fsm-last-trans" class="mono-val sm">${this.fsm.lastTransition || 'None'}</span>
                        </div>
                    </div>

                    <!-- Dynamic Input Switches -->
                    <div class="form-group" style="margin-top: 15px;">
                        <label>FSM Inputs (Stimulus):</label>
                        <div id="fsm-inputs-container" class="fsm-inputs-list"></div>
                    </div>

                    <!-- Outputs Display -->
                    <div class="form-group">
                        <label>Current Outputs:</label>
                        <div id="fsm-outputs-container" class="fsm-outputs-list"></div>
                    </div>

                    <!-- Actions -->
                    <div class="action-buttons-col">
                        <button id="btn-fsm-step" class="btn btn-primary btn-block">Step Clock (posedge clk)</button>
                        <button id="btn-fsm-reset" class="btn btn-secondary btn-block">Reset FSM</button>
                        <button id="btn-fsm-verilog" class="btn btn-info btn-block">View Generated Verilog</button>
                    </div>

                    <div id="fsm-validation-msg" class="validation-box"></div>
                </div>

                <!-- Interactive SVG State Graph Canvas -->
                <div class="card fsm-canvas-panel">
                    <div class="canvas-header">
                        <h3>State Diagram</h3>
                        <span class="legend-note"><span class="legend-circle active"></span> Active State &nbsp;|&nbsp; <span class="legend-line active"></span> Last Transition</span>
                    </div>
                    <div class="svg-wrapper">
                        <svg id="fsm-svg" viewBox="0 0 700 450" class="fsm-svg-canvas"></svg>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.updateInputsUI();
        this.updateOutputsUI();
        this.drawStateGraph();
    }

    attachEventListeners() {
        // Preset select
        const presetSelect = this.container.querySelector('#fsm-preset-select');
        presetSelect.addEventListener('change', (e) => {
            const key = e.target.value;
            if (FSMPresets[key]) {
                this.fsm = FSMPresets[key]();
                this.inputVals = {};
                for (const inp of this.fsm.inputs) {
                    this.inputVals[inp.name] = 0;
                }
                this.updateInputsUI();
                this.updateOutputsUI();
                this.drawStateGraph();
            }
        });

        // Step clock
        const btnStep = this.container.querySelector('#btn-fsm-step');
        btnStep.addEventListener('click', () => {
            this.fsm.clockStep(this.inputVals);
            this.container.querySelector('#fsm-curr-state').textContent = this.fsm.currentState;
            this.container.querySelector('#fsm-last-trans').textContent = this.fsm.lastTransition || 'None';
            this.updateOutputsUI();
            this.drawStateGraph();
        });

        // Reset
        const btnReset = this.container.querySelector('#btn-fsm-reset');
        btnReset.addEventListener('click', () => {
            this.fsm.reset();
            this.container.querySelector('#fsm-curr-state').textContent = this.fsm.currentState;
            this.container.querySelector('#fsm-last-trans').textContent = 'RESET';
            this.updateOutputsUI();
            this.drawStateGraph();
        });

        // Verilog
        const btnVerilog = this.container.querySelector('#btn-fsm-verilog');
        btnVerilog.addEventListener('click', () => {
            const code = AdvancedVerilogGenerator.generateFSM(this.fsm, this.fsm.name);
            if (this.onVerilogRequested) {
                this.onVerilogRequested(code, this.fsm.name);
            } else {
                alert(code);
            }
        });
    }

    updateInputsUI() {
        const container = this.container.querySelector('#fsm-inputs-container');
        container.innerHTML = '';

        for (const inp of this.fsm.inputs) {
            const row = document.createElement('div');
            row.className = 'fsm-input-row';
            row.innerHTML = `
                <span class="input-name mono">${inp.name}</span>
                <label class="switch">
                    <input type="checkbox" id="inp-chk-${inp.name}" ${this.inputVals[inp.name] ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
                <span id="inp-val-${inp.name}" class="mono-val sm">${this.inputVals[inp.name] ? '1' : '0'}</span>
            `;
            const chk = row.querySelector(`#inp-chk-${inp.name}`);
            chk.addEventListener('change', (e) => {
                this.inputVals[inp.name] = e.target.checked ? 1 : 0;
                row.querySelector(`#inp-val-${inp.name}`).textContent = e.target.checked ? '1' : '0';
                // Trigger combinational output update (for Mealy machines!)
                this.updateOutputsUI();
            });
            container.appendChild(row);
        }
    }

    updateOutputsUI() {
        const container = this.container.querySelector('#fsm-outputs-container');
        const evalRes = this.fsm.evaluateOutputs(this.inputVals);
        container.innerHTML = '';

        for (const out of this.fsm.outputs) {
            const val = evalRes.activeOutputs[out.name] || 0;
            const el = document.createElement('div');
            el.className = `fsm-output-badge ${val ? 'active' : ''}`;
            el.innerHTML = `<span class="out-name">${out.name}:</span> <span class="out-val mono">${val}</span>`;
            container.appendChild(el);
        }
    }

    drawStateGraph() {
        const svg = this.container.querySelector('#fsm-svg');
        svg.innerHTML = '';

        // Add SVG definitions for arrow markers
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
        `;
        svg.appendChild(defs);

        const states = this.fsm.states;
        const total = states.length;
        const centerX = 350;
        const centerY = 220;
        const radius = Math.min(centerX - 90, centerY - 50);

        // Compute circular coordinates for each state
        const stateCoords = {};
        states.forEach((s, idx) => {
            const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
            stateCoords[s] = {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        });

        // 1. Draw Transitions (curved paths)
        for (const t of this.fsm.transitions) {
            const p1 = stateCoords[t.from];
            const p2 = stateCoords[t.to];
            if (!p1 || !p2) continue;

            const isLastTaken = this.fsm.lastTransition && (
                this.fsm.lastTransition === t.id ||
                this.fsm.lastTransition === `${t.from}->${t.to}`
            );

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            if (t.from === t.to) {
                // Self-loop
                const loopRadius = 28;
                const d = `M ${p1.x - 15} ${p1.y - 28} C ${p1.x - 35} ${p1.y - 65}, ${p1.x + 35} ${p1.y - 65}, ${p1.x + 15} ${p1.y - 28}`;
                path.setAttribute('d', d);
            } else {
                // Curved connection between distinct states
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const normX = -dy / dist;
                const normY = dx / dist;
                const curvature = 35;
                const cx = (p1.x + p2.x) / 2 + normX * curvature;
                const cy = (p1.y + p2.y) / 2 + normY * curvature;
                const d = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
                path.setAttribute('d', d);
            }

            path.setAttribute('class', `fsm-transition-edge ${isLastTaken ? 'edge-active' : ''}`);
            path.setAttribute('marker-end', isLastTaken ? 'url(#arrow-active)' : 'url(#arrow)');
            svg.appendChild(path);

            // Condition label
            if (t.condition && t.condition !== '1') {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2 - 8;
                text.setAttribute('x', midX);
                text.setAttribute('y', midY);
                text.setAttribute('class', `fsm-trans-label ${isLastTaken ? 'label-active' : ''}`);
                text.setAttribute('text-anchor', 'middle');
                text.textContent = t.condition;
                svg.appendChild(text);
            }
        }

        // 2. Draw States (Circles & Labels)
        for (const s of states) {
            const pos = stateCoords[s];
            const isCurrent = s === this.fsm.currentState;
            const isReset = s === this.fsm.resetState;

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', `fsm-state-node ${isCurrent ? 'state-active' : ''}`);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', isCurrent ? '34' : '30');
            circle.setAttribute('class', `state-circle ${isCurrent ? 'circle-active' : ''} ${isReset ? 'circle-reset' : ''}`);
            g.appendChild(circle);

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', pos.x);
            label.setAttribute('y', pos.y + 4);
            label.setAttribute('class', 'state-label');
            label.setAttribute('text-anchor', 'middle');
            label.textContent = s;
            g.appendChild(label);

            svg.appendChild(g);
        }
    }
}
