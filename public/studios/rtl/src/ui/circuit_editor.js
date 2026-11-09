/**
 * circuit_editor.js — Interactive SVG Digital Circuit Workspace
 * 
 * Provides interactive circuit construction:
 * - IEEE/ANSI standard logic gate rendering
 * - Component placement and drag/repositioning
 * - Pin detection and curved wire routing
 * - Click-to-toggle for digital inputs
 * - Real-time signal color visualization (1=green, 0=gray, null=red)
 * - Component and wire selection and deletion
 * 
 * @module CircuitEditor
 */

import { COMPONENT_TYPES } from '../engine/circuit_graph.js';
import { soundManager } from './sound_effects.js';

/**
 * XML/HTML entity escaping helper for safe SVG text interpolation.
 * @param {*} str
 * @returns {string}
 */
function escapeXml(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str.replace(/[&<>"']/g, char => {
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return char;
        }
    });
}


export class CircuitEditor {
    /**
     * @param {string} svgId - ID of SVG element
     * @param {import('../engine/circuit_graph.js').CircuitGraph} graph
     * @param {import('../engine/logic_simulator.js').LogicSimulator} simulator
     */
    constructor(svgId, graph, simulator) {
        this.svg = document.getElementById(svgId);
        this.graph = graph;
        this.simulator = simulator;

        // Interaction state
        this.selectedComponentId = null;
        this.selectedWireId = null;
        this.isDraggingComponent = false;
        this.draggedComponentId = null;
        this.dragOffset = { x: 0, y: 0 };

        // Wire creation state
        this.isCreatingWire = false;
        this.wireStartPin = null; // { componentId, pinId, x, y }
        this.pendingWirePath = null;

        // Creation mode (when palette item is selected)
        this.pendingComponentType = null;

        // Callbacks
        this.onSelectionChanged = null;

        this._setupDOM();
        this._bindEvents();
    }

    _setupDOM() {
        this.svg.innerHTML = `
            <defs>
                <filter id="glow-high" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            <g id="grid-layer"></g>
            <g id="wires-layer"></g>
            <g id="pending-wire-layer"></g>
            <g id="components-layer"></g>
        `;

        this.wiresLayer = this.svg.querySelector('#wires-layer');
        this.pendingWireLayer = this.svg.querySelector('#pending-wire-layer');
        this.componentsLayer = this.svg.querySelector('#components-layer');
    }

    _bindEvents() {
        this.svg.addEventListener('mousedown', (e) => this._onMouseDown(e));
        window.addEventListener('mousemove', (e) => this._onMouseMove(e));
        window.addEventListener('mouseup', (e) => this._onMouseUp(e));
        window.addEventListener('keydown', (e) => this._onKeyDown(e));

        // Graph change subscriptions
        this.graph.on('change', () => {
            this.render();
        });
    }

    setPendingComponentType(type) {
        this.pendingComponentType = type;
        this.svg.style.cursor = type ? 'copy' : 'crosshair';
    }

    // ─── Coordinate Conversion ──────────────────────────────────────────────

    getSvgCoordinates(evt) {
        const pt = this.svg.createSVGPoint();
        pt.x = evt.clientX;
        pt.y = evt.clientY;
        const cursorPt = pt.matrixTransform(this.svg.getScreenCTM().inverse());
        return {
            x: Math.round(cursorPt.x),
            y: Math.round(cursorPt.y)
        };
    }

    // ─── Rendering ──────────────────────────────────────────────────────────

    render() {
        this.renderWires();
        this.renderComponents();
        this.updateSignals();
    }

    renderComponents() {
        this.componentsLayer.innerHTML = '';
        for (const comp of this.graph.components.values()) {
            const group = this._createComponentSvg(comp);
            this.componentsLayer.appendChild(group);
        }
    }

    renderWires() {
        this.wiresLayer.innerHTML = '';
        for (const conn of this.graph.connections.values()) {
            const path = this._createWireSvg(conn);
            if (path) this.wiresLayer.appendChild(path);
        }
    }

