/**
 * circuit_graph.js — Core circuit data model
 * 
 * The CircuitGraph is the single source of truth for all circuit data.
 * It stores components (gates, inputs, outputs, flip-flops), their pins,
 * and the connections (wires) between them.
 * 
 * This module has ZERO DOM dependencies and can be tested in Node.js.
 * 
 * @module CircuitGraph
 */

// ─── Component Type Definitions ─────────────────────────────────────────────

export const COMPONENT_TYPES = {
    INPUT: {
        label: 'Input',
        category: 'io',
        inputCount: 0,
        outputCount: 1,
        inputLabels: [],
        outputLabels: ['Y'],
        sequential: false,
        evaluate: () => null // Value set externally
    },
    OUTPUT: {
        label: 'Output',
        category: 'io',
        inputCount: 1,
        outputCount: 0,
        inputLabels: ['A'],
        outputLabels: [],
        sequential: false,
        evaluate: ([a]) => a
    },
    AND: {
        label: 'AND',
        category: 'gate',
        inputCount: 2,
        outputCount: 1,
        inputLabels: ['A', 'B'],
        outputLabels: ['Y'],
        sequential: false,
        evaluate: ([a, b]) => (a !== null && b !== null) ? (a & b) : null
    },
    OR: {
        label: 'OR',
        category: 'gate',
        inputCount: 2,
        outputCount: 1,
        inputLabels: ['A', 'B'],
        outputLabels: ['Y'],
        sequential: false,
        evaluate: ([a, b]) => (a !== null && b !== null) ? (a | b) : null
    },
    NOT: {
        label: 'NOT',
        category: 'gate',
        inputCount: 1,
        outputCount: 1,
        inputLabels: ['A'],
        outputLabels: ['Y'],
        sequential: false,
        evaluate: ([a]) => (a !== null) ? (a ^ 1) : null
    },
    NAND: {
        label: 'NAND',
        category: 'gate',
        inputCount: 2,
        outputCount: 1,
        inputLabels: ['A', 'B'],
        outputLabels: ['Y'],
        sequential: false,
        evaluate: ([a, b]) => (a !== null && b !== null) ? ((a & b) ^ 1) : null
    },
    NOR: {
        label: 'NOR',
        category: 'gate',
        inputCount: 2,
        outputCount: 1,
        inputLabels: ['A', 'B'],
        outputLabels: ['Y'],
        sequential: false,
        evaluate: ([a, b]) => (a !== null && b !== null) ? ((a | b) ^ 1) : null
    },
    XOR: {
        label: 'XOR',
        category: 'gate',
        inputCount: 2,
        outputCount: 1,
        inputLabels: ['A', 'B'],
        outputLabels: ['Y'],
        sequential: false,
        evaluate: ([a, b]) => (a !== null && b !== null) ? (a ^ b) : null
    },
    XNOR: {
        label: 'XNOR',
        category: 'gate',
        inputCount: 2,
        outputCount: 1,
        inputLabels: ['A', 'B'],
        outputLabels: ['Y'],
        sequential: false,
        evaluate: ([a, b]) => (a !== null && b !== null) ? ((a ^ b) ^ 1) : null
    },
    MUX2: {
        label: 'MUX 2:1',
        category: 'combinational',
        inputCount: 3,
        outputCount: 1,
        inputLabels: ['A', 'B', 'Sel'],
        outputLabels: ['Y'],
        sequential: false,
        evaluate: ([a, b, sel]) => {
            if (sel === null) return null;
            if (sel === 0) return a;  // sel=0 → pass A (even if A is null)
            return b;                  // sel=1 → pass B (even if B is null)
        }
    },
    DFF: {
        label: 'D Flip-Flop',
        category: 'sequential',
        inputCount: 2,
        outputCount: 1,
        inputLabels: ['D', 'CLK'],
        outputLabels: ['Q'],
        sequential: true,
        evaluate: null // Handled by SequentialEngine
    },
    DFFE: {
        label: 'DFF with Enable',
        category: 'sequential',
        inputCount: 3,
        outputCount: 1,
        inputLabels: ['D', 'CLK', 'EN'],
        outputLabels: ['Q'],
        sequential: true,
        evaluate: null // Handled by SequentialEngine
    },
    DFFSR: {
        label: 'DFF with Sync Reset',
        category: 'sequential',
        inputCount: 3,
        outputCount: 1,
        inputLabels: ['D', 'CLK', 'RST'],
        outputLabels: ['Q'],
        sequential: true,
        evaluate: null // Handled by SequentialEngine
    },
    DFFESR: {
        label: 'DFF with EN & RST',
        category: 'sequential',
        inputCount: 4,
        outputCount: 1,
        inputLabels: ['D', 'CLK', 'EN', 'RST'],
        outputLabels: ['Q'],
        sequential: true,
        evaluate: null // Handled by SequentialEngine
    },
    CLOCK: {
        label: 'Clock',
        category: 'sequential',
        inputCount: 0,
        outputCount: 1,
        inputLabels: [],
        outputLabels: ['CLK'],
        sequential: true,
        evaluate: () => null // Value set by SequentialEngine
    }
};

