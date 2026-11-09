/**
 * counter_engine.js — Binary Counters and Universal Shift Registers
 * 
 * Part of PD Playground: Advanced RTL Lab
 * 
 * Pure JavaScript ES Module with ZERO DOM dependencies.
 * Implements:
 * - BinaryCounter (Up/Down, configurable Modulo-N, Enable, Synchronous Reset, Terminal Count)
 * - UniversalShiftRegister (SISO, SIPO, PISO, PIPO modes, bidirectional shift)
 */

import { VectorSignal, VectorOps } from './vector_model.js';

export class BinaryCounter {
    /**
     * @param {Object} options
     * @param {number} [options.width=4] - Counter bus width (1 to 16)
     * @param {number} [options.modulo=null] - Modulus (defaults to 2^width)
     * @param {number} [options.initialValue=0] - Starting count
     * @param {string} [options.name='counter'] - Instance identifier
     */
    constructor({ width = 4, modulo = null, initialValue = 0, name = 'counter' } = {}) {
        if (!Number.isInteger(width) || width < 1 || width > 64) {
            throw new RangeError(`Counter width must be 1 to 64, got ${width}`);
        }
        this.width = width;
        this.name = name;
        this.maxVal = (1n << BigInt(width)) - 1n;
        this.modulo = modulo ? BigInt(modulo) : (1n << BigInt(width));
        if (this.modulo > (1n << BigInt(width))) {
            throw new RangeError(`Modulo ${this.modulo} exceeds maximum representable value for width ${width}`);
        }

        this.count = new VectorSignal({
            name: `${name}_count`,
            width: this.width,
            value: BigInt(initialValue) % this.modulo
        });
        this.terminalCount = 0;
        this._updateTerminalCount();
    }

    _updateTerminalCount() {
        this.terminalCount = (this.count.valueBigInt === (this.modulo - 1n)) ? 1 : 0;
    }

    /**
     * Resets counter to 0.
     */
    reset() {
        this.count.setValue(0n);
        this._updateTerminalCount();
        return this.count;
    }

    /**
     * Clock edge transition.
     * @param {Object} inputs
     * @param {boolean|number} [inputs.rst=0] - Synchronous reset
     * @param {boolean|number} [inputs.en=1] - Clock enable
     * @param {boolean|number} [inputs.up=1] - Direction (1=up, 0=down)
     */
    step({ rst = 0, en = 1, up = 1 } = {}) {
        const isRst = Boolean(rst);
        const isEn = Boolean(en);
        const isUp = Boolean(up);

        if (isRst) {
            this.count.setValue(0n);
        } else if (isEn) {
            let nextVal;
            if (isUp) {
                // Increment with modulo rollover
                if (this.count.valueBigInt >= (this.modulo - 1n)) {
                    nextVal = 0n;
                } else {
                    nextVal = this.count.valueBigInt + 1n;
                }
            } else {
                // Decrement with modulo underflow
                if (this.count.valueBigInt === 0n) {
                    nextVal = this.modulo - 1n;
                } else {
                    nextVal = this.count.valueBigInt - 1n;
                }
            }
            this.count.setValue(nextVal);
        }

        this._updateTerminalCount();
        return {
            count: this.count.clone(),
            terminalCount: this.terminalCount,
            rollover: isEn && !isRst && (
                (isUp && this.count.valueBigInt === 0n) ||
                (!isUp && this.count.valueBigInt === (this.modulo - 1n))
            )
        };
    }
}

/**
 * Universal 4-Bit / N-Bit Shift Register
 * Supports HOLD, SHIFT_RIGHT, SHIFT_LEFT, PARALLEL_LOAD.
 */
export class UniversalShiftRegister {
    static MODE_HOLD  = 0;
    static MODE_SHR   = 1;
    static MODE_SHL   = 2;
    static MODE_LOAD  = 3;

    /**
     * @param {Object} options
     * @param {number} [options.width=4] - Register depth
     * @param {number} [options.initialValue=0] - Initial contents
     * @param {string} [options.name='shift_reg']
     */
    constructor({ width = 4, initialValue = 0, name = 'shift_reg' } = {}) {
        if (!Number.isInteger(width) || width < 1 || width > 64) {
            throw new RangeError(`Shift register width must be 1 to 64, got ${width}`);
        }
        this.width = width;
        this.name = name;
        this.q = new VectorSignal({
            name: `${name}_q`,
            width: this.width,
            value: initialValue
        });
    }

    reset() {
        this.q.setValue(0n);
        return this.q;
    }

    /**
     * Execute clock step.
     * @param {Object} inputs
     * @param {number} inputs.mode - 0=HOLD, 1=SHR, 2=SHL, 3=LOAD
     * @param {number} [inputs.sin_msb=0] - Serial bit in from MSB (for shift right)
     * @param {number} [inputs.sin_lsb=0] - Serial bit in from LSB (for shift left)
     * @param {VectorSignal|number} [inputs.parallel_d=0] - Parallel load data
     * @param {boolean|number} [inputs.rst=0] - Synchronous reset
     */
    step({ mode = UniversalShiftRegister.MODE_HOLD, sin_msb = 0, sin_lsb = 0, parallel_d = 0, rst = 0 } = {}) {
        if (rst) {
            this.q.setValue(0n);
            return this._buildStatus();
        }

        switch (mode) {
            case UniversalShiftRegister.MODE_HOLD:
                // No change
                break;

            case UniversalShiftRegister.MODE_SHR: {
                // Shift right: Q[i] <= Q[i+1], Q[W-1] <= sin_msb
                const sIn = BigInt(sin_msb ? 1 : 0);
                const nextVal = (this.q.valueBigInt >> 1n) | (sIn << BigInt(this.width - 1));
                this.q.setValue(nextVal);
                break;
            }

            case UniversalShiftRegister.MODE_SHL: {
                // Shift left: Q[i] <= Q[i-1], Q[0] <= sin_lsb
                const sIn = BigInt(sin_lsb ? 1 : 0);
                const nextVal = ((this.q.valueBigInt << 1n) & this.q.mask) | sIn;
                this.q.setValue(nextVal);
                break;
            }

            case UniversalShiftRegister.MODE_LOAD: {
                if (parallel_d instanceof VectorSignal) {
                    VectorOps.checkWidthMatch(parallel_d, this.q, 'Shift Register Load');
                    this.q.setValue(parallel_d.valueBigInt);
                } else {
                    this.q.setValue(parallel_d);
                }
                break;
            }

            default:
                throw new Error(`Invalid shift register mode: ${mode}`);
        }

        return this._buildStatus();
    }

    _buildStatus() {
        return {
            q: this.q.clone(),
            sout_lsb: this.q.getBit(0),
            sout_msb: this.q.getBit(this.width - 1),
            bits: this.q.toBitArray()
        };
    }
}
