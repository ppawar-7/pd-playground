/**
 * vector_model.js — Multi-Bit Signal Representation and Vector Operations Engine
 * 
 * Part of PD Playground: Advanced RTL Lab
 * 
 * Pure JavaScript ES Module with ZERO DOM dependencies.
 * Provides unsigned/signed binary vectors with configurable widths (1 to 16+ bits),
 * width mismatch validation, bit slicing, concatenation, and bitwise/arithmetic operations.
 */

export class WidthMismatchError extends Error {
    constructor(operation, widthA, widthB, details = '') {
        const msg = `Width mismatch in '${operation}': operand A has width ${widthA}, but operand B has width ${widthB}. ` +
                    `In digital VLSI design, implicit bus resizing can conceal truncation or overflow errors. ` +
                    `Use explicit bit-slicing or zero/sign-extension to reconcile bus widths.` +
                    (details ? ` (${details})` : '');
        super(msg);
        this.name = 'WidthMismatchError';
        this.operation = operation;
        this.widthA = widthA;
        this.widthB = widthB;
    }
}

export class VectorSignal {
    /**
     * @param {Object} options
     * @param {string} options.name - Signal identifier
     * @param {number} [options.width=4] - Bus width in bits (1 to 64)
     * @param {number|bigint|string|null} [options.value=0] - Initial value
     * @param {boolean} [options.isValid=true] - Whether signal is resolved (false represents high-Z / 'X')
     * @param {string|null} [options.source=null] - Driving port/node ID
     * @param {string[]} [options.destinations=[]] - Consuming port/node IDs
     * @param {Object} [options.metadata={}] - Educational notes, radix preferences, etc.
     */
    constructor({
        name = 'sig',
        width = 4,
        value = 0,
        isValid = true,
        source = null,
        destinations = [],
        metadata = {}
    } = {}) {
        if (!Number.isInteger(width) || width < 1 || width > 64) {
            throw new RangeError(`VectorSignal width must be an integer between 1 and 64, received: ${width}`);
        }
        this.name = name;
        this.width = width;
        this.source = source;
        this.destinations = Array.isArray(destinations) ? [...destinations] : [];
        this.metadata = { ...metadata };

        if (value === null || value === undefined || !isValid) {
            this.isValid = false;
            this._rawVal = 0n;
        } else {
            this.isValid = true;
            this._rawVal = this._normalizeValue(value);
        }
    }

    /**
     * Bitmask covering exactly `width` bits: (2^width - 1).
     * @returns {bigint}
     */
    get mask() {
        return (1n << BigInt(this.width)) - 1n;
    }

    /**
     * Normalizes an incoming value (number, bigint, binary string, or hex string) to unsigned bigint clamped to width.
     * @private
     */
    _normalizeValue(val) {
        let bVal;
        if (typeof val === 'bigint') {
            bVal = val;
        } else if (typeof val === 'number') {
            if (!Number.isFinite(val)) return 0n;
            bVal = BigInt(Math.trunc(val));
        } else if (typeof val === 'string') {
            const clean = val.trim().toLowerCase();
            if (clean.startsWith('0b')) {
                bVal = BigInt(clean);
            } else if (clean.startsWith('0x')) {
                bVal = BigInt(clean);
            } else if (/^[01]+$/.test(clean)) {
                bVal = BigInt('0b' + clean);
            } else {
                bVal = BigInt(clean);
            }
        } else if (typeof val === 'boolean') {
            bVal = val ? 1n : 0n;
        } else {
            bVal = 0n;
        }

        // Handle negative numbers via 2's complement masking
        if (bVal < 0n) {
            bVal = (bVal & this.mask);
        } else {
            bVal = bVal & this.mask;
        }
        return bVal;
    }

    /**
     * Unsigned value as BigInt.
     */
    get valueBigInt() {
        return this.isValid ? this._rawVal : null;
    }

    /**
     * Unsigned value as Number (safe for width <= 53).
     */
    get value() {
        return this.isValid ? Number(this._rawVal) : null;
    }

    /**
     * Set a new value, automatically masked to this signal's width.
     */
    setValue(val) {
        if (val === null || val === undefined) {
            this.isValid = false;
            this._rawVal = 0n;
        } else {
            this.isValid = true;
            this._rawVal = this._normalizeValue(val);
        }
        return this;
    }

    /**
     * Read a single bit at index (0 is LSB, width-1 is MSB).
     * @param {number} bitIndex
     * @returns {number|null} 0, 1, or null if unresolved
     */
    getBit(bitIndex) {
        if (!this.isValid) return null;
        if (bitIndex < 0 || bitIndex >= this.width) {
            throw new RangeError(`Bit index ${bitIndex} out of range for width ${this.width} [${this.width - 1}:0]`);
        }
        return Number((this._rawVal >> BigInt(bitIndex)) & 1n);
    }