// ─── Simple Event Emitter ───────────────────────────────────────────────────

class EventEmitter {
    constructor() {
        this._listeners = {};
    }

    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this._listeners[event]) return;
        for (const cb of this._listeners[event]) {
            cb(data);
        }
    }
}

// ─── Circuit Graph ──────────────────────────────────────────────────────────

let _nextId = 1;

function generateId(prefix) {
    return `${prefix}_${_nextId++}`;
}

/** Reset the ID counter (for testing) */
export function resetIdCounter() {
    _nextId = 1;
}

export class CircuitGraph extends EventEmitter {
    constructor() {
        super();
        /** @type {Map<string, object>} Component ID → component data */
        this.components = new Map();
        /** @type {Map<string, object>} Connection ID → connection data */
        this.connections = new Map();
    }

    // ─── Component Management ─────────────────────────────────────────

    /**
     * Add a new component to the circuit.
     * @param {string} type - Component type key (e.g., 'AND', 'INPUT')
     * @param {number} x - X position on canvas
     * @param {number} y - Y position on canvas
     * @param {string} [label] - Optional custom label
     * @returns {{ ok: boolean, id?: string, error?: string }}
     */
    addComponent(type, x, y, label) {
        const typeDef = COMPONENT_TYPES[type];
        if (!typeDef) {
            return { ok: false, error: `Unknown component type: ${type}` };
        }

        const id = generateId(type.toLowerCase());
        const component = {
            id,
            type,
            label: label || `${typeDef.label}`,
            x: x || 0,
            y: y || 0,
            inputs: [],
            outputs: []
        };

        // Create input pins
        for (let i = 0; i < typeDef.inputCount; i++) {
            component.inputs.push({
                id: `${id}.in${i}`,
                label: typeDef.inputLabels[i] || `in${i}`,
                value: null,
                connectedTo: null  // { componentId, pinId } or null
            });
        }

        // Create output pins
        for (let i = 0; i < typeDef.outputCount; i++) {
            component.outputs.push({
                id: `${id}.out${i}`,
                label: typeDef.outputLabels[i] || `out${i}`,
                value: null
            });
        }

        this.components.set(id, component);
        this.emit('componentAdded', component);
        this.emit('change', { type: 'componentAdded', component });
        return { ok: true, id };
    }

    /**
     * Remove a component and all its connections.
     * @param {string} id - Component ID
     * @returns {{ ok: boolean, error?: string }}
     */
    removeComponent(id) {
        const component = this.components.get(id);
        if (!component) {
            return { ok: false, error: `Component not found: ${id}` };
        }

        // Remove all connections involving this component
        const connectionsToRemove = [];
        for (const [connId, conn] of this.connections) {
            if (conn.fromComponent === id || conn.toComponent === id) {
                connectionsToRemove.push(connId);
            }
        }
        for (const connId of connectionsToRemove) {
            this._removeConnectionInternal(connId);
        }

        this.components.delete(id);
        this.emit('componentRemoved', { id });
        this.emit('change', { type: 'componentRemoved', id });
        return { ok: true };
    }

