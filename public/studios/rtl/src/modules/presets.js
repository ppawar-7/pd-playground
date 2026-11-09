/**
 * presets.js — Predefined Educational Circuit Presets
 * 
 * Provides serialized circuit definitions that demonstrate fundamental
 * combinational logic, arithmetic building blocks, selection logic,
 * and sequential register storage.
 * 
 * Note: Combinational latches (e.g., cross-coupled NOR SR latch) are excluded
 * per architectural Decision 007.
 * 
 * @module Presets
 */

export const PRESETS = {
    'and-gate': {
        name: '2-Input AND Gate',
        description: 'Basic 2-input AND gate producing HIGH only when both inputs are 1.',
        circuit: {
            components: [
                { id: 'input_1', type: 'INPUT', label: 'A', x: 80, y: 80, value: 1 },
                { id: 'input_2', type: 'INPUT', label: 'B', x: 80, y: 160, value: 0 },
                { id: 'and_1', type: 'AND', label: 'AND', x: 260, y: 120 },
                { id: 'output_1', type: 'OUTPUT', label: 'Y', x: 440, y: 120 }
            ],
            connections: [
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'and_1', toPin: 'and_1.in0' },
                { fromComponent: 'input_2', fromPin: 'input_2.out0', toComponent: 'and_1', toPin: 'and_1.in1' },
                { fromComponent: 'and_1', fromPin: 'and_1.out0', toComponent: 'output_1', toPin: 'output_1.in0' }
            ]
        }
    },

    'or-gate': {
        name: '2-Input OR Gate',
        description: 'Basic 2-input OR gate producing HIGH when at least one input is 1.',
        circuit: {
            components: [
                { id: 'input_1', type: 'INPUT', label: 'A', x: 80, y: 80, value: 0 },
                { id: 'input_2', type: 'INPUT', label: 'B', x: 80, y: 160, value: 1 },
                { id: 'or_1', type: 'OR', label: 'OR', x: 260, y: 120 },
                { id: 'output_1', type: 'OUTPUT', label: 'Y', x: 440, y: 120 }
            ],
            connections: [
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'or_1', toPin: 'or_1.in0' },
                { fromComponent: 'input_2', fromPin: 'input_2.out0', toComponent: 'or_1', toPin: 'or_1.in1' },
                { fromComponent: 'or_1', fromPin: 'or_1.out0', toComponent: 'output_1', toPin: 'output_1.in0' }
            ]
        }
    },

    'not-gate': {
        name: '1-Bit Inverter (NOT)',
        description: 'Single-input logic inverter producing inverted complement output.',
        circuit: {
            components: [
                { id: 'input_1', type: 'INPUT', label: 'A', x: 100, y: 120, value: 0 },
                { id: 'not_1', type: 'NOT', label: 'NOT', x: 260, y: 120 },
                { id: 'output_1', type: 'OUTPUT', label: 'Y', x: 420, y: 120 }
            ],
            connections: [
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'not_1', toPin: 'not_1.in0' },
                { fromComponent: 'not_1', fromPin: 'not_1.out0', toComponent: 'output_1', toPin: 'output_1.in0' }
            ]
        }
    },

    'half-adder': {
        name: '1-Bit Half Adder',
        description: 'Computes binary SUM (A ⊕ B) and CARRY (A · B) of two 1-bit inputs.',
        circuit: {
            components: [
                { id: 'input_1', type: 'INPUT', label: 'A', x: 80, y: 80, value: 1 },
                { id: 'input_2', type: 'INPUT', label: 'B', x: 80, y: 180, value: 1 },
                { id: 'xor_1', type: 'XOR', label: 'XOR', x: 260, y: 70 },
                { id: 'and_1', type: 'AND', label: 'AND', x: 260, y: 190 },
                { id: 'output_1', type: 'OUTPUT', label: 'SUM', x: 440, y: 70 },
                { id: 'output_2', type: 'OUTPUT', label: 'CARRY', x: 440, y: 190 }
            ],
            connections: [
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'xor_1', toPin: 'xor_1.in0' },
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'and_1', toPin: 'and_1.in0' },
                { fromComponent: 'input_2', fromPin: 'input_2.out0', toComponent: 'xor_1', toPin: 'xor_1.in1' },
                { fromComponent: 'input_2', fromPin: 'input_2.out0', toComponent: 'and_1', toPin: 'and_1.in1' },
                { fromComponent: 'xor_1', fromPin: 'xor_1.out0', toComponent: 'output_1', toPin: 'output_1.in0' },
                { fromComponent: 'and_1', fromPin: 'and_1.out0', toComponent: 'output_2', toPin: 'output_2.in0' }
            ]
        }
    },

    'mux-2to1': {
        name: '2:1 Multiplexer',
        description: 'Selects between two inputs A (when Sel=0) and B (when Sel=1).',
        circuit: {
            components: [
                { id: 'input_1', type: 'INPUT', label: 'A', x: 80, y: 70, value: 0 },
                { id: 'input_2', type: 'INPUT', label: 'B', x: 80, y: 150, value: 1 },
                { id: 'input_sel', type: 'INPUT', label: 'Sel', x: 180, y: 240, value: 1 },
                { id: 'mux_1', type: 'MUX2', label: 'MUX 2:1', x: 280, y: 110 },
                { id: 'output_1', type: 'OUTPUT', label: 'Y', x: 460, y: 110 }
            ],
            connections: [
                { fromComponent: 'input_1', fromPin: 'input_1.out0', toComponent: 'mux_1', toPin: 'mux_1.in0' },
                { fromComponent: 'input_2', fromPin: 'input_2.out0', toComponent: 'mux_1', toPin: 'mux_1.in1' },
                { fromComponent: 'input_sel', fromPin: 'input_sel.out0', toComponent: 'mux_1', toPin: 'mux_1.in2' },
                { fromComponent: 'mux_1', fromPin: 'mux_1.out0', toComponent: 'output_1', toPin: 'output_1.in0' }
            ]
        }
    },

    'dff-demo': {
        name: 'D Flip-Flop Register Demo',
        description: 'Positive-edge-triggered D flip-flop sampling D input on 0→1 clock transitions.',
        circuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 80, y: 90, value: 1 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 80, y: 180, value: 0 },
                { id: 'dff_1', type: 'DFF', label: 'DFF', x: 260, y: 100 },
                { id: 'output_q', type: 'OUTPUT', label: 'Q', x: 440, y: 115 }
            ],
            connections: [
                { fromComponent: 'input_d', fromPin: 'input_d.out0', toComponent: 'dff_1', toPin: 'dff_1.in0' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in1' },
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'output_q', toPin: 'output_q.in0' }
            ]
        }
    },

    'reg-enable': {
        name: 'Register with Clock Enable',
        description: 'ASIC recirculating MUX enable pattern: when EN=0, DFF holds Q; when EN=1, loads D.',
        circuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 60, y: 70, value: 1 },
                { id: 'input_en', type: 'INPUT', label: 'EN', x: 60, y: 200, value: 1 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 60, y: 270, value: 0 },
                { id: 'mux_1', type: 'MUX2', label: 'MUX', x: 220, y: 90 },
                { id: 'dff_1', type: 'DFF', label: 'DFF', x: 360, y: 100 },
                { id: 'output_q', type: 'OUTPUT', label: 'Q', x: 500, y: 115 }
            ],
            connections: [
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'mux_1', toPin: 'mux_1.in0' },
                { fromComponent: 'input_d', fromPin: 'input_d.out0', toComponent: 'mux_1', toPin: 'mux_1.in1' },
                { fromComponent: 'input_en', fromPin: 'input_en.out0', toComponent: 'mux_1', toPin: 'mux_1.in2' },
                { fromComponent: 'mux_1', fromPin: 'mux_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in0' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in1' },
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'output_q', toPin: 'output_q.in0' }
            ]
        }
    },

    'reg-sync-reset': {
        name: 'Register with Synchronous Reset',
        description: 'Synchronous reset register: when RST=1 on rising clock edge, Q is cleared to 0.',
        circuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 60, y: 70, value: 1 },
                { id: 'input_rst', type: 'INPUT', label: 'RST', x: 60, y: 150, value: 0 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 60, y: 230, value: 0 },
                { id: 'not_1', type: 'NOT', label: 'NOT', x: 180, y: 150 },
                { id: 'and_1', type: 'AND', label: 'AND', x: 280, y: 90 },
                { id: 'dff_1', type: 'DFF', label: 'DFF', x: 380, y: 100 },
                { id: 'output_q', type: 'OUTPUT', label: 'Q', x: 520, y: 115 }
            ],
            connections: [
                { fromComponent: 'input_rst', fromPin: 'input_rst.out0', toComponent: 'not_1', toPin: 'not_1.in0' },
                { fromComponent: 'input_d', fromPin: 'input_d.out0', toComponent: 'and_1', toPin: 'and_1.in0' },
                { fromComponent: 'not_1', fromPin: 'not_1.out0', toComponent: 'and_1', toPin: 'and_1.in1' },
                { fromComponent: 'and_1', fromPin: 'and_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in0' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in1' },
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'output_q', toPin: 'output_q.in0' }
            ]
        }
    },

    'shift-reg-2stage': {
        name: '2-Stage Shift Register Pipeline',
        description: 'Two DFFs clocked on shared CLK demonstrating cycle-by-cycle pipeline propagation.',
        circuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 60, y: 80, value: 1 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 60, y: 180, value: 0 },
                { id: 'dff_1', type: 'DFF', label: 'DFF1', x: 200, y: 80 },
                { id: 'dff_2', type: 'DFF', label: 'DFF2', x: 340, y: 80 },
                { id: 'output_q1', type: 'OUTPUT', label: 'Q1', x: 220, y: 220 },
                { id: 'output_q2', type: 'OUTPUT', label: 'Q2', x: 480, y: 95 }
            ],
            connections: [
                { fromComponent: 'input_d', fromPin: 'input_d.out0', toComponent: 'dff_1', toPin: 'dff_1.in0' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in1' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_2', toPin: 'dff_2.in1' },
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'dff_2', toPin: 'dff_2.in0' },
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'output_q1', toPin: 'output_q1.in0' },
                { fromComponent: 'dff_2', fromPin: 'dff_2.out0', toComponent: 'output_q2', toPin: 'output_q2.in0' }
            ]
        }
    },

    'full-adder': {
        name: '1-Bit Full Adder',
        description: 'Binary adder computing SUM = A ⊕ B ⊕ Cin and COUT = (A·B) + (Cin·(A⊕B)).',
        circuit: {
            components: [
                { id: 'input_a', type: 'INPUT', label: 'A', x: 60, y: 70, value: 1 },
                { id: 'input_b', type: 'INPUT', label: 'B', x: 60, y: 150, value: 0 },
                { id: 'input_cin', type: 'INPUT', label: 'CIN', x: 60, y: 230, value: 1 },
                { id: 'xor_1', type: 'XOR', label: 'XOR1', x: 220, y: 60 },
                { id: 'xor_2', type: 'XOR', label: 'XOR2', x: 380, y: 70 },
                { id: 'and_1', type: 'AND', label: 'AND1', x: 220, y: 160 },
                { id: 'and_2', type: 'AND', label: 'AND2', x: 380, y: 180 },
                { id: 'or_1', type: 'OR', label: 'OR1', x: 500, y: 170 },
                { id: 'output_sum', type: 'OUTPUT', label: 'SUM', x: 560, y: 70 },
                { id: 'output_cout', type: 'OUTPUT', label: 'COUT', x: 640, y: 170 }
            ],
            connections: [
                { fromComponent: 'input_a', fromPin: 'input_a.out0', toComponent: 'xor_1', toPin: 'xor_1.in0' },
                { fromComponent: 'input_a', fromPin: 'input_a.out0', toComponent: 'and_1', toPin: 'and_1.in0' },
                { fromComponent: 'input_b', fromPin: 'input_b.out0', toComponent: 'xor_1', toPin: 'xor_1.in1' },
                { fromComponent: 'input_b', fromPin: 'input_b.out0', toComponent: 'and_1', toPin: 'and_1.in1' },
                { fromComponent: 'xor_1', fromPin: 'xor_1.out0', toComponent: 'xor_2', toPin: 'xor_2.in0' },
                { fromComponent: 'input_cin', fromPin: 'input_cin.out0', toComponent: 'xor_2', toPin: 'xor_2.in1' },
                { fromComponent: 'xor_2', fromPin: 'xor_2.out0', toComponent: 'output_sum', toPin: 'output_sum.in0' },
                { fromComponent: 'xor_1', fromPin: 'xor_1.out0', toComponent: 'and_2', toPin: 'and_2.in0' },
                { fromComponent: 'input_cin', fromPin: 'input_cin.out0', toComponent: 'and_2', toPin: 'and_2.in1' },
                { fromComponent: 'and_1', fromPin: 'and_1.out0', toComponent: 'or_1', toPin: 'or_1.in0' },
                { fromComponent: 'and_2', fromPin: 'and_2.out0', toComponent: 'or_1', toPin: 'or_1.in1' },
                { fromComponent: 'or_1', fromPin: 'or_1.out0', toComponent: 'output_cout', toPin: 'output_cout.in0' }
            ]
        }
    },

    'mux-cond': {
        name: 'Combinational MUX (Conditional ? :)',
        description: '2:1 Multiplexer selection using ternary conditional dataflow operator (assign y = sel ? b : a).',
        circuit: {
            components: [
                { id: 'input_a', type: 'INPUT', label: 'A', x: 80, y: 70, value: 0 },
                { id: 'input_b', type: 'INPUT', label: 'B', x: 80, y: 150, value: 1 },
                { id: 'input_sel', type: 'INPUT', label: 'Sel', x: 180, y: 240, value: 1 },
                { id: 'mux_1', type: 'MUX2', label: 'MUX', x: 280, y: 110 },
                { id: 'output_y', type: 'OUTPUT', label: 'Y', x: 460, y: 110 }
            ],
            connections: [
                { fromComponent: 'input_a', fromPin: 'input_a.out0', toComponent: 'mux_1', toPin: 'mux_1.in0' },
                { fromComponent: 'input_b', fromPin: 'input_b.out0', toComponent: 'mux_1', toPin: 'mux_1.in1' },
                { fromComponent: 'input_sel', fromPin: 'input_sel.out0', toComponent: 'mux_1', toPin: 'mux_1.in2' },
                { fromComponent: 'mux_1', fromPin: 'mux_1.out0', toComponent: 'output_y', toPin: 'output_y.in0' }
            ]
        }
    },

    'mux-case': {
        name: 'Combinational MUX (Case Selection)',
        description: '2:1 Multiplexer demonstrating procedural case(sel) parallel decoding logic.',
        circuit: {
            components: [
                { id: 'input_a', type: 'INPUT', label: 'A', x: 80, y: 70, value: 1 },
                { id: 'input_b', type: 'INPUT', label: 'B', x: 80, y: 150, value: 0 },
                { id: 'input_sel', type: 'INPUT', label: 'Sel', x: 180, y: 240, value: 0 },
                { id: 'mux_1', type: 'MUX2', label: 'MUX_CASE', x: 280, y: 110 },
                { id: 'output_y', type: 'OUTPUT', label: 'Y', x: 460, y: 110 }
            ],
            connections: [
                { fromComponent: 'input_a', fromPin: 'input_a.out0', toComponent: 'mux_1', toPin: 'mux_1.in0' },
                { fromComponent: 'input_b', fromPin: 'input_b.out0', toComponent: 'mux_1', toPin: 'mux_1.in1' },
                { fromComponent: 'input_sel', fromPin: 'input_sel.out0', toComponent: 'mux_1', toPin: 'mux_1.in2' },
                { fromComponent: 'mux_1', fromPin: 'mux_1.out0', toComponent: 'output_y', toPin: 'output_y.in0' }
            ]
        }
    },

    'dff-enable': {
        name: 'DFF Register with Clock Enable',
        description: 'Register with enable: loads D on posedge clk when EN=1; retains previous state when EN=0.',
        circuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 80, y: 70, value: 1 },
                { id: 'input_en', type: 'INPUT', label: 'EN', x: 80, y: 160, value: 1 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 80, y: 250, value: 0 },
                { id: 'dffe_1', type: 'DFFE', label: 'DFFE', x: 280, y: 90 },
                { id: 'output_q', type: 'OUTPUT', label: 'Q', x: 480, y: 105 }
            ],
            connections: [
                { fromComponent: 'input_d', fromPin: 'input_d.out0', toComponent: 'dffe_1', toPin: 'dffe_1.in0' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dffe_1', toPin: 'dffe_1.in1' },
                { fromComponent: 'input_en', fromPin: 'input_en.out0', toComponent: 'dffe_1', toPin: 'dffe_1.in2' },
                { fromComponent: 'dffe_1', fromPin: 'dffe_1.out0', toComponent: 'output_q', toPin: 'output_q.in0' }
            ]
        }
    },

    'dff-sync-reset': {
        name: 'DFF Register with Synchronous Reset',
        description: 'Register with synchronous reset: posedge clk clears Q to 0 when RST=1; unaffected between clock edges.',
        circuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 80, y: 70, value: 1 },
                { id: 'input_rst', type: 'INPUT', label: 'RST', x: 80, y: 160, value: 0 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 80, y: 250, value: 0 },
                { id: 'dffsr_1', type: 'DFFSR', label: 'DFF_SR', x: 280, y: 90 },
                { id: 'output_q', type: 'OUTPUT', label: 'Q', x: 480, y: 105 }
            ],
            connections: [
                { fromComponent: 'input_d', fromPin: 'input_d.out0', toComponent: 'dffsr_1', toPin: 'dffsr_1.in0' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dffsr_1', toPin: 'dffsr_1.in1' },
                { fromComponent: 'input_rst', fromPin: 'input_rst.out0', toComponent: 'dffsr_1', toPin: 'dffsr_1.in2' },
                { fromComponent: 'dffsr_1', fromPin: 'dffsr_1.out0', toComponent: 'output_q', toPin: 'output_q.in0' }
            ]
        }
    },

    'dff-esr-priority': {
        name: 'Register with Enable & Reset Priority',
        description: 'Demonstrates documented priority: when RST=1 and EN=1 simultaneously, Reset takes priority.',
        circuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 60, y: 60, value: 1 },
                { id: 'input_en', type: 'INPUT', label: 'EN', x: 60, y: 140, value: 1 },
                { id: 'input_rst', type: 'INPUT', label: 'RST', x: 60, y: 220, value: 1 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 60, y: 300, value: 0 },
                { id: 'dffesr_1', type: 'DFFESR', label: 'DFF_ESR', x: 280, y: 100 },
                { id: 'output_q', type: 'OUTPUT', label: 'Q', x: 480, y: 115 }
            ],
            connections: [
                { fromComponent: 'input_d', fromPin: 'input_d.out0', toComponent: 'dffesr_1', toPin: 'dffesr_1.in0' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dffesr_1', toPin: 'dffesr_1.in1' },
                { fromComponent: 'input_en', fromPin: 'input_en.out0', toComponent: 'dffesr_1', toPin: 'dffesr_1.in2' },
                { fromComponent: 'input_rst', fromPin: 'input_rst.out0', toComponent: 'dffesr_1', toPin: 'dffesr_1.in3' },
                { fromComponent: 'dffesr_1', fromPin: 'dffesr_1.out0', toComponent: 'output_q', toPin: 'output_q.in0' }
            ]
        }
    },

    'blocking-vs-nonblocking': {
        name: 'Blocking vs Nonblocking Semantics',
        description: '2-Stage shift register showing why nonblocking assignments (<=) are required for parallel registers.',
        circuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 60, y: 80, value: 1 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 60, y: 180, value: 0 },
                { id: 'dff_1', type: 'DFF', label: 'STAGE1', x: 200, y: 80 },
                { id: 'dff_2', type: 'DFF', label: 'STAGE2', x: 360, y: 80 },
                { id: 'output_q1', type: 'OUTPUT', label: 'Q1', x: 220, y: 230 },
                { id: 'output_q2', type: 'OUTPUT', label: 'Q2', x: 500, y: 95 }
            ],
            connections: [
                { fromComponent: 'input_d', fromPin: 'input_d.out0', toComponent: 'dff_1', toPin: 'dff_1.in0' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in1' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_2', toPin: 'dff_2.in1' },
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'dff_2', toPin: 'dff_2.in0' },
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'output_q1', toPin: 'output_q1.in0' },
                { fromComponent: 'dff_2', fromPin: 'dff_2.out0', toComponent: 'output_q2', toPin: 'output_q2.in0' }
            ]
        }
    }
};