    updateSignals() {
        // Update wires
        for (const conn of this.graph.connections.values()) {
            const path = document.getElementById(`wire-${conn.id}`);
            if (path) {
                const val = this.graph.getPinValue({ componentId: conn.fromComponent, pinId: conn.fromPin });
                path.classList.remove('wire-high', 'wire-low', 'wire-null');
                if (val === 1) path.classList.add('wire-high');
                else if (val === 0) path.classList.add('wire-low');
                else path.classList.add('wire-null');
            }
        }

        // Update pins and I/O display text
        for (const comp of this.graph.components.values()) {
            // Update input pins
            for (const pin of comp.inputs) {
                const pinCircle = document.getElementById(`pin-${pin.id}`);
                if (pinCircle) {
                    const val = pin.connectedTo ? this.graph.getPinValue(pin.connectedTo) : null;
                    pinCircle.classList.remove('pin-high', 'pin-low', 'pin-null');
                    if (val === 1) pinCircle.classList.add('pin-high');
                    else if (val === 0) pinCircle.classList.add('pin-low');
                    else pinCircle.classList.add('pin-null');
                }
            }

            // Update output pins
            for (const pin of comp.outputs) {
                const pinCircle = document.getElementById(`pin-${pin.id}`);
                if (pinCircle) {
                    const val = pin.value;
                    pinCircle.classList.remove('pin-high', 'pin-low', 'pin-null');
                    if (val === 1) pinCircle.classList.add('pin-high');
                    else if (val === 0) pinCircle.classList.add('pin-low');
                    else pinCircle.classList.add('pin-null');
                }
            }

            // Update Input text value
            if (comp.type === 'INPUT') {
                const valText = document.getElementById(`io-text-${comp.id}`);
                if (valText) {
                    const val = comp.outputs[0].value;
                    valText.textContent = val !== null ? val : '?';
                    valText.setAttribute('class', `io-value-text val-${val !== null ? val : 'null'}`);
                }
            }

            // Update Output text value
            if (comp.type === 'OUTPUT') {
                const valText = document.getElementById(`io-text-${comp.id}`);
                if (valText) {
                    const inPin = comp.inputs[0];
                    const val = inPin.connectedTo ? this.graph.getPinValue(inPin.connectedTo) : null;
                    valText.textContent = val !== null ? val : '?';
                    valText.setAttribute('class', `io-value-text val-${val !== null ? val : 'null'}`);
                }
            }

            // Update Clock text/status
            if (comp.type === 'CLOCK') {
                const valText = document.getElementById(`io-text-${comp.id}`);
                if (valText) {
                    const val = comp.outputs[0].value;
                    valText.textContent = val !== null ? val : '0';
                    valText.setAttribute('class', `io-value-text val-${val !== null ? val : '0'}`);
                }
            }
        }
    }

    // ─── SVG Element Builders ───────────────────────────────────────────────

    _createComponentSvg(comp) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', `gate-group ${this.selectedComponentId === comp.id ? 'selected' : ''}`);
        g.setAttribute('id', `comp-${comp.id}`);
        g.setAttribute('transform', `translate(${comp.x}, ${comp.y})`);
        g.setAttribute('data-id', comp.id);

        let shapeSvg = '';
        const width = 70;
        const height = 50;