    /**
     * Get a component by ID.
     * @param {string} id
     * @returns {object|null}
     */
    getComponent(id) {
        return this.components.get(id) || null;
    }

    /**
     * Move a component to a new position.
     * @param {string} id
     * @param {number} x
     * @param {number} y
     */
    moveComponent(id, x, y) {
        const comp = this.components.get(id);
        if (comp) {
            comp.x = x;
            comp.y = y;
            this.emit('componentMoved', { id, x, y });
        }
    }

    /**
     * Set the value of an INPUT component.
     * @param {string} id - Component ID (must be INPUT type)
     * @param {number} value - 0 or 1
     * @returns {{ ok: boolean, error?: string }}
     */
    setInputValue(id, value) {
        const comp = this.components.get(id);
        if (!comp) return { ok: false, error: `Component not found: ${id}` };
        if (comp.type !== 'INPUT' && comp.type !== 'CLOCK') {
            return { ok: false, error: `Component ${id} is not an INPUT or CLOCK` };
        }
        if (value !== 0 && value !== 1) {
            return { ok: false, error: `Value must be 0 or 1, got: ${value}` };
        }
        comp.outputs[0].value = value;
        this.emit('inputChanged', { id, value });
        this.emit('change', { type: 'inputChanged', id, value });
        return { ok: true };
    }

    // ─── Connection Management ────────────────────────────────────────

    /**
     * Create a wire between an output pin and an input pin.
     * @param {string} fromComponent - Source component ID
     * @param {string} fromPin - Source output pin ID
     * @param {string} toComponent - Target component ID
     * @param {string} toPin - Target input pin ID
     * @returns {{ ok: boolean, id?: string, error?: string }}
     */
    addConnection(fromComponent, fromPin, toComponent, toPin) {
        // Validate source component exists
        const fromComp = this.components.get(fromComponent);
        if (!fromComp) return { ok: false, error: `Source component not found: ${fromComponent}` };

        // Validate target component exists
        const toComp = this.components.get(toComponent);
        if (!toComp) return { ok: false, error: `Target component not found: ${toComponent}` };

        // Validate source pin is an output
        const srcPin = fromComp.outputs.find(p => p.id === fromPin);
        if (!srcPin) return { ok: false, error: `Source pin not found: ${fromPin}` };

        // Validate target pin is an input
        const tgtPin = toComp.inputs.find(p => p.id === toPin);
        if (!tgtPin) return { ok: false, error: `Target pin not found: ${toPin}` };

        // Reject self-connections
        if (fromComponent === toComponent) {
            return { ok: false, error: 'Cannot connect a component to itself' };
        }

        // Reject multiple drivers — input pin already connected
        if (tgtPin.connectedTo !== null) {
            return { ok: false, error: `Input pin ${toPin} already has a connection (multiple drivers not allowed)` };
        }

        // Check for duplicate connection
        for (const conn of this.connections.values()) {
            if (conn.fromComponent === fromComponent && conn.fromPin === fromPin &&
                conn.toComponent === toComponent && conn.toPin === toPin) {
                return { ok: false, error: 'This connection already exists' };
            }
        }

        const id = generateId('conn');
        const connection = {
            id,
            fromComponent,
            fromPin,
            toComponent,
            toPin
        };

        // Mark the target pin as connected
        tgtPin.connectedTo = { componentId: fromComponent, pinId: fromPin };

        this.connections.set(id, connection);
        this.emit('connectionAdded', connection);
        this.emit('change', { type: 'connectionAdded', connection });
        return { ok: true, id };
    }

