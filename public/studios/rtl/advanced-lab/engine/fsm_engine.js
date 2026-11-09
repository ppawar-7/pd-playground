/**
 * fsm_engine.js — Deterministic Synchronous Finite State Machine Engine
 * 
 * Part of PD Playground: Advanced RTL Lab
 * 
 * Pure JavaScript ES Module with ZERO DOM dependencies.
 * Implements:
 * - Deterministic Synchronous FSM Data Model (Moore & Mealy architectures)
 * - Rigorous FSM Validation: Unique state IDs, destination validation, reachability analysis,
 *   and determinism/overlap checking
 * - Clock-stepped simulation distinguishing combinational Mealy output changes from synchronous state transitions
 * - Preset definitions: 2-state toggle, traffic light, 1011 sequence detector, vending machine
 */

export class FSMValidationError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'FSMValidationError';
        this.details = details;
    }
}

export class FSMModel {
    /**
     * @param {Object} spec
     * @param {string} [spec.name='fsm_ctrl']
     * @param {string[]} spec.states - List of state names
     * @param {string} spec.resetState - Name of initial state
     * @param {Array<{ name: string, width: number }>} [spec.inputs=[]]
     * @param {Array<{ name: string, width: number }>} [spec.outputs=[]]
     * @param {Array<{ id: string, from: string, to: string, condition: string, priority?: number, mealyOutputs?: Object }>} spec.transitions
     * @param {Object.<string, Object.<string, number>>} [spec.mooreOutputs={}]
     * @param {'MOORE'|'MEALY'|'HYBRID'} [spec.fsmType='MOORE']
     */
    constructor(spec = {}) {
        this.name = spec.name || 'fsm_ctrl';
        this.states = Array.isArray(spec.states) ? [...spec.states] : ['IDLE'];
        this.resetState = spec.resetState || this.states[0];
        this.inputs = Array.isArray(spec.inputs) ? [...spec.inputs] : [{ name: 'in_bit', width: 1 }];
        this.outputs = Array.isArray(spec.outputs) ? [...spec.outputs] : [{ name: 'out_bit', width: 1 }];
        this.transitions = Array.isArray(spec.transitions) ? [...spec.transitions] : [];
        this.mooreOutputs = { ...spec.mooreOutputs };
        this.fsmType = spec.fsmType || 'MOORE';

        // Simulation state
        this.currentState = this.resetState;
        this.lastTransition = null;
        this.cycleCount = 0;
        this.history = [];
    }

    /**
     * Validate FSM configuration integrity.
     * @throws {FSMValidationError}
     */
    validate() {
        if (!this.states || this.states.length === 0) {
            throw new FSMValidationError('FSM must define at least one state.');
        }

        // 1. Check for unique state identifiers
        const stateSet = new Set();
        for (const s of this.states) {
            if (!s || typeof s !== 'string') {
                throw new FSMValidationError(`Invalid state identifier: ${s}`);
            }
            if (stateSet.has(s)) {
                throw new FSMValidationError(`Duplicate state identifier: '${s}'. State names must be unique.`, { state: s });
            }
            stateSet.add(s);
        }

        // 2. Validate reset state
        if (!stateSet.has(this.resetState)) {
            throw new FSMValidationError(
                `Reset state '${this.resetState}' is not in defined states [${this.states.join(', ')}].`,
                { resetState: this.resetState }
            );
        }

        // 3. Validate transitions
        const transIds = new Set();
        for (const t of this.transitions) {
            if (!t.from || !stateSet.has(t.from)) {
                throw new FSMValidationError(`Transition references invalid source state: '${t.from}'.`, { transition: t });
            }
            if (!t.to || !stateSet.has(t.to)) {
                throw new FSMValidationError(`Transition references invalid target state: '${t.to}'.`, { transition: t });
            }
            if (t.id) {
                if (transIds.has(t.id)) {
                    throw new FSMValidationError(`Duplicate transition ID: '${t.id}'.`, { transition: t });
                }
                transIds.add(t.id);
            }
        }

        // 4. Reachability analysis (BFS from resetState)
        const reachable = new Set([this.resetState]);
        const queue = [this.resetState];
        while (queue.length > 0) {
            const curr = queue.shift();
            for (const t of this.transitions) {
                if (t.from === curr && !reachable.has(t.to)) {
                    reachable.add(t.to);
                    queue.push(t.to);
                }
            }
        }

        const unreachable = this.states.filter(s => !reachable.has(s));

        // 5. Check for non-deterministic overlapping transitions
        const overlaps = [];
        for (const s of this.states) {
            const outTrans = this.transitions.filter(t => t.from === s);
            for (let i = 0; i < outTrans.length; i++) {
                for (let j = i + 1; j < outTrans.length; j++) {
                    const t1 = outTrans[i];
                    const t2 = outTrans[j];
                    // If neither has priority and both conditions are identical or both unconditional
                    const c1 = (t1.condition || '1').trim();
                    const c2 = (t2.condition || '1').trim();
                    if (c1 === c2 && t1.priority === t2.priority) {
                        overlaps.push({
                            state: s,
                            t1: t1.id || `${t1.from}->${t1.to}`,
                            t2: t2.id || `${t2.from}->${t2.to}`,
                            condition: c1
                        });
                    }
                }
            }
        }

        if (overlaps.length > 0) {
            throw new FSMValidationError(
                `Non-deterministic transitions detected in state '${overlaps[0].state}' for condition '${overlaps[0].condition}'. ` +
                `Assign distinct priorities or mutually exclusive conditions to ensure deterministic hardware synthesis.`,
                { overlaps }
            );
        }

        return {
            isValid: true,
            reachableStates: Array.from(reachable),
            unreachableStates: unreachable,
            hasUnreachable: unreachable.length > 0,
            warning: unreachable.length > 0 ? `Unreachable states detected: ${unreachable.join(', ')}` : null
        };
    }

