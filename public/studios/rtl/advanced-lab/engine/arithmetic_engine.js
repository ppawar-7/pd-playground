/**
 * arithmetic_engine.js — Educational Arithmetic and Datapath Engine
 * 
 * Part of PD Playground: Advanced RTL Lab
 * 
 * Pure JavaScript ES Module with ZERO DOM dependencies.
 * Provides:
 * 1. HalfAdder & FullAdder with step-by-step carry generation breakdown.
 * 2. Multi-bit RippleCarryAdder with stage-by-stage carry propagation trace.
 * 3. EducationalALU with mathematical status flags (Zero, Carry, Overflow, Negative).
 */

import { VectorSignal, VectorOps } from './vector_model.js';

/**
 * 1-Bit Half Adder
 */
export class HalfAdder {
    /**
     * @param {number|boolean} a - Input A (0 or 1)
     * @param {number|boolean} b - Input B (0 or 1)
     */
    static compute(a, b) {
        const bitA = a ? 1 : 0;
        const bitB = b ? 1 : 0;
        const sum = bitA ^ bitB;
        const carry = bitA & bitB;

        let explanation = '';
        if (bitA === 1 && bitB === 1) {
            explanation = 'Both A and B are 1: SUM is 0 (1+1=2), CARRY is 1.';
        } else if (bitA === 1 || bitB === 1) {
            explanation = 'Only one input is 1: SUM is 1, CARRY is 0.';
        } else {
            explanation = 'Both inputs are 0: SUM is 0, CARRY is 0.';
        }

        return {
            sum,
            carry,
            explanation
        };
    }
}

/**
 * 1-Bit Full Adder
 */
export class FullAdder {
    /**
     * @param {number|boolean} a - Input A (0 or 1)
     * @param {number|boolean} b - Input B (0 or 1)
     * @param {number|boolean} cin - Carry In (0 or 1)
     */
    static compute(a, b, cin = 0) {
        const bitA = a ? 1 : 0;
        const bitB = b ? 1 : 0;
        const bitCin = cin ? 1 : 0;

        // Carry propagate (P) and Carry generate (G)
        const p = bitA ^ bitB;
        const g = bitA & bitB;

        const sum = p ^ bitCin;
        const cout = g | (p & bitCin);

        let carryReason = '';
        if (g === 1) {
            carryReason = 'Carry Generated locally (both A and B are 1).';
        } else if (p === 1 && bitCin === 1) {
            carryReason = 'Carry Propagated from stage below (A^B=1 and Cin=1).';
        } else {
            carryReason = 'No carry generated or propagated.';
        }

        return {
            a: bitA,
            b: bitB,
            cin: bitCin,
            p,
            g,
            sum,
            cout,
            carryReason
        };
    }
}

/**
 * Configurable Ripple-Carry Adder
 */
export class RippleCarryAdder {
    /**
     * @param {number} [width=4] - Data bus width in bits
     */
    constructor(width = 4) {
        if (!Number.isInteger(width) || width < 1 || width > 64) {
            throw new RangeError(`RippleCarryAdder width must be 1 to 64, got ${width}`);
        }
        this.width = width;
    }

    /**
     * Executes the ripple-carry addition step-by-step.
     * @param {VectorSignal} a
     * @param {VectorSignal} b
     * @param {number} [cin=0]
     * @returns {{
     *   sum: VectorSignal,
     *   carryOut: number,
     *   extendedSum: VectorSignal,
     *   stages: Array<{ stage: number, a: number, b: number, cin: number, p: number, g: number, sum: number, cout: number, carryReason: string }>,
     *   criticalPathStages: number,
     *   overflowSigned: boolean
     * }}
     */
    compute(a, b, cin = 0) {
        VectorOps.checkWidthMatch(a, b, 'Ripple-Carry Adder');
        if (a.width !== this.width) {
            throw new RangeError(`Operand width ${a.width} does not match RippleCarryAdder width ${this.width}`);
        }

        const stages = [];
        let currentCarry = cin ? 1 : 0;
        let sumBits = 0n;

        for (let i = 0; i < this.width; i++) {
            const bitA = a.getBit(i);
            const bitB = b.getBit(i);
            const fa = FullAdder.compute(bitA, bitB, currentCarry);

            stages.push({
                stage: i,
                a: bitA,
                b: bitB,
                cin: currentCarry,
                p: fa.p,
                g: fa.g,
                sum: fa.sum,
                cout: fa.cout,
                carryReason: fa.carryReason
            });

            if (fa.sum === 1) {
                sumBits |= (1n << BigInt(i));
            }
            currentCarry = fa.cout;
        }

        const sumSig = new VectorSignal({
            name: 'rca_sum',
            width: this.width,
            value: sumBits
        });

        const extendedVal = sumBits | (BigInt(currentCarry) << BigInt(this.width));
        const extSig = new VectorSignal({
            name: 'rca_ext_sum',
            width: this.width + 1,
            value: extendedVal
        });

        // Signed 2's complement overflow
        const aMsb = a.getBit(this.width - 1);
        const bMsb = b.getBit(this.width - 1);
        const sumMsb = sumSig.getBit(this.width - 1);
        const overflowSigned = (aMsb === bMsb) && (sumMsb !== aMsb);

        return {
            sum: sumSig,
            carryOut: currentCarry,
            extendedSum: extSig,
            stages,
            criticalPathStages: this.width,
            overflowSigned
        };
    }
}