        switch (comp.type) {
            case 'INPUT':
                shapeSvg = `
                    <rect class="io-input-rect" x="0" y="0" width="54" height="40" rx="4" />
                    <text id="io-text-${comp.id}" class="io-value-text val-${comp.outputs[0].value !== null ? comp.outputs[0].value : 'null'}" x="22" y="21">
                        ${comp.outputs[0].value !== null ? comp.outputs[0].value : '0'}
                    </text>
                    <text class="gate-label" x="22" y="34" font-size="8">${escapeXml(comp.label)}</text>
                `;
                break;

            case 'OUTPUT':
                const inVal = comp.inputs[0].connectedTo ? this.graph.getPinValue(comp.inputs[0].connectedTo) : null;
                shapeSvg = `
                    <circle class="gate-body" cx="24" cy="24" r="20" />
                    <text id="io-text-${comp.id}" class="io-value-text val-${inVal !== null ? inVal : 'null'}" x="24" y="24">
                        ${inVal !== null ? inVal : '?'}
                    </text>
                    <text class="gate-label" x="24" y="48" font-size="9">${escapeXml(comp.label)}</text>
                `;
                break;

            case 'CLOCK':
                shapeSvg = `
                    <rect class="io-input-rect" x="0" y="0" width="54" height="40" rx="4" />
                    <path class="clock-symbol" d="M 10 26 L 16 26 L 16 14 L 24 14 L 24 26 L 30 26" />
                    <text id="io-text-${comp.id}" class="io-value-text val-${comp.outputs[0].value !== null ? comp.outputs[0].value : '0'}" x="38" y="20">
                        ${comp.outputs[0].value !== null ? comp.outputs[0].value : '0'}
                    </text>
                    <text class="gate-label" x="27" y="34" font-size="8">CLK</text>
                `;
                break;

            case 'AND':
                shapeSvg = `
                    <path class="gate-body" d="M 10 5 L 35 5 A 20 20 0 0 1 35 45 L 10 45 Z" />
                    <text class="gate-label" x="26" y="25">AND</text>
                `;
                break;

            case 'NAND':
                shapeSvg = `
                    <path class="gate-body" d="M 10 5 L 35 5 A 20 20 0 0 1 35 45 L 10 45 Z" />
                    <circle class="gate-body" cx="58" cy="25" r="3.5" />
                    <text class="gate-label" x="25" y="25">NAND</text>
                `;
                break;

            case 'OR':
                shapeSvg = `
                    <path class="gate-body" d="M 10 5 Q 22 25 10 45 Q 35 45 55 25 Q 35 5 10 5 Z" />
                    <text class="gate-label" x="28" y="25">OR</text>
                `;
                break;

            case 'NOR':
                shapeSvg = `
                    <path class="gate-body" d="M 10 5 Q 22 25 10 45 Q 35 45 55 25 Q 35 5 10 5 Z" />
                    <circle class="gate-body" cx="59" cy="25" r="3.5" />
                    <text class="gate-label" x="27" y="25">NOR</text>
                `;
                break;

            case 'XOR':
                shapeSvg = `
                    <path class="gate-body" d="M 5 5 Q 17 25 5 45" fill="none" stroke="#475569" stroke-width="2" />
                    <path class="gate-body" d="M 10 5 Q 22 25 10 45 Q 35 45 55 25 Q 35 5 10 5 Z" />
                    <text class="gate-label" x="28" y="25">XOR</text>
                `;
                break;

            case 'XNOR':
                shapeSvg = `
                    <path class="gate-body" d="M 5 5 Q 17 25 5 45" fill="none" stroke="#475569" stroke-width="2" />
                    <path class="gate-body" d="M 10 5 Q 22 25 10 45 Q 35 45 55 25 Q 35 5 10 5 Z" />
                    <circle class="gate-body" cx="59" cy="25" r="3.5" />
                    <text class="gate-label" x="27" y="25">XNOR</text>
                `;
                break;

            case 'NOT':
                shapeSvg = `
                    <polygon class="gate-body" points="10,8 48,25 10,42" />
                    <circle class="gate-body" cx="53" cy="25" r="3.5" />
                    <text class="gate-label" x="25" y="25">NOT</text>
                `;
                break;

            case 'MUX2':
                shapeSvg = `
                    <polygon class="gate-body" points="10,5 50,15 50,45 10,55" />
                    <text class="gate-label" x="30" y="30">MUX</text>
                    <text class="pin-label-text" x="14" y="16">0</text>
                    <text class="pin-label-text" x="14" y="46">1</text>
                `;
                break;

            case 'DFF':
                shapeSvg = `
                    <rect class="gate-body" x="10" y="5" width="50" height="60" rx="3" />
                    <polyline points="10,44 18,50 10,56" fill="none" stroke="#94a3b8" stroke-width="1.5" />
                    <text class="gate-label" x="35" y="22">DFF</text>
                    <text class="pin-label-text" x="16" y="24">D</text>
                    <text class="pin-label-text" x="50" y="24">Q</text>
                `;
                break;

            case 'DFFE':
                shapeSvg = `
                    <rect class="gate-body" x="10" y="5" width="52" height="66" rx="3" />
                    <polyline points="10,50 18,55 10,60" fill="none" stroke="#94a3b8" stroke-width="1.5" />
                    <text class="gate-label" x="36" y="20" font-size="9">DFFE</text>
                    <text class="pin-label-text" x="16" y="22">D</text>
                    <text class="pin-label-text" x="16" y="38">EN</text>
                    <text class="pin-label-text" x="52" y="22">Q</text>
                `;
                break;

            case 'DFFSR':
                shapeSvg = `
                    <rect class="gate-body" x="10" y="5" width="54" height="66" rx="3" />
                    <polyline points="10,50 18,55 10,60" fill="none" stroke="#94a3b8" stroke-width="1.5" />
                    <text class="gate-label" x="37" y="20" font-size="8">DFF-SR</text>
                    <text class="pin-label-text" x="16" y="22">D</text>
                    <text class="pin-label-text" x="16" y="38">RST</text>
                    <text class="pin-label-text" x="54" y="22">Q</text>
                `;
                break;

            case 'DFFESR':
                shapeSvg = `
                    <rect class="gate-body" x="10" y="5" width="56" height="78" rx="3" />
                    <polyline points="10,62 18,67 10,72" fill="none" stroke="#94a3b8" stroke-width="1.5" />
                    <text class="gate-label" x="38" y="18" font-size="7.5">DFF-ESR</text>
                    <text class="pin-label-text" x="16" y="20">D</text>
                    <text class="pin-label-text" x="16" y="36">EN</text>
                    <text class="pin-label-text" x="16" y="52">RST</text>
                    <text class="pin-label-text" x="56" y="20">Q</text>
                `;
                break;

            default:
                shapeSvg = `
                    <rect class="gate-body" x="0" y="0" width="${width}" height="${height}" rx="4" />
                    <text class="gate-label" x="${width/2}" y="${height/2}">${comp.type}</text>
                `;
        }

