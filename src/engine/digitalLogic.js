/**
 * digitalLogic.js
 * ================
 * Pure deterministic digital logic simulation engine.
 * Powers RTL Kingdom educational activities (RTL-2 through RTL-5).
 *
 * Implements:
 * 1. D Flip-Flop with synchronous reset and clock enable.
 * 2. Cycle-by-cycle clock stepping and waveform history generation.
 * 3. Combinational vs Sequential propagation evaluation.
 * 4. Latch inference hazard checking.
 * 5. Pipelined 8-bit accumulator datapath simulation (carry-out and signed overflow).
 * 6. Finite State Machine (Sequence Detector 1011) simulation.
 */

/**
 * Simulate a D Flip-Flop on a rising clock edge.
 *
 * Reset Priority: Synchronous active-high reset overrides enable and data input.
 * Enable Behavior: When EN=0, state Q is retained.
 *
 * @param {Object} params
 * @param {number} params.d - Data input (0 or 1)
 * @param {number} params.currentQ - Current registered state (0 or 1)
 * @param {number} [params.rst=0] - Synchronous reset (0 or 1)
 * @param {number} [params.en=1] - Clock enable (0 or 1)
 * @returns {number} Next Q state (0 or 1)
 */
export function simulateDFF({ d, currentQ, rst = 0, en = 1 }) {
  if (Number(rst) === 1) {
    return 0;
  }
  if (Number(en) === 0) {
    return Number(currentQ) === 1 ? 1 : 0;
  }
  return Number(d) === 1 ? 1 : 0;
}

/**
 * Simulate a multi-cycle sequence of inputs applied to a D Flip-Flop.
 *
 * @param {Array<{ d: number, rst: number, en: number }>} cycleInputs
 * @param {number} [initialQ=0]
 * @returns {Array<{ cycle: number, clk: number, d: number, rst: number, en: number, q: number, prevQ: number }>}
 */
export function simulateDFFSequence(cycleInputs, initialQ = 0) {
  if (!Array.isArray(cycleInputs)) return [];
  let q = Number(initialQ) === 1 ? 1 : 0;
  const history = [];

  cycleInputs.forEach((inp, idx) => {
    const nextQ = simulateDFF({
      d: inp.d,
      currentQ: q,
      rst: inp.rst,
      en: inp.en,
    });
    history.push({
      cycle: idx + 1,
      clk: 1, // sample on rising edge
      d: Number(inp.d) === 1 ? 1 : 0,
      rst: Number(inp.rst) === 1 ? 1 : 0,
      en: Number(inp.en) === 1 ? 1 : 0,
      q: nextQ,
      prevQ: q,
    });
    q = nextQ;
  });

  return history;
}

/**
 * Simulate combinational vs sequential paths for comparison.
 * Combinational: output updates immediately based on current input: Y_comb = A & B.
 * Sequential: output updates only at clock edge into register: Y_seq <= A & B.
 *
 * @param {Array<{ a: number, b: number }>} inputs
 * @param {number} [initialQ=0]
 * @returns {Array<{ cycle: number, a: number, b: number, combY: number, seqY: number }>}
 */
export function simulateCombVsSeq(inputs, initialQ = 0) {
  if (!Array.isArray(inputs)) return [];
  let regQ = Number(initialQ) === 1 ? 1 : 0;
  return inputs.map((inp, idx) => {
    const a = Number(inp.a) === 1 ? 1 : 0;
    const b = Number(inp.b) === 1 ? 1 : 0;
    const combY = (a === 1 && b === 1) ? 1 : 0;
    const seqY = regQ; // captured from previous cycle
    regQ = combY; // latch for next cycle
    return {
      cycle: idx + 1,
      a,
      b,
      combY,
      seqY,
    };
  });
}

/**
 * Check for latch inference hazards in an RTL conditional block.
 * An incomplete conditional without a default/else branch in combinational logic
 * causes the synthesizer to infer an unwanted transparent latch.
 *
 * @param {Object} codeModel
 * @param {boolean} codeModel.hasElse - Whether the conditional has an 'else' branch
 * @param {boolean} codeModel.isClocked - Whether the block is inside an edge-triggered always block
 * @returns {{ hasLatch: boolean, explanation: string }}
 */