    /**
     * Returns a new VectorSignal with a single bit modified.
     * @param {number} bitIndex
     * @param {number|boolean} bitVal
     * @returns {VectorSignal}
     */
    withBit(bitIndex, bitVal) {
        if (bitIndex < 0 || bitIndex >= this.width) {
            throw new RangeError(`Bit index ${bitIndex} out of range for width ${this.width}`);
        }
        const b = bitVal ? 1n : 0n;
        const current = this.isValid ? this._rawVal : 0n;
        const bitMask = 1n << BigInt(bitIndex);
        const nextVal = (current & ~bitMask) | (b << BigInt(bitIndex));
        return new VectorSignal({
            name: `${this.name}_mod`,
            width: this.width,
            value: nextVal,
            isValid: true,
            metadata: { ...this.metadata }
        });
    }

    /**
     * Format as a zero-padded binary string, e.g. "0110".
     * If unresolved, returns "X" repeated for width.
     */
    toBinaryString() {
        if (!this.isValid) return 'X'.repeat(this.width);
        return this._rawVal.toString(2).padStart(this.width, '0');
    }

    /**
     * Format as Verilog vector literal, e.g. "4'b1010" or "4'bxxxx".
     */
    toVerilogString(radix = 'bin') {
        if (!this.isValid) {
            return `${this.width}'b${'x'.repeat(this.width)}`;
        }
        if (radix === 'hex') {
            const hexChars = Math.ceil(this.width / 4);
            return `${this.width}'h${this._rawVal.toString(16).toUpperCase().padStart(hexChars, '0')}`;
        }
        if (radix === 'dec') {
            return `${this.width}'d${this._rawVal.toString(10)}`;
        }
        return `${this.width}'b${this.toBinaryString()}`;
    }

    /**
     * Format as hexadecimal string, e.g. "0xA".
     */
    toHexString() {
        if (!this.isValid) return '0x' + 'X'.repeat(Math.ceil(this.width / 4));
        const hexChars = Math.ceil(this.width / 4);
        return '0x' + this._rawVal.toString(16).toUpperCase().padStart(hexChars, '0');
    }

    /**
     * Return unsigned decimal number representation.
     */
    toUnsignedDecimal() {
        return this.isValid ? Number(this._rawVal) : null;
    }

    /**
     * Return 2's complement signed decimal representation.
     * For example, in 4-bit, 0b1111 (15) is -1, 0b1000 (8) is -8.
     */
    toSignedDecimal() {
        if (!this.isValid) return null;
        const msbMask = 1n << BigInt(this.width - 1);
        const hasSign = (this._rawVal & msbMask) !== 0n;
        if (!hasSign) {
            return Number(this._rawVal);
        }
        // Negative in 2's complement: value - 2^width
        const fullRange = 1n << BigInt(this.width);
        return Number(this._rawVal - fullRange);
    }

    /**
     * Return array of individual bit values from LSB (index 0) to MSB (index width-1).
     */
    toBitArray() {
        if (!this.isValid) return new Array(this.width).fill(null);
        const bits = [];
        for (let i = 0; i < this.width; i++) {
            bits.push(Number((this._rawVal >> BigInt(i)) & 1n));
        }
        return bits;
    }

    /**
     * Creates an independent copy of this signal.
     */
    clone(newName = null) {
        return new VectorSignal({
            name: newName ?? this.name,
            width: this.width,
            value: this.isValid ? this._rawVal : null,
            isValid: this.isValid,
            source: this.source,
            destinations: [...this.destinations],
            metadata: { ...this.metadata }
        });
    }
}

/**
 * Vector Operations Engine
 * Performs width-checked bitwise, arithmetic, relational, shifting, slicing, and multiplexing operations.
 */
export class VectorOps {
    /**
     * Assert two signals have equal widths.
     * @throws {WidthMismatchError}
     */
    static checkWidthMatch(a, b, opName) {
        if (a.width !== b.width) {
            throw new WidthMismatchError(opName, a.width, b.width);
        }
    }

    /**
     * Check if either operand is unresolved.
     */
    static checkValidity(a, b) {
        return a.isValid && (b === undefined || b.isValid);
    }

    // ==========================================
    // BITWISE OPERATIONS
    // ==========================================

