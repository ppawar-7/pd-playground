/**
 * advanced_lessons.js — Educational Curriculum for Advanced RTL Lab
 * 
 * Part of PD Playground: Advanced RTL Lab
 * 
 * Pure JavaScript ES Module with ZERO DOM dependencies.
 * Provides 10 structured, interactive lessons with:
 * - Title, difficulty, learning objective, concept explanation
 * - Interactive demonstration configuration
 * - Student challenge with behavioral solution validation
 * - Progressive hints and VLSI physical design relevance explanation
 * - Local progress tracking via localStorage persistence
 */

import { VectorSignal, VectorOps } from '../engine/vector_model.js';
import { HalfAdder, FullAdder, RippleCarryAdder, EducationalALU } from '../engine/arithmetic_engine.js';
import { MultiBitRegister, SequentialSimulationEngine } from '../engine/register_engine.js';
import { BinaryCounter, UniversalShiftRegister } from '../engine/counter_engine.js';
import { FSMModel, FSMPresets } from '../engine/fsm_engine.js';

export const ADVANCED_LESSONS = [
    {
        id: 'lesson_1_vectors_slicing',
        title: 'Multi-Bit Vectors and Slicing in RTL',
        difficulty: 'Beginner',
        category: 'Vectors',
        objective: 'Extract lower and upper nibbles from an 8-bit bus using bit slicing.',
        explanation: `In RTL digital design, multi-bit signals (buses) represent bundles of wires carrying binary vectors.
In Verilog, an 8-bit bus is declared as \`wire [7:0] data;\`.
Bit slicing syntax \`data[msb:lsb]\` allows extracting sub-vectors. For example, \`data[7:4]\` extracts the upper 4 bits (high nibble), and \`data[3:0]\` extracts the lower 4 bits (low nibble).
In ASIC physical design, bus routing must preserve bit ordering; swapping MSB and LSB leads to severe functional bugs.`,
        challenge: 'Given an 8-bit input vector, extract the upper nibble [7:4] and lower nibble [3:0].',
        hints: [
            'MSB of an 8-bit vector is index 7; LSB is index 0.',
            'Upper nibble spans bits [7:4], which is 4 bits wide.',
            'Lower nibble spans bits [3:0], which is 4 bits wide.'
        ],
        physicalDesignNote: 'Bus routing in physical design (place-and-route) uses shielded metal layers to prevent crosstalk between adjacent bitlines.',
        validate: (solution) => {
            // solution: { sliceUpper: fn(vec), sliceLower: fn(vec) } or { upperMsb: 7, upperLsb: 4, lowerMsb: 3, lowerLsb: 0 }
            if (solution.upperMsb === 7 && solution.upperLsb === 4 && solution.lowerMsb === 3 && solution.lowerLsb === 0) {
                return { success: true, message: 'Correct! Bit slicing [7:4] and [3:0] cleanly partitions the 8-bit bus.' };
            }
            if (typeof solution.run === 'function') {
                const testVec = new VectorSignal({ width: 8, value: 0xA5 }); // 1010 0101
                const res = solution.run(testVec);
                if (res.upper === 0xA && res.lower === 0x5) {
                    return { success: true, message: 'Behavioral verification passed! 0xA5 correctly split into 0xA and 0x5.' };
                }
            }
            return { success: false, message: 'Incorrect slicing bounds. Upper nibble must be [7:4] and lower nibble [3:0].' };
        }
    },
    {
        id: 'lesson_2_concatenation',
        title: 'Bus Concatenation and Zero-Extension',
        difficulty: 'Beginner',
        category: 'Vectors',
        objective: 'Assemble a 12-bit address word from a 4-bit page register and 8-bit offset.',
        explanation: `Concatenation in Verilog uses curly braces \`{A, B}\`.
When combining a 4-bit signal \`page[3:0]\` with an 8-bit signal \`offset[7:0]\`, the resulting bus \`address[11:0] = {page, offset}\` is exactly 12 bits wide.
Zero-extension is performed by concatenating leading zeros: \`{4'b0000, offset}\` extends an 8-bit signal to 12 bits without changing its unsigned value.`,
        challenge: 'Combine 4-bit page register (upper) and 8-bit offset (lower) into a 12-bit address.',
        hints: [
            'Concatenation places the first operand at the higher bit positions.',
            'Result width is the sum of operand widths: 4 + 8 = 12 bits.'
        ],
        physicalDesignNote: 'Bus concatenation simply regroups wires on the chip; it incurs zero gate delay in physical synthesis!',
        validate: (solution) => {
            if (solution.pageBits === 4 && solution.offsetBits === 8 && solution.totalBits === 12) {
                return { success: true, message: 'Correct! Concatenating {4-bit, 8-bit} yields a 12-bit bus with zero logic delay.' };
            }
            if (typeof solution.run === 'function') {
                const page = new VectorSignal({ width: 4, value: 0x3 });
                const offset = new VectorSignal({ width: 8, value: 0x42 });
                const res = solution.run(page, offset);
                if (res.value === 0x342 && res.width === 12) {
                    return { success: true, message: 'Behavioral test passed! {0x3, 0x42} = 0x342 (12-bit).' };
                }
            }
            return { success: false, message: 'Expected 12-bit address {page[3:0], offset[7:0]}.' };
        }
    },
    {
        id: 'lesson_3_ripple_carry',
        title: 'Ripple-Carry Carry Chain Mechanics',
        difficulty: 'Intermediate',
        category: 'Arithmetic',
        objective: 'Trace carry propagation (P) and generation (G) in a multi-bit adder.',
        explanation: `In an adder stage:
- Generate: G = A & B (carry is born at this stage regardless of Cin).
- Propagate: P = A ^ B (incoming Cin passes through to Cout).
In a Ripple-Carry Adder (RCA), the carry ripples from stage 0 to stage N-1. The worst-case delay is proportional to N (O(N) latency), making the carry chain the critical timing path in ASIC timing closure.`,
        challenge: 'For A = 0b1101 (13) and B = 0b0011 (3), identify which stage generates a carry and which stages propagate it.',
        hints: [
            'Bit 0: A[0]=1, B[0]=1 -> Generate (G=1).',
            'Bit 1: A[1]=0, B[1]=1 -> Propagate (P=1).',
            'Bit 2: A[2]=1, B[2]=0 -> Propagate (P=1).'
        ],
        physicalDesignNote: 'In ASIC synthesis, ripple-carry adders are replaced by Carry-Lookahead (CLA) or Kogge-Stone tree adders when timing slack is negative.',
        validate: (solution) => {
            // Stage 0 generates carry (1+1); stages 1 and 2 propagate (1^0, 0^1); stage 3 generates (1+1)
            if (solution.genStage0 === true && solution.propStage1 === true) {
                return { success: true, message: 'Excellent! You correctly identified that Stage 0 generates the carry and Stage 1 propagates it.' };
            }
            return { success: false, message: 'Review stage 0 (1 & 1 -> G) and stage 1 (0 ^ 1 -> P).' };
        }
    },
    {
        id: 'lesson_4_alu_flags',
        title: 'ALU Flags: Unsigned Carry vs Signed Overflow',
        difficulty: 'Intermediate',
        category: 'Arithmetic',
        objective: 'Distinguish between unsigned Carry (C) and signed 2\'s complement Overflow (V).',
        explanation: `Carry (C) and Overflow (V) are fundamentally different:
- Carry (C): Set when unsigned addition exceeds 2^W - 1 (or subtraction requires a borrow).
- Overflow (V): Set when 2's complement signed addition of two numbers with the same sign produces a result with the opposite sign!
For 4-bit numbers (signed range -8 to +7):
5 (0101) + 4 (0100) = 9 (1001 = -7). C=0 (9 < 16), but V=1 because two positives gave a negative!`,
        challenge: 'Given 4-bit addition: 5 + 4, determine the states of Carry (C) and Overflow (V) flags.',
        hints: [
            '5 is 0b0101 (positive). 4 is 0b0100 (positive).',
            'Sum is 9 = 0b1001. In 4-bit signed, 0b1001 is -7!',
            'Does 5 + 4 exceed unsigned 15? No, so C=0. Does it exceed signed +7? Yes, so V=1.'
        ],
        physicalDesignNote: 'Flag computation is performed in parallel with the adder output, minimizing critical path overhead in modern microarchitectures.',
        validate: (solution) => {
            if (solution.C === 0 && solution.V === 1) {
                return { success: true, message: 'Perfect! Carry=0 and Overflow=1. You mastered the signed vs unsigned boundary.' };
            }
            return { success: false, message: 'Incorrect flags for 5 + 4 in 4-bit. Expected C=0, V=1.' };
        }
    },
    {
        id: 'lesson_5_registers_enable',
        title: 'Clock Enable and State Retention',
        difficulty: 'Intermediate',
        category: 'Sequential',
        objective: 'Control register load and hold behavior using a clock enable signal.',
        explanation: `A multi-bit register stores binary state across clock cycles.
When Clock Enable (\`en\`) is high at a positive clock edge (\`posedge clk\`), the register samples data input \`d\` into output \`q\`.
When \`en\` is low, the register retains its previous value.
In ASIC physical design, clock gating cells (ICGs) are inserted automatically to disable the clock tree when \`en=0\`, saving massive dynamic power.`,
        challenge: 'Predict the register output Q after 3 clock cycles with specified enable and D inputs.',
        hints: [
            'Register state Q only changes on posedge clk when en == 1.',
            'If en == 0, Q remains unchanged regardless of what is on D.'
        ],
        physicalDesignNote: 'Integrated Clock Gating (ICG) saves up to 40% of dynamic clock network power in digital VLSI chips.',
        validate: (solution) => {
            if (solution.qFinal === 0x9 || solution.heldCorrectly === true) {
                return { success: true, message: 'Correct! Register state was held during en=0 and loaded during en=1.' };
            }
            return { success: false, message: 'Remember: when en=0, the register retains its previous state.' };
        }
    },
    {
        id: 'lesson_6_sync_reset',
        title: 'Synchronous Reset Priority',
        difficulty: 'Intermediate',
        category: 'Sequential',
        objective: 'Understand synchronous reset behavior when simultaneous reset and enable are asserted.',
        explanation: `In synchronous design, reset (\`rst\`) is sampled only at the active clock edge.
When both \`rst\` and \`en\` are asserted simultaneously, RTL design convention dictates that reset takes priority:
\`if (rst) q <= 0; else if (en) q <= d;\`
This ensures deterministic circuit initialization.`,
        challenge: 'What is the register value if both rst=1 and en=1 occur simultaneously on a clock edge?',
        hints: [
            'Examine the if-else hierarchy: if (rst) comes first.',
            'Reset overrides load operations.'
        ],
        physicalDesignNote: 'Synchronous resets avoid metastability hazards and reduce timing closure complexity during static timing analysis (STA).',
        validate: (solution) => {
            if (solution.resetPriority === true || solution.qValue === 0) {
                return { success: true, message: 'Correct! Synchronous reset takes priority over clock enable, clearing the register to 0.' };
            }
            return { success: false, message: 'Reset must take precedence over clock enable.' };
        }
    },
    {
        id: 'lesson_7_modulo_counter',
        title: 'Modulo-6 Counter with Terminal Count',
        difficulty: 'Intermediate',
        category: 'Sequential',
        objective: 'Configure a counter to sequence through 0..5 and pulse terminal count (tc).',
        explanation: `A modulo-M counter counts from 0 up to M-1.
Upon reaching M-1, the next clock edge wraps around to 0.
The terminal count (\`tc\`) signal is a combinational output asserted when \`count == M - 1\`.
Modulo counters are widely used for clock dividers, FIFO pointers, and baud rate generators.`,
        challenge: 'For a modulo-6 counter, identify the count value at which terminal count (tc) is asserted.',
        hints: [
            'Modulo 6 counts: 0, 1, 2, 3, 4, 5 -> then wraps to 0.',
            'Terminal count signals the final state before rollover.'
        ],
        physicalDesignNote: 'Counter rollover logic must be synthesized without glitches to prevent false triggers on downstream clock domains.',
        validate: (solution) => {
            if (solution.tcAtCount === 5 && (solution.modulo === undefined || solution.modulo === 6)) {
                return { success: true, message: 'Correct! Terminal count tc is asserted at count=5, right before rollover to 0.' };
            }
            return { success: false, message: 'For modulo-6 (0..5), terminal count asserts at count=5.' };
        }
    },
    {
        id: 'lesson_8_shift_registers',
        title: 'Serial-In Parallel-Out (SIPO) Deserializer',
        difficulty: 'Advanced',
        category: 'Sequential',
        objective: 'Shift a serial bitstream into a 4-bit parallel register.',
        explanation: `A shift register cascades flip-flops so that each stage hands its bit to the next stage on every clock edge.
In a Serial-In Parallel-Out (SIPO) register, incoming serial bits shift in one-by-one. After 4 clock cycles, all 4 bits are available simultaneously on the parallel output.
This forms the foundational deserializer circuit in UARTs, SPI, and PCIe receivers.`,
        challenge: 'Trace 4 clock cycles of shifting serial bits 1, 0, 1, 1 into an initially cleared shift register.',
        hints: [
            'Cycle 1: shifts in 1 -> [0001].',
            'Cycle 2: shifts in 0 -> [0010].',
            'Cycle 3: shifts in 1 -> [0101].',
            'Cycle 4: shifts in 1 -> [1011].'
        ],
        physicalDesignNote: 'Shift registers require minimal routing overhead and can achieve extremely high operating frequencies in ASIC standard-cell layouts.',
        validate: (solution) => {
            if (solution.finalParallel === 0b1011 || solution.finalHex === '0xB') {
                return { success: true, message: 'Correct! After 4 shifts of 1,0,1,1, the parallel output holds 0b1011 (0xB).' };
            }
            return { success: false, message: 'Expected final parallel output to be 0b1011 (0xB).' };
        }
    },
    {
        id: 'lesson_9_fsm_moore',
        title: 'Moore Sequence Detector (101)',
        difficulty: 'Advanced',
        category: 'FSM',
        objective: 'Design state transitions for a 3-state Moore FSM detecting bit pattern "101".',
        explanation: `A Finite State Machine (FSM) is the brain of a digital controller.
In a Moore machine, the outputs depend STRICTLY on the current state (not combinationally on inputs).
States for detecting '101':
- S_RESET: nothing matched (out=0)
- S_1: saw '1' (out=0)
- S_10: saw '10' (out=0)
- S_101: saw '101' (out=1)
Moore outputs are glitch-free because they change only on clock edges through the state register.`,
        challenge: 'Identify the next state from S_10 when input bit is 1.',
        hints: [
            'In state S_10, we have seen "10".',
            'If the next bit is 1, the full pattern "101" is matched!',
            'Therefore, transition to S_101.'
        ],
        physicalDesignNote: 'Moore outputs are clean registered outputs that do not create combinational paths across module boundaries, simplifying STA constraints.',
        validate: (solution) => {
            if (solution.nextState === 'S_101' || solution.detected === true) {
                return { success: true, message: 'Correct! From S_10 with input 1, transition to S_101 where the detection output is asserted.' };
            }
            return { success: false, message: 'From S_10, bit 1 completes "101", transitioning to S_101.' };
        }
    },
    {
        id: 'lesson_10_moore_vs_mealy',
        title: 'Moore vs Mealy Output Timing Analysis',
        difficulty: 'Advanced',
        category: 'FSM',
        objective: 'Analyze the timing and latency differences between Moore and Mealy FSM outputs.',
        explanation: `Comparing FSM architectures:
- Moore machine: Output = f(Current State). Changes on clock edge. Latency = 1 clock cycle. Glitch-free.
- Mealy machine: Output = f(Current State, Current Inputs). Changes COMBINATIONALLY within the same cycle as input! Latency = 0 cycles. But input glitches can propagate directly to outputs!
In high-speed physical design, Mealy outputs can create long combinational paths that span multiple chip modules, causing setup time violations.`,
        challenge: 'Which machine type reacts combinationally to input changes within the same clock cycle?',
        hints: [
            'Moore outputs depend only on the state register.',
            'Mealy outputs have a direct combinational path from inputs to outputs.'
        ],
        physicalDesignNote: 'Static Timing Analysis (STA) tools often flag Mealy paths because they chain upstream combinational logic with downstream logic, increasing path delay.',
        validate: (solution) => {
            if (solution.immediateType === 'MEALY' || solution.zeroLatencyType === 'MEALY') {
                return { success: true, message: 'Correct! Mealy outputs react combinationally with zero cycle latency, but can propagate input glitches.' };
            }
            return { success: false, message: 'Mealy machines respond combinationally within the same cycle.' };
        }
    },
    {
        id: 'lesson_11_latch_inference',
        title: 'Combinational Latch Inference & Synthesis Rules',
        difficulty: 'Intermediate',
        category: 'Synthesis',
        objective: 'Identify why incomplete conditional assignments in combinational always @(*) blocks infer unwanted hardware latches.',
        explanation: `In synthesizable Verilog, combinational procedural blocks (always @(*)) must assign every output signal along EVERY possible execution branch.
If an if-statement lacks an else-clause, or a case-statement lacks default and does not enumerate all values, the synthesis compiler (e.g. Yosys) assumes the designer intended to hold the previous value when that branch is taken.
Because pure combinational logic has no memory, the compiler must infer a transparent latch (e.g. $dlatch).
In synchronous ASIC design, unintended latches cause severe timing hazards, hold-time violations, and testability nightmares.
Golden Rule: Assign safe default values at the top of the always @(*) block or ensure all branches have complete coverage.`,
        challenge: 'Select the valid design techniques that guarantee no latches are inferred in combinational always @(*) blocks.',
        hints: [
            'Assigning default values at the beginning of always @(*) covers all unhandled cases.',
            'A case statement should include a default branch or cover all 2^N input combinations.',
            'Every if-statement in combinational RTL should have a matching else-branch.'
        ],
        physicalDesignNote: 'Static Timing Analysis (STA) on transparent latches requires time-borrowing and cycle-stealing checks, which drastically complicates timing closure compared to edge-triggered flip-flops.',
        validate: (solution) => {
            if (solution.hasDefaultAssign === true || solution.completeAssignment === true || solution.coverage === 'COMPLETE') {
                return { success: true, message: 'Correct! Complete branch coverage and default assignments prevent unintended transparent latch inference.' };
            }
            return { success: false, message: 'Combinational logic must assign all outputs across every possible branch to avoid latch inference.' };
        }
    },
    {
        id: 'lesson_12_testbench_basics',
        title: 'Self-Checking Verilog Testbenches & Simulation Assertions',
        difficulty: 'Advanced',
        category: 'Verification',
        objective: 'Construct an automated self-checking testbench with clock generation and simulation assertions.',
        explanation: `A Verilog testbench is a simulation wrapper that applies stimulus to a Device Under Test (DUT) and checks outputs.
Key testbench constructs:
1. Clock Generation: 'initial forever #5 clk = ~clk;' creates an oscillating clock signal (period 10 time units).
2. Reset Sequence: Assert reset, wait for clock edges, then release reset.
3. Synchronous Stimulus: Drive inputs on falling edges or with clock synchronization (@(posedge clk)).
4. Self-Checking Assertions: Compare DUT output against expected values automatically using if/else or assert, reporting errors with $error or $fatal, and ending cleanly with $finish.`,
        challenge: 'Verify an automated testbench configuration with a clock period of 10 units that tests a 2-stage shift register with an expected latency of 2 clock cycles.',
        hints: [
            'A symmetric 10-unit clock period toggles every 5 units (#5 clk = ~clk).',
            'A 2-stage shift register with nonblocking assignments (<=) requires exactly 2 posedge clock cycles for data to traverse from input to output.',
            'Automated assertions eliminate the need for manual waveform inspection.'
        ],
        physicalDesignNote: 'Automated self-checking regressions are standard for pre-silicon signoff. Thousands of automated testbenches run in parallel before physical tapeout.',
        validate: (solution) => {
            if ((solution.clockPeriod === 10 || solution.halfPeriod === 5) && solution.expectedLatency === 2) {
                return { success: true, message: 'Correct! Clock period 10 with 2-cycle latency verification confirmed for the 2-stage pipeline.' };
            }
            return { success: false, message: 'Testbench requires clockPeriod=10 and expectedLatency=2 cycles for a 2-stage shift register.' };
        }
    }
];

/**
 * Local Storage Progress Tracker
 */
export class LessonProgressManager {
    static STORAGE_KEY = 'pd_playground_advanced_rtl_progress';

    static getCompletedLessons() {
        try {
            if (typeof localStorage === 'undefined') return [];
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    static markCompleted(lessonId) {
        try {
            if (typeof localStorage === 'undefined') return;
            const completed = new Set(this.getCompletedLessons());
            completed.add(lessonId);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(completed)));
        } catch {}
    }

    static resetProgress() {
        try {
            if (typeof localStorage === 'undefined') return;
            localStorage.removeItem(this.STORAGE_KEY);
        } catch {}
    }
}