    /**
     * Remove a connection by ID.
     * @param {string} id
     * @returns {{ ok: boolean, error?: string }}
     */
    removeConnection(id) {
        const result = this._removeConnectionInternal(id);
        if (result.ok) {
            this.emit('connectionRemoved', { id });
            this.emit('change', { type: 'connectionRemoved', id });
        }
        return result;
    }

    /** @private */
    _removeConnectionInternal(id) {
        const conn = this.connections.get(id);
        if (!conn) return { ok: false, error: `Connection not found: ${id}` };

        // Clear the target pin's connectedTo reference
        const toComp = this.components.get(conn.toComponent);
        if (toComp) {
            const tgtPin = toComp.inputs.find(p => p.id === conn.toPin);
            if (tgtPin) {
                tgtPin.connectedTo = null;
                tgtPin.value = null;
            }
        }

        this.connections.delete(id);
        return { ok: true };
    }

    /**
     * Get the current value of a pin.
     * @param {{ componentId: string, pinId: string }} pinRef
     * @returns {number|null}
     */
    getPinValue(pinRef) {
        if (!pinRef) return null;
        const comp = this.components.get(pinRef.componentId);
        if (!comp) return null;

        // Check outputs first (most common for connectedTo references)
        for (const pin of comp.outputs) {
            if (pin.id === pinRef.pinId) return pin.value;
        }
        // Then inputs
        for (const pin of comp.inputs) {
            if (pin.id === pinRef.pinId) return pin.value;
        }
        return null;
    }

    // ─── Topological Sort & Cycle Detection ───────────────────────────

    /**
     * Build a combinational dependency adjacency list.
     * Sequential elements (DFF) break the dependency chain:
     * DFF Q output does not combinationally depend on DFF D input.
     * @returns {Map<string, string[]>} componentId → [dependent componentIds]
     * @private
     */
    _buildAdjacencyList() {
        const adj = new Map();
        for (const id of this.components.keys()) {
            adj.set(id, []);
        }

        for (const conn of this.connections.values()) {
            const fromComp = this.components.get(conn.fromComponent);
            // Sequential register outputs (DFF, DFFE, etc.) do NOT create a combinational dependency
            if (fromComp && (fromComp.type === 'DFF' || fromComp.type === 'DFFE' || fromComp.type === 'DFFSR' || fromComp.type === 'DFFESR')) continue;

            if (adj.has(conn.fromComponent)) {
                adj.get(conn.fromComponent).push(conn.toComponent);
            }
        }

        return adj;
    }

    /**
     * Detect combinational feedback loops using DFS 3-color algorithm.
     * @returns {{ hasCycle: boolean, cycleNodes: string[] }}
     */
    detectCycles() {
        const adj = this._buildAdjacencyList();
        const WHITE = 0, GRAY = 1, BLACK = 2;
        const color = new Map();
        const cycleNodes = [];
        let hasCycle = false;

        for (const id of this.components.keys()) {
            color.set(id, WHITE);
        }

        const dfs = (u) => {
            color.set(u, GRAY);
            for (const v of (adj.get(u) || [])) {
                if (color.get(v) === GRAY) {
                    hasCycle = true;
                    cycleNodes.push(u, v);
                    return;
                }
                if (color.get(v) === WHITE) {
                    dfs(v);
                    if (hasCycle) return;
                }
            }
            color.set(u, BLACK);
        };

        for (const id of this.components.keys()) {
            if (color.get(id) === WHITE) {
                dfs(id);
                if (hasCycle) break;
            }
        }

        return { hasCycle, cycleNodes: [...new Set(cycleNodes)] };
    }