export function evaluateLatchInference({ hasElse, isClocked }) {
  if (isClocked) {
    return {
      hasLatch: false,
      explanation: 'Sequential logic (always @(posedge clk)) safely infers D Flip-Flops; missing branches preserve registered state without transparent latches.',
    };
  }
  if (!hasElse) {
    return {
      hasLatch: true,
      explanation: 'Combinational logic (always @* or always_comb) with an incomplete if-branch infers an unwanted transparent latch because the output must hold its prior value when the condition is false.',
    };
  }
  return {
    hasLatch: false,
    explanation: 'Fully specified combinational logic with an else branch safely synthesizes into combinational multiplexers and logic gates without latches.',
  };
}

/**
 * Simulate an 8-bit accumulator datapath with synchronous reset and overflow/carry detection.
 * Datapath: NextAcc = (MuxSel === 1 ? InData : Acc) + Operand;
 * Output: Acc (8-bit clamped: 0-255), CarryOut: bool (sum > 255), SignedOverflow: bool.
 *
 * @param {Object} state
 * @param {number} state.currentAcc - Current accumulator value (0-255)
 * @param {number} state.inData - External 8-bit input data (0-255)
 * @param {number} state.operand - Addend value (0-255)
 * @param {number} state.muxSel - 0: preserve currentAcc as base, 1: load inData as base
 * @param {number} state.rst - Synchronous reset (1 resets Acc to 0)
 * @returns {{ nextAcc: number, overflow: boolean, carryOut: boolean, signedOverflow: boolean }}
 */
export function simulateAccumulator({ currentAcc = 0, inData = 0, operand = 0, muxSel = 0, rst = 0 }) {
  if (Number(rst) === 1) {
    return { nextAcc: 0, overflow: false, carryOut: false, signedOverflow: false };
  }
  const cleanCurrent = (Number(currentAcc) || 0) & 0xff;
  const cleanIn = (Number(inData) || 0) & 0xff;
  const cleanOp = (Number(operand) || 0) & 0xff;

  const base = Number(muxSel) === 1 ? cleanIn : cleanCurrent;
  const sum = base + cleanOp;
  const carryOut = sum > 255;
  const nextAcc = sum & 0xff;

  // Signed 2's complement overflow: occurred if sign of base and operand match, but result sign differs
  const baseSign = (base >> 7) & 1;
  const opSign = (cleanOp >> 7) & 1;
  const resSign = (nextAcc >> 7) & 1;
  const signedOverflow = (baseSign === opSign) && (resSign !== baseSign);

  return {
    nextAcc,
    overflow: carryOut,
    carryOut,
    signedOverflow,
  };
}

/**
 * Finite State Machine: 1011 Sequence Detector (Overlapping).
 * States:
 *   S0 (IDLE, looking for '1')
 *   S1 (Saw '1', looking for '0')
 *   S2 (Saw '10', looking for '1')
 *   S3 (Saw '101', looking for '1')
 * Output MATCH is asserted when pattern 1011 is completed.
 *
 * @param {string} currentState - 'S0' | 'S1' | 'S2' | 'S3'
 * @param {number} bitIn - Input bit (0 or 1)
 * @returns {{ nextState: string, match: boolean }}
 */
export function stepSequenceDetector1011(currentState, bitIn) {
  const b = Number(bitIn) === 1 ? 1 : 0;
  switch (currentState) {
    case 'S0':
      return b === 1 ? { nextState: 'S1', match: false } : { nextState: 'S0', match: false };
    case 'S1':
      return b === 0 ? { nextState: 'S2', match: false } : { nextState: 'S1', match: false };
    case 'S2':
      return b === 1 ? { nextState: 'S3', match: false } : { nextState: 'S0', match: false };
    case 'S3':
      // Saw '101'. If bitIn is 1, pattern '1011' completed!
      // Overlapping sequence detection: '1011' ends in '1', which can be start of next sequence -> S1
      return b === 1 ? { nextState: 'S1', match: true } : { nextState: 'S2', match: false };
    default:
      return { nextState: 'S0', match: false };
  }
}

/**
 * Run a multi-bit stream through the 1011 Sequence Detector.
 *
 * @param {Array<number>} bitStream - e.g. [1, 0, 1, 1, 0, 1, 1]
 * @returns {Array<{ cycle: number, bitIn: number, state: string, nextState: string, match: boolean }>}
 */
export function simulateSequenceDetector(bitStream) {
  if (!Array.isArray(bitStream)) return [];
  let state = 'S0';
  return bitStream.map((bitIn, idx) => {
    const { nextState, match } = stepSequenceDetector1011(state, bitIn);
    const step = {
      cycle: idx + 1,
      bitIn: Number(bitIn) === 1 ? 1 : 0,
      state,
      nextState,
      match,
    };
    state = nextState;
    return step;
  });
}
