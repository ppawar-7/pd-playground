/**
 * sequential_engine.js — Clock and flip-flop state machine
 * 
 * Manages clock toggling and positive-edge-triggered D flip-flop behavior.
 * On a rising edge, ALL DFFs sample their D inputs simultaneously (using
 * pre-edge values), then ALL Q outputs update. Combinational logic is
 * re-evaluated after Q updates.
 * 
 * ZERO DOM dependencies. Testable in Node.js.
 * 
 * @module SequentialEngine
 */

import { COMPONENT_TYPES } from './circuit_graph.js';

export class SequentialEngine {
    /**
     * @param {import('./circuit_graph.js').CircuitGraph} graph
     * @param {import('./logic_simulator.js').LogicSimulator} simulator
     */
    constructor(graph, simulator) {
        this.graph = graph;
        this.simulator = simulator;
        this.clockState = 0;
        this.stepCount = 0;
        /** @type {Map<string, { Q: number|null }>} componentId → state */
        this.dffStates = new Map();
        /** @type {Array<object>} Waveform history snapshots */
        this.waveformHistory = [];
        /** @type {number} Max waveform steps to keep */
        this.maxHistoryLength = 64;
    }

    /**
     * Initialize or re-initialize all DFF states.
     * Called when the circuit changes (components added/removed).
     */
    initializeDFFs() {
        const dffs = this.graph.getDFFComponents();
        // Remove stale entries
        for (const id of this.dffStates.keys()) {
            if (!this.graph.getComponent(id)) {
                this.dffStates.delete(id);
            }
        }
        // Add new entries (preserve existing state)
        for (const dff of dffs) {
            if (!this.dffStates.has(dff.id)) {
                this.dffStates.set(dff.id, { Q: 0 });
                // Set initial Q output
                dff.outputs[0].value = 0;
            }
        }
    }

    /**
     * Toggle the clock one step (one half-cycle).
     * On rising edge (0→1): sample all D inputs, then update all Q outputs.
     * On falling edge (1→0): no DFF state change.
     * After each toggle: re-evaluate combinational logic.
     * 
     * @returns {{ ok: boolean, risingEdge: boolean, error?: string }}
     */
    clockStep() {
        this.initializeDFFs();

        const prevClock = this.clockState;
        this.clockState = this.clockState ^ 1;

        // Update all CLOCK component outputs
        for (const clk of this.graph.getClockComponents()) {
            clk.outputs[0].value = this.clockState;
        }

        let risingEdge = false;

        // Rising edge: 0 → 1
        if (prevClock === 0 && this.clockState === 1) {
            risingEdge = true;
            this._processRisingEdge();
        }

        // Re-evaluate combinational logic with new Q values and clock state
        this.simulator.evaluate();

        // Record waveform snapshot
        this._recordSnapshot();
        this.stepCount++;

        return { ok: true, risingEdge };
    }

    /**
     * Process a rising clock edge.
     * CRITICAL:
     * 1. Only DFFs connected to an active clock source are updated.
     * 2. All active DFFs sample D simultaneously BEFORE any Q updates (nonblocking semantics).
     * @private
     */
    _processRisingEdge() {
        const dffs = this.graph.getDFFComponents();

        // Phase 1: Determine which sequential elements are connected to an active clock source
        const activeDFFs = dffs.filter(dff => {
            const clkPin = dff.inputs[1]; // CLK pin (always pin 1)
            if (!clkPin || !clkPin.connectedTo) return false;
            const srcComp = this.graph.getComponent(clkPin.connectedTo.componentId);
            return srcComp && srcComp.type === 'CLOCK';
        });

        // Phase 2: Sample all inputs simultaneously (using current/pre-edge values - nonblocking semantics)
        const nextStates = new Map();
        for (const dff of activeDFFs) {
            const currentState = this.dffStates.get(dff.id)?.Q ?? 0;

            // Sample D input (pin 0)
            const dPin = dff.inputs[0];
            const dVal = (dPin && dPin.connectedTo) ? this.graph.getPinValue(dPin.connectedTo) : null;

            let nextQ = null;

            if (dff.type === 'DFF') {
                nextQ = dVal;
            } else if (dff.type === 'DFFE') {
                // Pin 2: EN
                const enPin = dff.inputs[2];
                const enVal = (enPin && enPin.connectedTo) ? this.graph.getPinValue(enPin.connectedTo) : null;
                if (enVal === 1) {
                    nextQ = dVal;
                } else if (enVal === 0) {
                    nextQ = currentState; // Retain previous state when enable is inactive (0)
                } else {
                    nextQ = null; // Unconnected or undefined enable propagates null
                }
            } else if (dff.type === 'DFFSR') {
                // Pin 2: RST
                const rstPin = dff.inputs[2];
                const rstVal = (rstPin && rstPin.connectedTo) ? this.graph.getPinValue(rstPin.connectedTo) : null;
                if (rstVal === 1) {
                    nextQ = 0; // Synchronous reset clears Q to 0 on posedge clk!
                } else if (rstVal === 0) {
                    nextQ = dVal; // Normal data load
                } else {
                    nextQ = null; // Unconnected or undefined reset propagates null
                }
            } else if (dff.type === 'DFFESR') {
                // Pin 2: EN, Pin 3: RST
                const enPin = dff.inputs[2];
                const enVal = (enPin && enPin.connectedTo) ? this.graph.getPinValue(enPin.connectedTo) : null;
                const rstPin = dff.inputs[3];
                const rstVal = (rstPin && rstPin.connectedTo) ? this.graph.getPinValue(rstPin.connectedTo) : null;

                // Documented Priority: Synchronous Reset takes priority over Enable
                if (rstVal === 1) {
                    nextQ = 0; // Synchronous reset dominates
                } else if (rstVal === 0) {
                    if (enVal === 1) {
                        nextQ = dVal;
                    } else if (enVal === 0) {
                        nextQ = currentState; // Retain previous state
                    } else {
                        nextQ = null;
                    }
                } else {
                    nextQ = null;
                }
            }

            nextStates.set(dff.id, nextQ);
        }

        // Phase 3: Update all Q outputs simultaneously (true hardware nonblocking semantics)
        for (const dff of activeDFFs) {
            const nextQ = nextStates.get(dff.id);
            const state = this.dffStates.get(dff.id);
            if (state) {
                state.Q = nextQ;
                dff.outputs[0].value = nextQ;
            }
        }
    }