    /**
     * Get topological ordering of components for evaluation.
     * Uses Kahn's algorithm (BFS-based).
     * @returns {{ ok: boolean, order?: string[], error?: string }}
     */
    getTopologicalOrder() {
        // Check for cycles first
        const cycleResult = this.detectCycles();
        if (cycleResult.hasCycle) {
            return {
                ok: false,
                error: 'Combinational feedback loop detected',
                cycleNodes: cycleResult.cycleNodes
            };
        }

        // Build in-degree map (combinational dependencies only)
        const inDegree = new Map();
        const adj = new Map();

        for (const id of this.components.keys()) {
            inDegree.set(id, 0);
            adj.set(id, []);
        }

        for (const conn of this.connections.values()) {
            const fromComp = this.components.get(conn.fromComponent);
            // Skip sequential register outputs (DFF, DFFE, etc.)
            if (fromComp && (fromComp.type === 'DFF' || fromComp.type === 'DFFE' || fromComp.type === 'DFFSR' || fromComp.type === 'DFFESR')) continue;

            adj.get(conn.fromComponent).push(conn.toComponent);
            inDegree.set(conn.toComponent, (inDegree.get(conn.toComponent) || 0) + 1);
        }

        // BFS: start with nodes that have no combinational inputs
        const queue = [];
        for (const [id, deg] of inDegree) {
            if (deg === 0) queue.push(id);
        }

        const order = [];
        while (queue.length > 0) {
            const u = queue.shift();
            order.push(u);
            for (const v of adj.get(u)) {
                inDegree.set(v, inDegree.get(v) - 1);
                if (inDegree.get(v) === 0) queue.push(v);
            }
        }

        return { ok: true, order };
    }

    // ─── Query Helpers ────────────────────────────────────────────────

    /** Get all INPUT-type components */
    getInputComponents() {
        return [...this.components.values()].filter(c => c.type === 'INPUT');
    }

    /** Get all OUTPUT-type components */
    getOutputComponents() {
        return [...this.components.values()].filter(c => c.type === 'OUTPUT');
    }

    /** Get all components as an array */
    getAllComponents() {
        return [...this.components.values()];
    }

    /** Get all CLOCK-type components */
    getClockComponents() {
        return [...this.components.values()].filter(c => c.type === 'CLOCK');
    }

    /** Get all sequential register components (DFF, DFFE, DFFSR, DFFESR) */
    getDFFComponents() {
        return [...this.components.values()].filter(c => 
            c.type === 'DFF' || c.type === 'DFFE' || c.type === 'DFFSR' || c.type === 'DFFESR'
        );
    }

    /** Get all connections involving a specific component */
    getComponentConnections(componentId) {
        const result = [];
        for (const conn of this.connections.values()) {
            if (conn.fromComponent === componentId || conn.toComponent === componentId) {
                result.push(conn);
            }
        }
        return result;
    }

