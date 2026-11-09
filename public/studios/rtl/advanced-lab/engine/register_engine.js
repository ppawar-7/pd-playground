/**
 * register_engine.js — Multi-Bit Sequential Register Engine with Nonblocking Semantics
 * 
 * Part of PD Playground: Advanced RTL Lab
 * 
 * Pure JavaScript ES Module with ZERO DOM dependencies.
 * Implements:
 * - MultiBitRegister with positive-edge triggering, synchronous reset, clock enable, and configurable reset value.
 * - SequentialSimulationCycle to execute true simultaneous nonblocking assignments across multiple registers (eliminating race conditions).
 */

import { VectorSignal, VectorOps } from './vector_model.js';

export class MultiBitRegister {
    /**
     * @param {Object} options
     * @param {string} [options.name='reg'] - Register name
     * @param {number} [options.width=4] - Bus width
     * @param {number|bigint} [options.resetValue=0] - Value on reset
     */
    constructor({ name = 'reg', width = 4, resetValue = 0 } = {}) {
        if (!Number.isInteger(width) || width < 1 || width > 64) {
            throw new RangeError(`Register width must be 1 to 64, got ${width}`);
        }
        this.name = name;
        this.width = width;
        this.resetValue = BigInt(resetValue);

        // State vector Q
        this.q = new VectorSignal({
            name: `${name}_q`,
            width: this.width,
            value: this.resetValue
        });

        // Next state buffer for nonblocking evaluation
        this._nextQ = this.q.clone();

        // Clock edge detection tracking
        this._lastClk = 0;
    }

    /**
     * Resets register state to configured reset value.
     */
    reset() {
        this.q = new VectorSignal({
            name: `${this.name}_q`,
            width: this.width,
            value: this.resetValue
        });
        this._nextQ = this.q.clone();
        this._lastClk = 0;
    }

    /**
     * Phase 1 of simulation cycle: Sample inputs and evaluate next state.
     * @param {Object} inputs
     * @param {VectorSignal} inputs.d - Data input vector
     * @param {number|boolean} [inputs.rst=0] - Synchronous reset (active high)
     * @param {number|boolean} [inputs.en=1] - Clock enable (active high)
     * @param {number} [inputs.clk=1] - Clock signal level (0 or 1)
     */
    sample({ d, rst = 0, en = 1, clk = 1 }) {
        const isRisingEdge = (this._lastClk === 0 && (clk ? 1 : 0) === 1);
        this._lastClk = clk ? 1 : 0;

        if (!isRisingEdge) {
            // No posedge: retain current state
            this._nextQ = this.q.clone();
            return;
        }

        const isRst = Boolean(rst);
        const isEn = Boolean(en);

        if (isRst) {
            this._nextQ = new VectorSignal({
                name: `${this.name}_q`,
                width: this.width,
                value: this.resetValue
            });
        } else if (isEn) {
            VectorOps.checkWidthMatch(d, this.q, `Register '${this.name}' input D`);
            this._nextQ = d.clone(`${this.name}_q`);
        } else {
            // Retention
            this._nextQ = this.q.clone();
        }
    }

    /**
     * Phase 2 of simulation cycle: Commit next state to current state Q.
     */
    commit() {
        this.q = this._nextQ.clone();
        return this.q;
    }

    /**
     * Convenience method for a single clock step (samples and commits immediately).
     */
    step({ d, rst = 0, en = 1, clkEdge = true }) {
        const isRst = Boolean(rst);
        const isEn = Boolean(en);

        if (!clkEdge) {
            return this.q;
        }

        if (isRst) {
            this.q = new VectorSignal({
                name: `${this.name}_q`,
                width: this.width,
                value: this.resetValue
            });
        } else if (isEn) {
            if (d instanceof VectorSignal) {
                VectorOps.checkWidthMatch(d, this.q, `Register '${this.name}' input D`);
                this.q = d.clone(`${this.name}_q`);
            } else {
                this.q.setValue(d);
            }
        }
        return this.q;
    }
}

/**
 * Sequential Simulation Engine
 * Manages multiple registers in a datapath or pipeline, ensuring simultaneous nonblocking updates.
 */
export class SequentialSimulationEngine {
    constructor() {
        this.registers = new Map();
        this.history = [];
        this.currentCycle = 0;
    }

    /**
     * Register a MultiBitRegister instance.
     */
    addRegister(reg) {
        this.registers.set(reg.name, reg);
        return reg;
    }

    /**
     * Execute a synchronized clock cycle across all registers.
     * Evaluates all D inputs in parallel before updating any state Q.
     * @param {Object.<string, { d: VectorSignal, rst?: boolean|number, en?: boolean|number }>} inputMap
     */
    clockCycle(inputMap = {}) {
        // Phase 1: Sample all sequential inputs simultaneously
        for (const [name, reg] of this.registers.entries()) {
            const inp = inputMap[name] || { d: reg.q, rst: 0, en: 1 };
            reg.sample({
                d: inp.d,
                rst: inp.rst ?? 0,
                en: inp.en ?? 1,
                clk: 1 // Trigger rising edge
            });
            // Reset clk edge tracker back to 0 for next cycle
            reg._lastClk = 0;
        }

        // Phase 2: Commit all registers simultaneously
        const snapshot = { cycle: this.currentCycle };
        for (const [name, reg] of this.registers.entries()) {
            reg.commit();
            snapshot[name] = reg.q.clone();
        }

        this.history.push(snapshot);
        this.currentCycle++;
        return snapshot;
    }

    /**
     * Reset all registered sequential elements.
     */
    resetAll() {
        for (const reg of this.registers.values()) {
            reg.reset();
        }
        this.history = [];
        this.currentCycle = 0;
    }
}