        g.innerHTML = shapeSvg;

        // Render pins
        this._renderPinsForComponent(comp, g);

        return g;
    }

    _renderPinsForComponent(comp, group) {
        // Render input pins
        comp.inputs.forEach((pin, idx) => {
            const pos = this.getPinLocalOffset(comp, pin, 'input', idx);
            const pinG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            pinG.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

            // Lead line
            const lead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lead.setAttribute('x1', '0');
            lead.setAttribute('y1', '0');
            lead.setAttribute('x2', pos.leadX || '0');
            lead.setAttribute('y2', '0');
            lead.setAttribute('stroke', '#475569');
            lead.setAttribute('stroke-width', '1.5');
            pinG.appendChild(lead);

            // Circle terminal
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'circuit-pin input-pin pin-null');
            circle.setAttribute('id', `pin-${pin.id}`);
            circle.setAttribute('cx', '0');
            circle.setAttribute('cy', '0');
            circle.setAttribute('r', '4');
            circle.setAttribute('data-comp-id', comp.id);
            circle.setAttribute('data-pin-id', pin.id);
            circle.setAttribute('data-kind', 'input');

            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${comp.label || comp.type} [In ${idx}]: Click or drag to connect wire`;
            circle.appendChild(title);

            pinG.appendChild(circle);
            group.appendChild(pinG);
        });

        // Render output pins
        comp.outputs.forEach((pin, idx) => {
            const pos = this.getPinLocalOffset(comp, pin, 'output', idx);
            const pinG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            pinG.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);

            // Lead line
            const lead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lead.setAttribute('x1', '0');
            lead.setAttribute('y1', '0');
            lead.setAttribute('x2', pos.leadX || '0');
            lead.setAttribute('y2', '0');
            lead.setAttribute('stroke', '#475569');
            lead.setAttribute('stroke-width', '1.5');
            pinG.appendChild(lead);

            // Circle terminal
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'circuit-pin output-pin pin-null');
            circle.setAttribute('id', `pin-${pin.id}`);
            circle.setAttribute('cx', '0');
            circle.setAttribute('cy', '0');
            circle.setAttribute('r', '4');
            circle.setAttribute('data-comp-id', comp.id);
            circle.setAttribute('data-pin-id', pin.id);
            circle.setAttribute('data-kind', 'output');

            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${comp.label || comp.type} [Out ${idx}]: Click or drag to connect wire`;
            circle.appendChild(title);

            pinG.appendChild(circle);
            group.appendChild(pinG);
        });
    }

    getPinLocalOffset(comp, pin, kind, index) {
        if (kind === 'input') {
            if (comp.type === 'OUTPUT') {
                return { x: 4, y: 24, leadX: 0 };
            }
            if (comp.type === 'NOT') {
                return { x: 2, y: 25, leadX: 8 };
            }
            if (comp.type === 'MUX2') {
                if (index === 0) return { x: 2, y: 15, leadX: 8 }; // In0 / A
                if (index === 1) return { x: 2, y: 45, leadX: 8 }; // In1 / B
                return { x: 30, y: 55, leadX: 0 };                 // Sel (bottom)
            }
            if (comp.type === 'DFF') {
                if (index === 0) return { x: 2, y: 20, leadX: 8 }; // D
                return { x: 2, y: 50, leadX: 8 };                  // CLK
            }
            if (comp.type === 'DFFE') {
                if (index === 0) return { x: 2, y: 18, leadX: 8 }; // D
                if (index === 1) return { x: 2, y: 55, leadX: 8 }; // CLK
                return { x: 2, y: 35, leadX: 8 };                  // EN
            }
            if (comp.type === 'DFFSR') {
                if (index === 0) return { x: 2, y: 18, leadX: 8 }; // D
                if (index === 1) return { x: 2, y: 55, leadX: 8 }; // CLK
                return { x: 2, y: 35, leadX: 8 };                  // RST
            }
            if (comp.type === 'DFFESR') {
                if (index === 0) return { x: 2, y: 18, leadX: 8 }; // D
                if (index === 1) return { x: 2, y: 67, leadX: 8 }; // CLK
                if (index === 2) return { x: 2, y: 34, leadX: 8 }; // EN
                return { x: 2, y: 50, leadX: 8 };                  // RST
            }
            // Standard 2-input gate
            if (comp.inputs.length === 2) {
                return { x: 2, y: index === 0 ? 15 : 35, leadX: 8 };
            }
            return { x: 2, y: 25, leadX: 8 };
        } else {
            // Outputs
            if (comp.type === 'INPUT' || comp.type === 'CLOCK') {
                return { x: 54, y: 20, leadX: -4 };
            }
            if (comp.type === 'NOT') {
                return { x: 62, y: 25, leadX: -5 };
            }
            if (comp.type === 'NAND' || comp.type === 'NOR' || comp.type === 'XNOR') {
                return { x: 68, y: 25, leadX: -5 };
            }
            if (comp.type === 'AND' || comp.type === 'OR' || comp.type === 'XOR') {
                return { x: 62, y: 25, leadX: -7 };
            }
            if (comp.type === 'MUX2') {
                return { x: 58, y: 30, leadX: -8 };
            }
            if (comp.type === 'DFF') {
                return { x: 68, y: 20, leadX: -8 };
            }
            if (comp.type === 'DFFE') {
                return { x: 70, y: 18, leadX: -8 };
            }
            if (comp.type === 'DFFSR') {
                return { x: 72, y: 18, leadX: -8 };
            }
            if (comp.type === 'DFFESR') {
                return { x: 74, y: 18, leadX: -8 };
            }
            return { x: 62, y: 25, leadX: -5 };
        }
    }

    getPinAbsoluteCoords(componentId, pinId) {
        const comp = this.graph.getComponent(componentId);
        if (!comp) return { x: 0, y: 0 };

        const inIdx = comp.inputs.findIndex(p => p.id === pinId);
        if (inIdx !== -1) {
            const offset = this.getPinLocalOffset(comp, comp.inputs[inIdx], 'input', inIdx);
            return { x: comp.x + offset.x, y: comp.y + offset.y };
        }

        const outIdx = comp.outputs.findIndex(p => p.id === pinId);
        if (outIdx !== -1) {
            const offset = this.getPinLocalOffset(comp, comp.outputs[outIdx], 'output', outIdx);
            return { x: comp.x + offset.x, y: comp.y + offset.y };
        }

        return { x: comp.x, y: comp.y };
    }

    _createWireSvg(conn) {
        const start = this.getPinAbsoluteCoords(conn.fromComponent, conn.fromPin);
        const end = this.getPinAbsoluteCoords(conn.toComponent, conn.toPin);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('id', `wire-${conn.id}`);
        path.setAttribute('data-id', conn.id);
        path.setAttribute('class', `circuit-wire ${this.selectedWireId === conn.id ? 'selected' : ''}`);

        const d = this._calculateWirePath(start, end);
        path.setAttribute('d', d);

        return path;
    }

    _calculateWirePath(start, end, startKind = 'output') {
        const dx = Math.abs(end.x - start.x);
        const curveOffset = Math.max(30, dx * 0.45);
        if (startKind === 'input') {
            return `M ${start.x} ${start.y} C ${start.x - curveOffset} ${start.y}, ${end.x + curveOffset} ${end.y}, ${end.x} ${end.y}`;
        }
        return `M ${start.x} ${start.y} C ${start.x + curveOffset} ${start.y}, ${end.x - curveOffset} ${end.y}, ${end.x} ${end.y}`;
    }

    // ─── Mouse & Keyboard Event Handlers ────────────────────────────────────

    _onMouseDown(e) {
        const coords = this.getSvgCoordinates(e);

        // 1. If we are in "place component" mode from palette
        if (this.pendingComponentType) {
            const r = this.graph.addComponent(this.pendingComponentType, coords.x - 30, coords.y - 20);
            if (r.ok) {
                this.simulator.evaluate();
                this.render();
            }
            this.setPendingComponentType(null);
            return;
        }

        // 2. Check pin click (Bidirectional: supports dragging from Output OR Input!)
        const pinElem = e.target.closest('.circuit-pin');
        if (pinElem) {
            const compId = pinElem.getAttribute('data-comp-id');
            const pinId = pinElem.getAttribute('data-pin-id');
            const kind = pinElem.getAttribute('data-kind');

            if (!this.isCreatingWire) {
                // Start creating wire from either output or input pin
                const pinCoords = this.getPinAbsoluteCoords(compId, pinId);
                this.isCreatingWire = true;
                this.wireDragStarted = false;
                this.wireStartCoords = coords;
                this.wireStartPin = { componentId: compId, pinId, kind, x: pinCoords.x, y: pinCoords.y };
                this._createPendingWire(pinCoords.x, pinCoords.y);
                this._highlightConnectablePins(kind);
                return;
            } else {
                // Already creating wire: click on opposite pin completes it
                if (kind !== this.wireStartPin.kind) {
                    this._completeWire(compId, pinId, kind);
                } else {
                    this._showFlashMessage(`Cannot connect ${kind} to another ${kind} pin`, 'error');
                    this._cancelPendingWire();
                }
                return;
            }
        }

        // 3. Check Input Component value toggle click
        const ioInput = e.target.closest('.io-input-rect');
        if (ioInput) {
            const compGroup = e.target.closest('.gate-group');
            if (compGroup) {
                const compId = compGroup.getAttribute('data-id');
                const comp = this.graph.getComponent(compId);
                if (comp && comp.type === 'INPUT') {
                    const currentVal = comp.outputs[0].value;
                    const nextVal = currentVal === 1 ? 0 : 1;
                    this.graph.setInputValue(compId, nextVal);
                    this.simulator.evaluate();
                    this.updateSignals();
                    try { soundManager.playSwitchClick(); } catch {}
                    return;
                }
            }
        }

        // 4. Check Wire click
        const wireElem = e.target.closest('.circuit-wire');
        if (wireElem) {
            const wireId = wireElem.getAttribute('data-id');
            this._selectWire(wireId);
            return;
        }

        // 5. Check Gate Body click for dragging & selection
        const compGroup = e.target.closest('.gate-group');
        if (compGroup) {
            const compId = compGroup.getAttribute('data-id');
            const comp = this.graph.getComponent(compId);
            if (comp) {
                this._selectComponent(compId);
                this.isDraggingComponent = true;
                this.draggedComponentId = compId;
                this.dragOffset = {
                    x: coords.x - comp.x,
                    y: coords.y - comp.y
                };
                return;
            }
        }

        // 6. Click on empty space: clear selection & cancel pending wire
        this._selectComponent(null);
        this._selectWire(null);
        if (this.isCreatingWire) {
            this._cancelPendingWire();
        }
    }

    _onMouseMove(e) {
        const coords = this.getSvgCoordinates(e);

        // Update dragging component
        if (this.isDraggingComponent && this.draggedComponentId) {
            const newX = Math.max(10, coords.x - this.dragOffset.x);
            const newY = Math.max(10, coords.y - this.dragOffset.y);
            this.graph.moveComponent(this.draggedComponentId, newX, newY);

            // Fast DOM update without full re-render
            const group = document.getElementById(`comp-${this.draggedComponentId}`);
            if (group) {
                group.setAttribute('transform', `translate(${newX}, ${newY})`);
            }
            // Update connected wires
            this.renderWires();
            this.updateSignals();
            return;
        }

        // Update pending wire
        if (this.isCreatingWire && this.pendingWirePath) {
            const start = { x: this.wireStartPin.x, y: this.wireStartPin.y };
            const end = coords;
            if (this.wireStartCoords) {
                const dist = Math.hypot(coords.x - this.wireStartCoords.x, coords.y - this.wireStartCoords.y);
                if (dist > 6) {
                    this.wireDragStarted = true;
                }
            }
            const d = this._calculateWirePath(start, end, this.wireStartPin.kind);
            this.pendingWirePath.setAttribute('d', d);
        }

        // Contextual plain-English hover guidance
        const statusBar = document.getElementById('canvas-status-text');
        if (statusBar) {
            if (this.isCreatingWire) {
                statusBar.textContent = `⚡ Connecting wire from ${this.wireStartPin.kind} pin — Release or click on an opposite pin`;
                statusBar.style.color = '#38bdf8';
            } else {
                const pinEl = e.target.closest('.circuit-pin');
                const ioEl = e.target.closest('.io-input-rect');
                const wireEl = e.target.closest('.circuit-wire');
                const gateEl = e.target.closest('.gate-group');

                if (pinEl) {
                    const cId = pinEl.getAttribute('data-comp-id');
                    const k = pinEl.getAttribute('data-kind');
                    const comp = this.graph.getComponent(cId);
                    const name = comp ? (comp.label || comp.type) : 'Component';
                    statusBar.textContent = `📍 ${k === 'output' ? 'Output' : 'Input'} Pin of ${name} — Click & drag wire to connect`;
                    statusBar.style.color = '#38bdf8';
                } else if (ioEl) {
                    statusBar.textContent = '🎛️ Input Switch — Click directly to toggle between 0 (0V) and 1 (3.3V)';
                    statusBar.style.color = '#4ade80';
                } else if (wireEl) {
                    const wId = wireEl.getAttribute('data-id');
                    const conn = this.graph.connections.get(wId);
                    if (conn) {
                        const val = this.graph.getPinValue({ componentId: conn.fromComponent, pinId: conn.fromPin });
                        statusBar.textContent = `⚡ Wire: ${conn.fromComponent} → ${conn.toComponent} | Voltage: ${val === 1 ? '3.3V HIGH (1)' : '0V LOW (0)'}`;
                        statusBar.style.color = val === 1 ? '#4ade80' : '#94a3b8';
                    }
                } else if (gateEl) {
                    const gId = gateEl.getAttribute('data-id');
                    const comp = this.graph.getComponent(gId);
                    if (comp) {
                        statusBar.textContent = `📦 ${comp.label || comp.type} — Click to inspect in right panel, drag to reposition`;
                        statusBar.style.color = 'var(--text-main)';
                    }
                } else {
                    statusBar.textContent = 'Ready — Drag gates onto canvas & connect pins';
                    statusBar.style.color = 'var(--text-muted)';
                }
            }
        }
    }

    _onMouseUp(e) {
        if (this.isDraggingComponent) {
            this.isDraggingComponent = false;
            this.draggedComponentId = null;
        }

        if (this.isCreatingWire) {
            const pinElem = e.target.closest('.circuit-pin');
            if (pinElem) {
                const compId = pinElem.getAttribute('data-comp-id');
                const pinId = pinElem.getAttribute('data-pin-id');
                const kind = pinElem.getAttribute('data-kind');
                if (kind !== this.wireStartPin.kind) {
                    this._completeWire(compId, pinId, kind);
                    return;
                }
            } else if (this.wireDragStarted) {
                // If the user dragged and released in empty space, cancel
                this._cancelPendingWire();
            }
        }
    }

    _onKeyDown(e) {
        // Delete key removes selected component or wire
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.selectedComponentId) {
                this.graph.removeComponent(this.selectedComponentId);
                this.simulator.evaluate();
                this._selectComponent(null);
                this.render();
            } else if (this.selectedWireId) {
                this.graph.removeConnection(this.selectedWireId);
                this.simulator.evaluate();
                this._selectWire(null);
                this.render();
            }
        }
    }

    // ─── Wire Creation & Management ─────────────────────────────────────────

    _createPendingWire(startX, startY) {
        this.pendingWireLayer.innerHTML = '';
        this.pendingWirePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.pendingWirePath.setAttribute('class', 'wire-pending');
        this.pendingWirePath.setAttribute('d', `M ${startX} ${startY} L ${startX} ${startY}`);
        this.pendingWireLayer.appendChild(this.pendingWirePath);
    }

    _highlightConnectablePins(startKind) {
        if (!this.svg) return;
        const targetClass = startKind === 'output' ? '.input-pin' : '.output-pin';
        this.svg.querySelectorAll(targetClass).forEach(pin => {
            pin.classList.add('pin-target-candidate');
        });
    }

    _clearConnectableHighlights() {
        if (!this.svg) return;
        this.svg.querySelectorAll('.pin-target-candidate').forEach(pin => {
            pin.classList.remove('pin-target-candidate');
        });
    }

    _cancelPendingWire() {
        this.isCreatingWire = false;
        this.wireStartPin = null;
        this.pendingWireLayer.innerHTML = '';
        this.pendingWirePath = null;
        this._clearConnectableHighlights();
    }

    _completeWire(targetCompId, targetPinId, targetKind = 'input') {
        if (!this.wireStartPin) {
            this._cancelPendingWire();
            return;
        }

        let fromComp = this.wireStartPin.componentId;
        let fromPin = this.wireStartPin.pinId;
        let toComp = targetCompId;
        let toPin = targetPinId;

        // If user started from input pin or ended on output pin, swap to ensure from=output, to=input
        if (this.wireStartPin.kind === 'input' || targetKind === 'output') {
            fromComp = targetCompId;
            fromPin = targetPinId;
            toComp = this.wireStartPin.componentId;
            toPin = this.wireStartPin.pinId;
        }

        const res = this.graph.addConnection(fromComp, fromPin, toComp, toPin);

        if (!res.ok) {
            console.warn(`Connection failed: ${res.error}`);
            this._showFlashMessage(res.error, 'error');
        } else {
            this.simulator.evaluate();
            try { soundManager.playWireConnect(); } catch {}
        }

        this._cancelPendingWire();
        this.render();
    }

    // ─── Selection Management ───────────────────────────────────────────────

    selectComponent(id) {
        this._selectComponent(id);
    }

    selectWire(id) {
        this._selectWire(id);
    }

    _selectComponent(id) {
        this.selectedComponentId = id;
        this.selectedWireId = null;

        // Visual selection
        const allComps = this.componentsLayer.querySelectorAll('.gate-group');
        allComps.forEach(c => c.classList.remove('selected'));
        if (id) {
            const comp = document.getElementById(`comp-${id}`);
            if (comp) comp.classList.add('selected');
        }

        const allWires = this.wiresLayer.querySelectorAll('.circuit-wire');
        allWires.forEach(w => w.classList.remove('selected'));

        if (this.onSelectionChanged) {
            this.onSelectionChanged({
                type: id ? 'component' : null,
                id: id,
                component: id ? this.graph.getComponent(id) : null
            });
        }
    }

    _selectWire(id) {
        this.selectedWireId = id;
        this.selectedComponentId = null;

        const allComps = this.componentsLayer.querySelectorAll('.gate-group');
        allComps.forEach(c => c.classList.remove('selected'));

        const allWires = this.wiresLayer.querySelectorAll('.circuit-wire');
        allWires.forEach(w => w.classList.remove('selected'));

        if (id) {
            const wire = document.getElementById(`wire-${id}`);
            if (wire) wire.classList.add('selected');
        }

        if (this.onSelectionChanged) {
            this.onSelectionChanged({
                type: id ? 'wire' : null,
                id: id,
                connection: id ? this.graph.connections.get(id) : null
            });
        }
    }

    _showFlashMessage(msg, type = 'error') {
        const statusBar = document.getElementById('canvas-status-text');
        if (statusBar) {
            statusBar.textContent = `⚠ ${msg}`;
            statusBar.style.color = type === 'error' ? 'var(--color-danger)' : 'var(--color-warning)';
            setTimeout(() => {
                statusBar.textContent = 'Ready';
                statusBar.style.color = 'var(--text-muted)';
            }, 3500);
        }
    }
}