    /**
     * Record a waveform snapshot of the current state.
     * @private
     */
    _recordSnapshot() {
        const snapshot = {
            step: this.stepCount,
            clock: this.clockState,
            signals: {}
        };

        // Record DFF / Register signals
        for (const dff of this.graph.getDFFComponents()) {
            const dPin = dff.inputs[0];
            const dValue = dPin && dPin.connectedTo
                ? this.graph.getPinValue(dPin.connectedTo)
                : null;

            const sig = {
                label: dff.label,
                type: dff.type,
                D: dValue,
                Q: this.dffStates.get(dff.id)?.Q ?? null
            };

            if (dff.type === 'DFFE' || dff.type === 'DFFESR') {
                const enPin = dff.inputs[2];
                sig.EN = (enPin && enPin.connectedTo) ? this.graph.getPinValue(enPin.connectedTo) : null;
            }
            if (dff.type === 'DFFSR') {
                const rstPin = dff.inputs[2];
                sig.RST = (rstPin && rstPin.connectedTo) ? this.graph.getPinValue(rstPin.connectedTo) : null;
            } else if (dff.type === 'DFFESR') {
                const rstPin = dff.inputs[3];
                sig.RST = (rstPin && rstPin.connectedTo) ? this.graph.getPinValue(rstPin.connectedTo) : null;
            }

            snapshot.signals[dff.id] = sig;
        }

        // Record INPUT values
        for (const inp of this.graph.getInputComponents()) {
            snapshot.signals[inp.id] = {
                label: inp.label,
                type: 'INPUT',
                value: inp.outputs[0].value
            };
        }

        // Record OUTPUT values
        for (const out of this.graph.getOutputComponents()) {
            snapshot.signals[out.id] = {
                label: out.label,
                type: 'OUTPUT',
                value: out.inputs[0].value
            };
        }

        this.waveformHistory.push(snapshot);

        // Trim history if too long
        if (this.waveformHistory.length > this.maxHistoryLength) {
            this.waveformHistory.shift();
        }
    }

    /**
     * Reset all sequential state.
     */
    reset() {
        this.clockState = 0;
        this.stepCount = 0;
        this.waveformHistory = [];

        // Reset all CLOCK outputs
        for (const clk of this.graph.getClockComponents()) {
            clk.outputs[0].value = 0;
        }

        // Reset all DFF states to 0
        for (const [id, state] of this.dffStates) {
            state.Q = 0;
            const dff = this.graph.getComponent(id);
            if (dff) {
                dff.outputs[0].value = 0;
            }
        }

        this.dffStates.clear();

        // Re-evaluate combinational logic
        this.simulator.evaluate();
    }

    /**
     * Get current DFF state.
     * @param {string} dffId
     * @returns {{ Q: number|null }|null}
     */
    getDFFState(dffId) {
        return this.dffStates.get(dffId) || null;
    }

    /**
     * Get the waveform history.
     * @returns {Array<object>}
     */
    getWaveformHistory() {
        return this.waveformHistory;
    }
}