    static bitwiseAnd(a, b, resultName = 'and_out') {
        this.checkWidthMatch(a, b, 'Bitwise AND');
        if (!this.checkValidity(a, b)) {
            return new VectorSignal({ name: resultName, width: a.width, isValid: false });
        }
        return new VectorSignal({
            name: resultName,
            width: a.width,
            value: a.valueBigInt & b.valueBigInt
        });
    }

    static bitwiseOr(a, b, resultName = 'or_out') {
        this.checkWidthMatch(a, b, 'Bitwise OR');
        if (!this.checkValidity(a, b)) {
            return new VectorSignal({ name: resultName, width: a.width, isValid: false });
        }
        return new VectorSignal({
            name: resultName,
            width: a.width,
            value: a.valueBigInt | b.valueBigInt
        });
    }

    static bitwiseXor(a, b, resultName = 'xor_out') {
        this.checkWidthMatch(a, b, 'Bitwise XOR');
        if (!this.checkValidity(a, b)) {
            return new VectorSignal({ name: resultName, width: a.width, isValid: false });
        }
        return new VectorSignal({
            name: resultName,
            width: a.width,
            value: a.valueBigInt ^ b.valueBigInt
        });
    }

    static bitwiseNot(a, resultName = 'not_out') {
        if (!a.isValid) {
            return new VectorSignal({ name: resultName, width: a.width, isValid: false });
        }
        return new VectorSignal({
            name: resultName,
            width: a.width,
            value: ~a.valueBigInt & a.mask
        });
    }

    static bitwiseNand(a, b, resultName = 'nand_out') {
        this.checkWidthMatch(a, b, 'Bitwise NAND');
        if (!this.checkValidity(a, b)) {
            return new VectorSignal({ name: resultName, width: a.width, isValid: false });
        }
        return new VectorSignal({
            name: resultName,
            width: a.width,
            value: ~(a.valueBigInt & b.valueBigInt) & a.mask
        });
    }

    static bitwiseNor(a, b, resultName = 'nor_out') {
        this.checkWidthMatch(a, b, 'Bitwise NOR');
        if (!this.checkValidity(a, b)) {
            return new VectorSignal({ name: resultName, width: a.width, isValid: false });
        }
        return new VectorSignal({
            name: resultName,
            width: a.width,
            value: ~(a.valueBigInt | b.valueBigInt) & a.mask
        });
    }

    static bitwiseXnor(a, b, resultName = 'xnor_out') {
        this.checkWidthMatch(a, b, 'Bitwise XNOR');
        if (!this.checkValidity(a, b)) {
            return new VectorSignal({ name: resultName, width: a.width, isValid: false });
        }
        return new VectorSignal({
            name: resultName,
            width: a.width,
            value: ~(a.valueBigInt ^ b.valueBigInt) & a.mask
        });
    }

    // ==========================================
    // ARITHMETIC OPERATIONS
    // ==========================================

    /**
     * Unsigned addition of two vector signals with optional carry-in.
     * @param {VectorSignal} a
     * @param {VectorSignal} b
     * @param {number|bigint} [cin=0] - Carry in
     * @param {boolean} [extendWidth=false] - If true, result width is a.width + 1. Otherwise a.width with modulo truncation.
     * @returns {{ result: VectorSignal, carryOut: number, overflowSigned: boolean }}
     */
    static add(a, b, cin = 0, extendWidth = false, resultName = 'sum_out') {
        this.checkWidthMatch(a, b, 'Addition');
        const cInBig = BigInt(cin ? 1 : 0);
        if (!this.checkValidity(a, b)) {
            const outWidth = extendWidth ? a.width + 1 : a.width;
            return {
                result: new VectorSignal({ name: resultName, width: outWidth, isValid: false }),
                carryOut: null,
                overflowSigned: null
            };
        }

        const rawSum = a.valueBigInt + b.valueBigInt + cInBig;
        const outWidth = extendWidth ? a.width + 1 : a.width;
        const truncatedVal = rawSum & ((1n << BigInt(outWidth)) - 1n);

        // Carry out (unsigned overflow from W-bit stage)
        const carryOut = Number((rawSum >> BigInt(a.width)) & 1n);

        // 2's complement signed overflow: (a[msb] == b[msb]) && (sum[msb] != a[msb])
        const aMsb = (a.valueBigInt >> BigInt(a.width - 1)) & 1n;
        const bMsb = (b.valueBigInt >> BigInt(a.width - 1)) & 1n;
        const sumMsb = (rawSum >> BigInt(a.width - 1)) & 1n;
        const overflowSigned = (aMsb === bMsb) && (sumMsb !== aMsb);

        return {
            result: new VectorSignal({
                name: resultName,
                width: outWidth,
                value: truncatedVal
            }),
            carryOut,
            overflowSigned
        };
    }