    /**
     * Evaluates a transition condition against current input values.
     * @private
     */
    _evalCondition(conditionStr, inputVals) {
        return FSMModel.safeEvalBooleanExpr(conditionStr, inputVals);
    }

    /**
     * Safe recursive-descent Boolean expression parser and evaluator.
     * Complies with strict Content Security Policy (CSP) and prevents code injection.
     * Supports:
     * - Signal identifiers (e.g., in_bit, timer)
     * - Logical and bitwise operators: &&, &, ||, |, ^, !, ~
     * - Binary equality: ==, !=
     * - Numeric constants: 0, 1
     * - Parenthesized subexpressions: (a | b) & c
     *
     * @param {string} exprStr
     * @param {Object.<string, number>} [inputVals={}]
     * @returns {boolean}
     */
    static safeEvalBooleanExpr(exprStr, inputVals = {}) {
        if (exprStr === null || exprStr === undefined) return false;
        if (typeof exprStr !== 'string') return false;
        const s = exprStr.trim();
        if (s === '' || s === '1' || s.toLowerCase() === 'true') return true;
        if (s === '0' || s.toLowerCase() === 'false') return false;

        // Tokenize
        const tokens = [];
        let i = 0;
        const len = s.length;

        while (i < len) {
            const ch = s[i];
            if (/\s/.test(ch)) {
                i++;
                continue;
            }

            if (ch === '&') {
                if (s[i + 1] === '&') { tokens.push({ type: 'AND' }); i += 2; }
                else { tokens.push({ type: 'AND' }); i++; }
            } else if (ch === '|') {
                if (s[i + 1] === '|') { tokens.push({ type: 'OR' }); i += 2; }
                else { tokens.push({ type: 'OR' }); i++; }
            } else if (ch === '^') {
                tokens.push({ type: 'XOR' }); i++;
            } else if (ch === '=' && s[i + 1] === '=') {
                tokens.push({ type: 'EQ' }); i += 2;
            } else if (ch === '!' && s[i + 1] === '=') {
                tokens.push({ type: 'NEQ' }); i += 2;
            } else if (ch === '!' || ch === '~') {
                tokens.push({ type: 'NOT' }); i++;
            } else if (ch === '(') {
                tokens.push({ type: 'LPAREN' }); i++;
            } else if (ch === ')') {
                tokens.push({ type: 'RPAREN' }); i++;
            } else if (/\d/.test(ch)) {
                let numStr = '';
                while (i < len && /\d/.test(s[i])) {
                    numStr += s[i];
                    i++;
                }
                tokens.push({ type: 'NUM', val: parseInt(numStr, 10) });
            } else if (/[a-zA-Z_]/.test(ch)) {
                let idStr = '';
                while (i < len && /[a-zA-Z0-9_]/.test(s[i])) {
                    idStr += s[i];
                    i++;
                }
                tokens.push({ type: 'ID', val: idStr });
            } else {
                // Reject invalid tokens immediately for safety
                return false;
            }
        }

        if (tokens.length === 0) return true;

        let pos = 0;
        const peek = () => tokens[pos] || null;
        const consume = (expectedType) => {
            const tok = tokens[pos];
            if (!tok) return null;
            if (expectedType && tok.type !== expectedType) return null;
            pos++;
            return tok;
        };

        const parsePrimary = () => {
            const tok = peek();
            if (!tok) return 0;
            if (tok.type === 'NOT') {
                consume('NOT');
                const val = parsePrimary();
                return val ? 0 : 1;
            }
            if (tok.type === 'LPAREN') {
                consume('LPAREN');
                const val = parseOr();
                consume('RPAREN');
                return val;
            }
            if (tok.type === 'NUM') {
                consume('NUM');
                return tok.val;
            }
            if (tok.type === 'ID') {
                consume('ID');
                const v = inputVals[tok.val];
                return (v !== undefined && v !== null) ? Number(v) : 0;
            }
            return 0;
        };

        const parseEq = () => {
            let left = parsePrimary();
            while (peek() && (peek().type === 'EQ' || peek().type === 'NEQ')) {
                const op = consume().type;
                const right = parsePrimary();
                left = op === 'EQ' ? (left === right ? 1 : 0) : (left !== right ? 1 : 0);
            }
            return left;
        };

        const parseAnd = () => {
            let left = parseEq();
            while (peek() && peek().type === 'AND') {
                consume('AND');
                const right = parseEq();
                left = (left && right) ? 1 : 0;
            }
            return left;
        };

        const parseXor = () => {
            let left = parseAnd();
            while (peek() && peek().type === 'XOR') {
                consume('XOR');
                const right = parseAnd();
                left = (Boolean(left) !== Boolean(right)) ? 1 : 0;
            }
            return left;
        };

        const parseOr = () => {
            let left = parseXor();
            while (peek() && peek().type === 'OR') {
                consume('OR');
                const right = parseXor();
                left = (left || right) ? 1 : 0;
            }
            return left;
        };

        try {
            const res = parseOr();
            return Boolean(res);
        } catch {
            return false;
        }
    }

