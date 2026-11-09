/**
 * logic_simulator.js — Combinational logic evaluation engine
 * 
 * Evaluates combinational Boolean logic by traversing the circuit graph
 * in topological order. Does NOT handle sequential elements (DFF) — those
 * are managed by SequentialEngine.
 * 
 * ZERO DOM dependencies. Testable in Node.js.
 * 
 * @module LogicSimulator
 */

import { COMPONENT_TYPES } from './circuit_graph.js';

export class LogicSimulator {
    /**
     * @param {import('./circuit_graph.js').CircuitGraph} graph
     */
    constructor(graph) {
        this.graph = graph;
    }

    /**
     * Evaluate the entire combinational circuit.
     * Traverses components in topological order and evaluates each gate.
     * 
     * @returns {{ ok: boolean, error?: string, cycleNodes?: string[] }}
     */
    evaluate() {
        const topoResult = this.graph.getTopologicalOrder();
        if (!topoResult.ok) {
            return {
                ok: false,
                error: topoResult.error,
                cycleNodes: topoResult.cycleNodes
            };
        }

        for (const componentId of topoResult.order) {
            this._evaluateComponent(componentId);
        }

        return { ok: true };
    }

    /**
     * Evaluate a single component's outputs based on its current input values.
     * Skips sequential components (DFF, CLOCK) — those are handled externally.
     * 
     * @param {string} componentId
     * @private
     */
    _evaluateComponent(componentId) {
        const comp = this.graph.getComponent(componentId);
        if (!comp) return;

        const typeDef = COMPONENT_TYPES[comp.type];

        // Skip sequential components — handled by SequentialEngine
        if (typeDef.sequential) return;

        // INPUT components keep their user-set value
        if (comp.type === 'INPUT') return;

        // Gather input values from connected pins
        const inputValues = comp.inputs.map(pin => {
            if (pin.connectedTo) {
                return this.graph.getPinValue(pin.connectedTo);
            }
            return null; // Unconnected
        });

        // OUTPUT component: pass-through
        if (comp.type === 'OUTPUT') {
            // OUTPUT has inputs but no outputs array (it just displays the value)
            // Store the evaluated value on the input pin for display
            comp.inputs[0].value = inputValues[0];
            return;
        }

        // Evaluate the gate function
        const result = typeDef.evaluate(inputValues);

        // Set output pin value
        if (comp.outputs.length > 0) {
            comp.outputs[0].value = result;
        }
    }

    /**
     * Evaluate the circuit with specific input values.
     * Used for truth table generation and lesson validation.
     * 
     * IMPORTANT: This temporarily overrides input values, evaluates,
     * then returns results. It does NOT modify the original input values
     * permanently — caller decides whether to restore.
     * 
     * @param {Object<string, number>} inputValues - Map of componentId → value (0 or 1)
     * @returns {{ ok: boolean, outputs?: Object<string, number|null>, error?: string }}
     */
    evaluateWithInputs(inputValues) {
        // Save current input values
        const savedValues = {};
        const inputComps = this.graph.getInputComponents();
        for (const comp of inputComps) {
            savedValues[comp.id] = comp.outputs[0].value;
        }

        // Set test input values
        for (const [id, val] of Object.entries(inputValues)) {
            const comp = this.graph.getComponent(id);
            if (comp && comp.type === 'INPUT') {
                comp.outputs[0].value = val;
            }
        }

        // Evaluate
        const evalResult = this.evaluate();

        // Collect output values
        const outputs = {};
        if (evalResult.ok) {
            const outputComps = this.graph.getOutputComponents();
            for (const comp of outputComps) {
                outputs[comp.id] = comp.inputs[0].value;
            }
        }

        // Restore original input values
        for (const comp of inputComps) {
            comp.outputs[0].value = savedValues[comp.id];
        }

        // Re-evaluate with original values to restore circuit state
        this.evaluate();

        if (!evalResult.ok) {
            return { ok: false, error: evalResult.error };
        }

        return { ok: true, outputs };
    }

    /**
     * Get the current output values (without re-evaluating).
     * @returns {Object<string, number|null>} componentId → output value
     */
    getOutputValues() {
        const outputs = {};
        for (const comp of this.graph.getOutputComponents()) {
            outputs[comp.id] = comp.inputs[0].value;
        }
        return outputs;
    }

    /**
     * Get all current signal values in the circuit.
     * Useful for debugging and waveform recording.
     * @returns {Object<string, { inputs: Object, outputs: Object }>}
     */
    getAllSignalValues() {
        const signals = {};
        for (const comp of this.graph.components.values()) {
            signals[comp.id] = {
                type: comp.type,
                label: comp.label,
                inputs: {},
                outputs: {}
            };
            for (const pin of comp.inputs) {
                signals[comp.id].inputs[pin.label] = pin.value;
            }
            for (const pin of comp.outputs) {
                signals[comp.id].outputs[pin.label] = pin.value;
            }
        }
        return signals;
    }
}