    /**
     * Validate the circuit for common issues.
     * @returns {{ valid: boolean, warnings: string[], errors: string[] }}
     */
    validateCircuit() {
        const warnings = [];
        const errors = [];

        // Check for cycles
        const cycleResult = this.detectCycles();
        if (cycleResult.hasCycle) {
            errors.push('Combinational feedback loop detected');
        }

        // Check for unconnected input pins (excluding INPUT/CLOCK components)
        for (const comp of this.components.values()) {
            if (comp.type === 'INPUT' || comp.type === 'CLOCK') continue;
            for (const pin of comp.inputs) {
                if (pin.connectedTo === null) {
                    warnings.push(`${comp.label} (${comp.id}): input "${pin.label}" is not connected`);
                }
            }
        }

        // Check for unconnected output components
        for (const comp of this.components.values()) {
            if (comp.type === 'OUTPUT') {
                if (comp.inputs[0].connectedTo === null) {
                    warnings.push(`Output "${comp.label}" (${comp.id}) is not connected`);
                }
            }
        }

        // Check sequential requirements (DFF must have clock source)
        const dffs = this.getDFFComponents();
        const clocks = this.getClockComponents();
        if (dffs.length > 0) {
            if (clocks.length === 0) {
                errors.push('Circuit contains D Flip-Flop(s) but no Clock component');
            }
            for (const dff of dffs) {
                const clkPin = dff.inputs[1];
                if (!clkPin || clkPin.connectedTo === null) {
                    errors.push(`D Flip-Flop "${dff.label}" (${dff.id}): CLK input must be connected to a Clock`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            warnings,
            errors
        };
    }

    // ─── Serialization ────────────────────────────────────────────────

    /**
     * Serialize the circuit to a plain JSON object.
     * @returns {object}
     */
    serialize() {
        const components = [];
        for (const comp of this.components.values()) {
            components.push({
                id: comp.id,
                type: comp.type,
                label: comp.label,
                x: comp.x,
                y: comp.y,
                // Store input values for INPUT components
                value: comp.type === 'INPUT' ? comp.outputs[0].value : undefined
            });
        }

        const connections = [];
        for (const conn of this.connections.values()) {
            connections.push({
                fromComponent: conn.fromComponent,
                fromPin: conn.fromPin,
                toComponent: conn.toComponent,
                toPin: conn.toPin
            });
        }

        return {
            components,
            connections,
            metadata: {
                hasSequentialLogic: this.getDFFComponents().length > 0,
                inputCount: this.getInputComponents().length,
                outputCount: this.getOutputComponents().length,
                gateCount: [...this.components.values()].filter(
                    c => !['INPUT', 'OUTPUT', 'CLOCK'].includes(c.type)
                ).length
            }
        };
    }

    /**
     * Load a circuit from serialized data.
     * @param {object} data - Serialized circuit from serialize()
     * @returns {{ ok: boolean, error?: string }}
     */
    deserialize(data) {
        if (!data || !data.components || !data.connections) {
            return { ok: false, error: 'Invalid circuit data' };
        }

        this.clear();

        // Restore the ID counter to avoid collisions
        // Find max existing numeric suffix
        let maxId = 0;
        for (const comp of data.components) {
            const match = comp.id.match(/_(\d+)$/);
            if (match) maxId = Math.max(maxId, parseInt(match[1]));
        }
        _nextId = maxId + 1;

        // Add components
        for (const compData of data.components) {
            const typeDef = COMPONENT_TYPES[compData.type];
            if (!typeDef) continue;

            const component = {
                id: compData.id,
                type: compData.type,
                label: compData.label || typeDef.label,
                x: compData.x || 0,
                y: compData.y || 0,
                inputs: [],
                outputs: []
            };

            for (let i = 0; i < typeDef.inputCount; i++) {
                component.inputs.push({
                    id: `${compData.id}.in${i}`,
                    label: typeDef.inputLabels[i] || `in${i}`,
                    value: null,
                    connectedTo: null
                });
            }

            for (let i = 0; i < typeDef.outputCount; i++) {
                component.outputs.push({
                    id: `${compData.id}.out${i}`,
                    label: typeDef.outputLabels[i] || `out${i}`,
                    value: null
                });
            }

            // Restore INPUT values
            if (compData.type === 'INPUT' && (compData.value === 0 || compData.value === 1)) {
                component.outputs[0].value = compData.value;
            }

            this.components.set(compData.id, component);
        }

        // Add connections
        for (const connData of data.connections) {
            this.addConnection(
                connData.fromComponent,
                connData.fromPin,
                connData.toComponent,
                connData.toPin
            );
        }

        this.emit('deserialized', {});
        this.emit('change', { type: 'deserialized' });
        return { ok: true };
    }

    /**
     * Clear the entire circuit.
     */
    clear() {
        this.components.clear();
        this.connections.clear();
        this.emit('cleared', {});
        this.emit('change', { type: 'cleared' });
    }

    /**
     * Get count summary.
     */
    getSummary() {
        return {
            componentCount: this.components.size,
            connectionCount: this.connections.size,
            inputCount: this.getInputComponents().length,
            outputCount: this.getOutputComponents().length,
            dffCount: this.getDFFComponents().length,
            clockCount: this.getClockComponents().length
        };
    }
}