    /**
     * Evaluates outputs based on current state and current inputs.
     * Demonstrates that Moore outputs depend only on state, whereas Mealy outputs depend on state + inputs.
     * @param {Object.<string, number>} [inputVals={}]
     */
    evaluateOutputs(inputVals = {}) {
        const moore = {};
        const mealy = {};
        const active = {};

        // Moore outputs from current state
        const stateMoore = this.mooreOutputs[this.currentState] || {};
        for (const out of this.outputs) {
            moore[out.name] = stateMoore[out.name] !== undefined ? stateMoore[out.name] : 0;
            active[out.name] = moore[out.name];
        }

        // Mealy outputs: check if matching transition provides override
        const outTrans = this.transitions.filter(t => t.from === this.currentState);
        let matchingTrans = null;
        for (const t of outTrans) {
            if (this._evalCondition(t.condition, inputVals)) {
                matchingTrans = t;
                break;
            }
        }

        if (matchingTrans && matchingTrans.mealyOutputs) {
            for (const [k, v] of Object.entries(matchingTrans.mealyOutputs)) {
                mealy[k] = v;
                active[k] = v; // Mealy overrides for active combination
            }
        }

        return {
            currentState: this.currentState,
            mooreOutputs: moore,
            mealyOutputs: mealy,
            activeOutputs: active,
            matchingTransition: matchingTrans ? (matchingTrans.id || `${matchingTrans.from}->${matchingTrans.to}`) : null
        };
    }