/**
 * Educational Arithmetic Logic Unit (ALU)
 * 
 * Supports:
 * - ADD:  A + B
 * - SUB:  A - B
 * - AND:  A & B
 * - OR:   A | B
 * - XOR:  A ^ B
 * - NOT:  ~A
 * - SHL:  A << 1
 * - SHR:  A >> 1
 * - PASSA: A
 * - PASSB: B
 * 
 * Status Flags:
 * - Z (Zero Flag): Result is 0
 * - C (Carry Flag): Unsigned overflow for ADD, Borrow for SUB
 * - V (Overflow Flag): Signed 2's complement overflow
 * - N (Negative Flag): MSB of result is 1
 */
export class EducationalALU {
    static OP_ADD   = 0b0000;
    static OP_SUB   = 0b0001;
    static OP_AND   = 0b0010;
    static OP_OR    = 0b0011;
    static OP_XOR   = 0b0100;
    static OP_NOT   = 0b0101;
    static OP_SHL   = 0b0110;
    static OP_SHR   = 0b0111;
    static OP_PASSA = 0b1000;
    static OP_PASSB = 0b1001;

    static OP_NAMES = {
        0: 'ADD',
        1: 'SUB',
        2: 'AND',
        3: 'OR',
        4: 'XOR',
        5: 'NOT',
        6: 'SHL',
        7: 'SHR',
        8: 'PASSA',
        9: 'PASSB'
    };

    /**
     * @param {number} [width=4]
     */
    constructor(width = 4) {
        if (!Number.isInteger(width) || width < 1 || width > 64) {
            throw new RangeError(`ALU width must be 1 to 64, got ${width}`);
        }
        this.width = width;
    }

    /**
     * Execute ALU operation.
     * @param {number|string} opcode - ALU opcode (numeric or string name)
     * @param {VectorSignal} a - Operand A
     * @param {VectorSignal} b - Operand B
     * @param {number} [cin=0] - Carry In
     */
    execute(opcode, a, b, cin = 0) {
        let op = opcode;
        if (typeof op === 'string') {
            const found = Object.entries(EducationalALU.OP_NAMES).find(
                ([, name]) => name.toLowerCase() === opcode.toLowerCase()
            );
            if (found) op = Number(found[0]);
            else throw new Error(`Unknown ALU opcode: ${opcode}`);
        }

        VectorOps.checkWidthMatch(a, b, `ALU ${EducationalALU.OP_NAMES[op] || op}`);
        if (a.width !== this.width) {
            throw new RangeError(`Operand width ${a.width} does not match ALU width ${this.width}`);
        }

        let result;
        let carryFlag = 0;
        let overflowFlag = false;

        switch (op) {
            case EducationalALU.OP_ADD: {
                const addRes = VectorOps.add(a, b, cin, false, 'alu_out');
                result = addRes.result;
                carryFlag = addRes.carryOut;
                overflowFlag = addRes.overflowSigned;
                break;
            }
            case EducationalALU.OP_SUB: {
                const subRes = VectorOps.sub(a, b, cin, 'alu_out');
                result = subRes.result;
                carryFlag = subRes.borrowOut; // Unsigned borrow
                overflowFlag = subRes.overflowSigned;
                break;
            }
            case EducationalALU.OP_AND: {
                result = VectorOps.bitwiseAnd(a, b, 'alu_out');
                break;
            }
            case EducationalALU.OP_OR: {
                result = VectorOps.bitwiseOr(a, b, 'alu_out');
                break;
            }
            case EducationalALU.OP_XOR: {
                result = VectorOps.bitwiseXor(a, b, 'alu_out');
                break;
            }
            case EducationalALU.OP_NOT: {
                result = VectorOps.bitwiseNot(a, 'alu_out');
                break;
            }
            case EducationalALU.OP_SHL: {
                result = VectorOps.shl(a, 1, 'alu_out');
                carryFlag = a.getBit(this.width - 1); // Shifted out MSB
                break;
            }
            case EducationalALU.OP_SHR: {
                result = VectorOps.shr(a, 1, 'alu_out');
                carryFlag = a.getBit(0); // Shifted out LSB
                break;
            }
            case EducationalALU.OP_PASSA: {
                result = a.clone('alu_out');
                break;
            }
            case EducationalALU.OP_PASSB: {
                result = b.clone('alu_out');
                break;
            }
            default:
                throw new Error(`Unsupported ALU opcode: ${op}`);
        }

        // Compute remaining flags
        const zeroFlag = result.value === 0 ? 1 : 0;
        const negativeFlag = result.getBit(this.width - 1) === 1 ? 1 : 0;

        return {
            opcode: op,
            opName: EducationalALU.OP_NAMES[op] || 'UNKNOWN',
            result,
            flags: {
                Z: zeroFlag,
                C: carryFlag,
                V: overflowFlag ? 1 : 0,
                N: negativeFlag
            },
            flagExplanations: {
                Z: zeroFlag ? 'Zero: Result is 0.' : 'Zero: Result is non-zero.',
                C: carryFlag ? 'Carry: Unsigned arithmetic overflow or borrow occurred.' : 'Carry: No unsigned carry/borrow.',
                V: overflowFlag ? 'Overflow: Signed 2\'s complement range exceeded.' : 'Overflow: Signed result within valid range.',
                N: negativeFlag ? 'Negative: MSB is 1 (negative in 2\'s complement).' : 'Negative: MSB is 0 (positive or zero).'
            }
        };
    }
}