    /**
     * Unsigned subtraction (a - b - bin).
     * @param {VectorSignal} a
     * @param {VectorSignal} b
     * @param {number|bigint} [bin=0] - Borrow in
     * @returns {{ result: VectorSignal, borrowOut: number, overflowSigned: boolean }}
     */
    static sub(a, b, bin = 0, resultName = 'diff_out') {
        this.checkWidthMatch(a, b, 'Subtraction');
        const bInBig = BigInt(bin ? 1 : 0);
        if (!this.checkValidity(a, b)) {
            return {
                result: new VectorSignal({ name: resultName, width: a.width, isValid: false }),
                borrowOut: null,
                overflowSigned: null
            };
        }

        const totalB = b.valueBigInt + bInBig;
        const borrowOut = a.valueBigInt < totalB ? 1 : 0;
        const rawDiff = a.valueBigInt - totalB;
        // Truncate in 2's complement modulo 2^W
        const truncatedVal = rawDiff & a.mask;

        // 2's complement signed overflow: (a[msb] != b[msb]) && (diff[msb] != a[msb])
        const aMsb = (a.valueBigInt >> BigInt(a.width - 1)) & 1n;
        const bMsb = (b.valueBigInt >> BigInt(a.width - 1)) & 1n;
        const diffMsb = (truncatedVal >> BigInt(a.width - 1)) & 1n;
        const overflowSigned = (aMsb !== bMsb) && (diffMsb !== aMsb);

        return {
            result: new VectorSignal({
                name: resultName,
                width: a.width,
                value: truncatedVal
            }),
            borrowOut,
            overflowSigned
        };
    }

    // ==========================================
    // COMPARISON OPERATIONS (Produces 1-bit VectorSignal)
    // ==========================================

    static eq(a, b, resultName = 'eq_out') {
        this.checkWidthMatch(a, b, 'Equality (==)');
        if (!this.checkValidity(a, b)) return new VectorSignal({ name: resultName, width: 1, isValid: false });
        return new VectorSignal({
            name: resultName,
            width: 1,
            value: a.valueBigInt === b.valueBigInt ? 1 : 0
        });
    }

    static neq(a, b, resultName = 'neq_out') {
        this.checkWidthMatch(a, b, 'Inequality (!=)');
        if (!this.checkValidity(a, b)) return new VectorSignal({ name: resultName, width: 1, isValid: false });
        return new VectorSignal({
            name: resultName,
            width: 1,
            value: a.valueBigInt !== b.valueBigInt ? 1 : 0
        });
    }

    static lt(a, b, resultName = 'lt_out') {
        this.checkWidthMatch(a, b, 'Less-than (<)');
        if (!this.checkValidity(a, b)) return new VectorSignal({ name: resultName, width: 1, isValid: false });
        return new VectorSignal({
            name: resultName,
            width: 1,
            value: a.valueBigInt < b.valueBigInt ? 1 : 0
        });
    }

    static lte(a, b, resultName = 'lte_out') {
        this.checkWidthMatch(a, b, 'Less-than-or-equal (<=)');
        if (!this.checkValidity(a, b)) return new VectorSignal({ name: resultName, width: 1, isValid: false });
        return new VectorSignal({
            name: resultName,
            width: 1,
            value: a.valueBigInt <= b.valueBigInt ? 1 : 0
        });
    }

    static gt(a, b, resultName = 'gt_out') {
        this.checkWidthMatch(a, b, 'Greater-than (>)');
        if (!this.checkValidity(a, b)) return new VectorSignal({ name: resultName, width: 1, isValid: false });
        return new VectorSignal({
            name: resultName,
            width: 1,
            value: a.valueBigInt > b.valueBigInt ? 1 : 0
        });
    }

    static gte(a, b, resultName = 'gte_out') {
        this.checkWidthMatch(a, b, 'Greater-than-or-equal (>=)');
        if (!this.checkValidity(a, b)) return new VectorSignal({ name: resultName, width: 1, isValid: false });
        return new VectorSignal({
            name: resultName,
            width: 1,
            value: a.valueBigInt >= b.valueBigInt ? 1 : 0
        });
    }

    // ==========================================
    // SHIFT OPERATIONS
    // ==========================================

    /**
     * Logical Shift Left (zeros shifted into LSB).
     */
    static shl(a, shiftAmount, resultName = 'shl_out') {
        if (!a.isValid) return new VectorSignal({ name: resultName, width: a.width, isValid: false });
        const sh = BigInt(Math.max(0, shiftAmount));
        if (sh >= BigInt(a.width)) {
            return new VectorSignal({ name: resultName, width: a.width, value: 0n });
        }
        const val = (a.valueBigInt << sh) & a.mask;
        return new VectorSignal({ name: resultName, width: a.width, value: val });
    }