    /**
     * Execute clock step: updates current state on active clock edge.
     * @param {Object.<string, number>} [inputVals={}]
     * @param {boolean|number} [rst=0]
     */
    clockStep(inputVals = {}, rst = 0) {
        if (rst) {
            this.currentState = this.resetState;
            this.lastTransition = null;
            this.cycleCount++;
            return {
                cycle: this.cycleCount,
                fromState: this.currentState,
                toState: this.currentState,
                transitionTaken: 'RESET',
                inputs: { ...inputVals },
                outputs: this.evaluateOutputs(inputVals)
            };
        }

        // Evaluate transitions from current state
        const outTrans = this.transitions.filter(t => t.from === this.currentState);
        // Sort by priority if defined (lower number = higher priority)
        outTrans.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

        let nextState = this.currentState;
        let taken = null;

        for (const t of outTrans) {
            if (this._evalCondition(t.condition, inputVals)) {
                nextState = t.to;
                taken = t;
                break;
            }
        }

        const from = this.currentState;
        this.currentState = nextState;
        this.lastTransition = taken ? (taken.id || `${from}->${nextState}`) : null;
        this.cycleCount++;

        const stepResult = {
            cycle: this.cycleCount,
            fromState: from,
            toState: nextState,
            transitionTaken: this.lastTransition,
            inputs: { ...inputVals },
            outputs: this.evaluateOutputs(inputVals)
        };

        this.history.push(stepResult);
        return stepResult;
    }

    /**
     * Resets FSM to reset state.
     */
    reset() {
        this.currentState = this.resetState;
        this.lastTransition = null;
        this.cycleCount = 0;
        this.history = [];
        return this.currentState;
    }
}

/**
 * Standard Educational FSM Presets
 */
export const FSMPresets = {
    /**
     * 2-State Toggle Controller
     */
    twoStateToggle: () => new FSMModel({
        name: 'toggle_fsm',
        states: ['OFF', 'ON'],
        resetState: 'OFF',
        inputs: [{ name: 'btn', width: 1 }],
        outputs: [{ name: 'led', width: 1 }],
        transitions: [
            { id: 't_off_to_on', from: 'OFF', to: 'ON', condition: 'btn == 1' },
            { id: 't_off_hold',  from: 'OFF', to: 'OFF', condition: 'btn == 0' },
            { id: 't_on_to_off', from: 'ON',  to: 'OFF', condition: 'btn == 1' },
            { id: 't_on_hold',   from: 'ON',  to: 'ON',  condition: 'btn == 0' }
        ],
        mooreOutputs: {
            OFF: { led: 0 },
            ON:  { led: 1 }
        },
        fsmType: 'MOORE'
    }),

    /**
     * Simple Traffic Light Controller
     */
    trafficLight: () => new FSMModel({
        name: 'traffic_light_fsm',
        states: ['GREEN', 'YELLOW', 'RED'],
        resetState: 'RED',
        inputs: [{ name: 'timer', width: 1 }],
        outputs: [
            { name: 'light_g', width: 1 },
            { name: 'light_y', width: 1 },
            { name: 'light_r', width: 1 }
        ],
        transitions: [
            { id: 't_red_green',   from: 'RED',    to: 'GREEN',  condition: 'timer == 1' },
            { id: 't_red_hold',    from: 'RED',    to: 'RED',    condition: 'timer == 0' },
            { id: 't_green_yellow',from: 'GREEN',  to: 'YELLOW', condition: 'timer == 1' },
            { id: 't_green_hold',  from: 'GREEN',  to: 'GREEN',  condition: 'timer == 0' },
            { id: 't_yellow_red',  from: 'YELLOW', to: 'RED',    condition: 'timer == 1' },
            { id: 't_yellow_hold', from: 'YELLOW', to: 'RED',    condition: 'timer == 0' }
        ],
        mooreOutputs: {
            RED:    { light_r: 1, light_y: 0, light_g: 0 },
            GREEN:  { light_r: 0, light_y: 0, light_g: 1 },
            YELLOW: { light_r: 0, light_y: 1, light_g: 0 }
        },
        fsmType: 'MOORE'
    }),

    /**
     * 1011 Sequence Detector (Overlapping)
     */
    sequenceDetector1011: () => new FSMModel({
        name: 'seq_detector_1011',
        states: ['S_RESET', 'S_1', 'S_10', 'S_101', 'S_1011'],
        resetState: 'S_RESET',
        inputs: [{ name: 'bit_in', width: 1 }],
        outputs: [{ name: 'detected', width: 1 }],
        transitions: [
            { id: 't0_0', from: 'S_RESET', to: 'S_RESET', condition: 'bit_in == 0' },
            { id: 't0_1', from: 'S_RESET', to: 'S_1',     condition: 'bit_in == 1' },

            { id: 't1_0', from: 'S_1',     to: 'S_10',    condition: 'bit_in == 0' },
            { id: 't1_1', from: 'S_1',     to: 'S_1',     condition: 'bit_in == 1' },

            { id: 't2_0', from: 'S_10',    to: 'S_RESET', condition: 'bit_in == 0' },
            { id: 't2_1', from: 'S_10',    to: 'S_101',   condition: 'bit_in == 1' },

            { id: 't3_0', from: 'S_101',   to: 'S_10',    condition: 'bit_in == 0' },
            { id: 't3_1', from: 'S_101',   to: 'S_1011',  condition: 'bit_in == 1' },

            // After 1011: with bit_in=0, suffix is "10" -> S_10; with bit_in=1, suffix is "1" -> S_1
            { id: 't4_0', from: 'S_1011',  to: 'S_10',    condition: 'bit_in == 0' },
            { id: 't4_1', from: 'S_1011',  to: 'S_1',     condition: 'bit_in == 1' }
        ],
        mooreOutputs: {
            S_RESET: { detected: 0 },
            S_1:     { detected: 0 },
            S_10:    { detected: 0 },
            S_101:   { detected: 0 },
            S_1011:  { detected: 1 }
        },
        fsmType: 'MOORE'
    }),

    /**
     * Vending Machine Controller (20 cents target)
     */
    vendingMachine: () => new FSMModel({
        name: 'vending_fsm',
        states: ['C_0', 'C_5', 'C_10', 'C_15', 'VEND'],
        resetState: 'C_0',
        inputs: [
            { name: 'coin_5', width: 1 },
            { name: 'coin_10', width: 1 }
        ],
        outputs: [{ name: 'dispense', width: 1 }],
        transitions: [
            // C_0
            { id: 'v0_10', from: 'C_0', to: 'C_10', condition: 'coin_10 == 1', priority: 1 },
            { id: 'v0_5',  from: 'C_0', to: 'C_5',  condition: 'coin_5 == 1',  priority: 2 },
            { id: 'v0_0',  from: 'C_0', to: 'C_0',  condition: 'coin_5 == 0 && coin_10 == 0', priority: 3 },

            // C_5
            { id: 'v5_10', from: 'C_5', to: 'C_15', condition: 'coin_10 == 1', priority: 1 },
            { id: 'v5_5',  from: 'C_5', to: 'C_10', condition: 'coin_5 == 1',  priority: 2 },
            { id: 'v5_0',  from: 'C_5', to: 'C_5',  condition: 'coin_5 == 0 && coin_10 == 0', priority: 3 },

            // C_10
            { id: 'v10_10', from: 'C_10', to: 'VEND', condition: 'coin_10 == 1', priority: 1 },
            { id: 'v10_5',  from: 'C_10', to: 'C_15', condition: 'coin_5 == 1',  priority: 2 },
            { id: 'v10_0',  from: 'C_10', to: 'C_10', condition: 'coin_5 == 0 && coin_10 == 0', priority: 3 },

            // C_15
            { id: 'v15_any', from: 'C_15', to: 'VEND', condition: 'coin_5 == 1 || coin_10 == 1', priority: 1 },
            { id: 'v15_0',   from: 'C_15', to: 'C_15', condition: 'coin_5 == 0 && coin_10 == 0', priority: 2 },

            // VEND automatically returns to C_0
            { id: 'v_reset', from: 'VEND', to: 'C_0', condition: '1' }
        ],
        mooreOutputs: {
            C_0:  { dispense: 0 },
            C_5:  { dispense: 0 },
            C_10: { dispense: 0 },
            C_15: { dispense: 0 },
            VEND: { dispense: 1 }
        },
        fsmType: 'MOORE'
    })
};