    /**
     * Logical Shift Right (zeros shifted into MSB).
     */
    static shr(a, shiftAmount, resultName = 'shr_out') {
        if (!a.isValid) return new VectorSignal({ name: resultName, width: a.width, isValid: false });
        const sh = BigInt(Math.max(0, shiftAmount));
        if (sh >= BigInt(a.width)) {
            return new VectorSignal({ name: resultName, width: a.width, value: 0n });
        }
        const val = a.valueBigInt >> sh;
        return new VectorSignal({ name: resultName, width: a.width, value: val });
    }

    /**
     * Arithmetic Shift Right (sign bit replicated into MSB).
     */
    static sar(a, shiftAmount, resultName = 'sar_out') {
        if (!a.isValid) return new VectorSignal({ name: resultName, width: a.width, isValid: false });
        const sh = BigInt(Math.max(0, shiftAmount));
        const msb = (a.valueBigInt >> BigInt(a.width - 1)) & 1n;
        if (sh >= BigInt(a.width)) {
            return new VectorSignal({
                name: resultName,
                width: a.width,
                value: msb ? a.mask : 0n
            });
        }
        let val = a.valueBigInt >> sh;
        if (msb === 1n) {
            // Fill high bits with 1s
            const signFill = ((1n << sh) - 1n) << BigInt(a.width - Number(sh));
            val = val | signFill;
        }
        return new VectorSignal({ name: resultName, width: a.width, value: val });
    }

    // ==========================================
    // CONCATENATION & SLICING
    // ==========================================

    /**
     * Bit Concatenation: {a, b}.
     * Vector a forms higher bits, vector b forms lower bits.
     * Result width = a.width + b.width.
     */
    static concat(a, b, resultName = 'concat_out') {
        const outWidth = a.width + b.width;
        if (!this.checkValidity(a, b)) {
            return new VectorSignal({ name: resultName, width: outWidth, isValid: false });
        }
        const combined = (a.valueBigInt << BigInt(b.width)) | b.valueBigInt;
        return new VectorSignal({
            name: resultName,
            width: outWidth,
            value: combined
        });
    }

    /**
     * Bit Slicing: a[msb:lsb].
     * @param {VectorSignal} a
     * @param {number} msb - Higher index (inclusive)
     * @param {number} lsb - Lower index (inclusive)
     */
    static slice(a, msb, lsb, resultName = 'slice_out') {
        if (!Number.isInteger(msb) || !Number.isInteger(lsb)) {
            throw new TypeError(`Slice indices must be integers. Received msb=${msb}, lsb=${lsb}`);
        }
        if (lsb < 0 || msb >= a.width || msb < lsb) {
            throw new RangeError(
                `Invalid slice indices [${msb}:${lsb}] for signal of width ${a.width} [${a.width - 1}:0]. ` +
                `Must satisfy 0 <= lsb <= msb < width.`
            );
        }
        const sliceWidth = msb - lsb + 1;
        if (!a.isValid) {
            return new VectorSignal({ name: resultName, width: sliceWidth, isValid: false });
        }
        const sliceMask = (1n << BigInt(sliceWidth)) - 1n;
        const val = (a.valueBigInt >> BigInt(lsb)) & sliceMask;
        return new VectorSignal({
            name: resultName,
            width: sliceWidth,
            value: val
        });
    }

    // ==========================================
    // MULTIPLEXING
    // ==========================================

    /**
     * 2:1 Vector Multiplexer: sel ? b : a.
     * Inputs a and b must have identical widths.
     * sel must be a 1-bit VectorSignal or boolean.
     */
    static mux(sel, a, b, resultName = 'mux_out') {
        this.checkWidthMatch(a, b, 'Multiplexer');
        let selBit;
        if (typeof sel === 'boolean') {
            selBit = sel ? 1 : 0;
        } else if (sel instanceof VectorSignal) {
            if (sel.width !== 1) {
                throw new WidthMismatchError('2:1 Multiplexer Select', 1, sel.width, 'Selector must be a 1-bit signal');
            }
            if (!sel.isValid) {
                return new VectorSignal({ name: resultName, width: a.width, isValid: false });
            }
            selBit = sel.value;
        } else {
            selBit = Number(sel) ? 1 : 0;
        }

        const selected = selBit === 1 ? b : a;
        return selected.clone(resultName);
    }
}
