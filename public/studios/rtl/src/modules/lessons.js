/**
 * lessons.js — Guided RTL Learning Lessons & Behavioral Challenge Validator
 * 
 * Provides interactive structured exercises with rigorous behavioral verification.
 * Evaluates correctness using input/output truth tables or clock sequences rather
 * than checking internal component counts.
 * 
 * @module Lessons
 */

import { PRESETS } from './presets.js';
import { soundManager } from '../ui/sound_effects.js';

const getComps = (graph) => (graph.getAllComponents ? graph.getAllComponents() : Array.from(graph.components.values()));

export const LESSONS = [
    {
        id: 'lesson-1-gates',
        title: '1. Understanding Logic Gates',
        difficulty: 'beginner',
        description: 'Construct a 2-input AND gate circuit and verify its Boolean truth table.',
        objective: 'Construct a circuit with 2 inputs (A, B) and 1 output (Y) where Y = A · B.',
        explanation: `
            Logic gates are the foundational building blocks of all digital hardware.
            An <strong>AND gate</strong> outputs logic <strong>1</strong> if and only if <strong>both</strong> inputs are logic 1.
            If any input is 0, the output evaluates to 0.
        `,
        whatIsHappening: 'In physical CMOS silicon, an AND gate is built from a NAND gate followed by an Inverter. When both inputs A and B are HIGH (VDD voltage), two series NMOS transistors conduct, pulling the internal node to ground, which the inverter flips to a strong HIGH output (1). If either input is LOW (0V), the output is driven LOW (0).',
        task: 'Add an AND gate between inputs A and B, add an Output Y, wire them together, and test all 4 combinations by clicking the input switches.',
        solutionPreset: 'and-gate',
        quiz: {
        "question": "If Switch A = 1 and Switch B = 0, what does an AND gate output?",
        "options": [
                {
                        "text": "0 (LOW / 0V Ground)",
                        "correct": true,
                        "explain": "Correct! An AND gate requires ALL inputs to be 1 to produce an active 1."
                },
                {
                        "text": "1 (HIGH / 3.3V Power)",
                        "correct": false,
                        "explain": "Incorrect. Because Switch B is 0, the series pull-down NMOS path is broken, forcing output to 0."
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'inp_a', type: 'INPUT', label: 'A', x: 80, y: 80, value: 0 },
                { id: 'inp_b', type: 'INPUT', label: 'B', x: 80, y: 160, value: 0 }
            ],
            connections: []
        },
        steps: [
            {
                id: 'l1_step1',
                text: 'Drag an AND gate from the Palette on the left into the workspace canvas.',
                hint: 'Look under "Logic Gates" in the left sidebar. Click and drag the "AND" box onto the center of the canvas.',
                check: (graph) => getComps(graph).some(c => c.type === 'AND')
            },
            {
                id: 'l1_step2',
                text: 'Wire Input A to the first input of the AND gate.',
                hint: 'Click the small circular pin on the right edge of Input A, drag your mouse to the top-left pin of the AND gate, and release.',
                check: (graph) => {
                    const and = getComps(graph).find(c => c.type === 'AND');
                    const inA = graph.getInputComponents()[0];
                    return !!(and && inA && and.inputs[0].connectedTo && and.inputs[0].connectedTo.componentId === inA.id);
                }
            },
            {
                id: 'l1_step3',
                text: 'Wire Input B to the second input of the AND gate.',
                hint: 'Click the circle pin on the right edge of Input B, drag to the bottom-left pin of the AND gate, and release.',
                check: (graph) => {
                    const and = getComps(graph).find(c => c.type === 'AND');
                    const inB = graph.getInputComponents()[1];
                    return !!(and && inB && and.inputs[1].connectedTo && and.inputs[1].connectedTo.componentId === inB.id);
                }
            },
            {
                id: 'l1_step4',
                text: 'Add an Output component and wire the AND gate output to it.',
                hint: 'In the Palette under "IO Components", drag "Output" to the right of the AND gate. Connect the AND gate\'s right output pin to the Output\'s input pin.',
                check: (graph) => {
                    const and = getComps(graph).find(c => c.type === 'AND');
                    const outputs = graph.getOutputComponents();
                    return !!(and && outputs.length > 0 && outputs.some(o => o.inputs[0].connectedTo && o.inputs[0].connectedTo.componentId === and.id));
                }
            },
            {
                id: 'l1_step5',
                text: 'Interactive Test: Click Input A and B to set both to 1. Verify Output Y turns bright green (1).',
                hint: 'Click directly on the "0" box of Input A and Input B on the canvas to toggle them to 1. When both are 1, the wire and Output turn green!',
                check: (graph, simulator) => {
                    const inputs = graph.getInputComponents();
                    const outputs = graph.getOutputComponents();
                    if (inputs.length < 2 || outputs.length === 0) return false;
                    const res = simulator.evaluateWithInputs({ [inputs[0].id]: 1, [inputs[1].id]: 1 });
                    return !!(res.ok && res.outputs[outputs[0].id] === 1);
                }
            }
        ],
        validate: (graph, simulator) => {
            const inputs = graph.getInputComponents();
            const outputs = graph.getOutputComponents();

            if (inputs.length < 2) {
                return { pass: false, message: 'Circuit needs at least 2 Input components.' };
            }
            if (outputs.length < 1) {
                return { pass: false, message: 'Circuit needs an Output component connected to see the result.' };
            }

            const inA = inputs[0];
            const inB = inputs[1];
            const outY = outputs[0];

            // Test 4 truth table cases
            const truthCases = [
                { a: 0, b: 0, expected: 0 },
                { a: 0, b: 1, expected: 0 },
                { a: 1, b: 0, expected: 0 },
                { a: 1, b: 1, expected: 1 }
            ];

            for (const c of truthCases) {
                const res = simulator.evaluateWithInputs({ [inA.id]: c.a, [inB.id]: c.b });
                if (!res.ok) {
                    return { pass: false, message: `Evaluation error: ${res.error}` };
                }
                const actual = res.outputs[outY.id];
                if (actual !== c.expected) {
                    return {
                        pass: false,
                        message: `Incorrect truth table row! For A=${c.a}, B=${c.b}, expected Y=${c.expected}, but your circuit produced ${actual !== null ? actual : 'unconnected (?)'}.`
                    };
                }
            }

            return {
                pass: true,
                message: '🎉 Excellent! Your AND gate circuit produces the exact expected Boolean truth table across all 4 input combinations.'
            };
        }
    },

    {
        id: 'lesson-2-half-adder',
        title: '2. Building a Half Adder',
        difficulty: 'beginner',
        description: 'Implement a 1-bit binary adder with SUM and CARRY outputs.',
        objective: 'Build a circuit with 2 inputs (A, B) and 2 outputs (SUM, CARRY) where SUM = A ⊕ B and CARRY = A · B.',
        explanation: `
            A <strong>Half Adder</strong> is the basic building block of arithmetic logic units (ALUs).
            It adds two 1-bit binary numbers:
            <ul>
                <li><strong>SUM</strong> bit is generated by an <strong>XOR</strong> gate (1 when inputs differ: 0+1=1, 1+0=1).</li>
                <li><strong>CARRY</strong> bit is generated by an <strong>AND</strong> gate (1 when both inputs are 1: 1+1=10₂).</li>
            </ul>
        `,
        whatIsHappening: 'In binary math, 1 + 1 equals 2 (written as 10 in binary). The right bit is SUM (0) and the left bit is CARRY (1). The XOR gate detects when exactly one input is 1, while the AND gate detects when an overflow to the next bit column is required.',
        task: 'Add an XOR gate for SUM and an AND gate for CARRY. Connect inputs A and B to both gates, and connect each gate to its respective output.',
        solutionPreset: 'half-adder',
        quiz: {
        "question": "When adding binary 1 + 1, what are the SUM and CARRY outputs?",
        "options": [
                {
                        "text": "SUM = 0, CARRY = 1 (Binary 10 = Decimal 2)",
                        "correct": true,
                        "explain": "Correct! 1 + 1 = 2 (in binary '10'). The 1-bit SUM is 0 and CARRY is 1."
                },
                {
                        "text": "SUM = 1, CARRY = 1 (Binary 11 = Decimal 3)",
                        "correct": false,
                        "explain": "Incorrect. 1 + 1 = 2 ('10'), not 3 ('11')."
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'inp_a', type: 'INPUT', label: 'A', x: 80, y: 70, value: 0 },
                { id: 'inp_b', type: 'INPUT', label: 'B', x: 80, y: 170, value: 0 },
                { id: 'out_sum', type: 'OUTPUT', label: 'SUM', x: 440, y: 70 },
                { id: 'out_carry', type: 'OUTPUT', label: 'CARRY', x: 440, y: 170 }
            ],
            connections: []
        },
        steps: [
            {
                id: 'l2_step1',
                text: 'Place an XOR gate and an AND gate on the canvas.',
                hint: 'Drag "XOR" and "AND" from Logic Gates in the left Palette onto the canvas between the inputs and outputs.',
                check: (graph) => getComps(graph).some(c => c.type === 'XOR') && getComps(graph).find(c => c.type === 'AND')
            },
            {
                id: 'l2_step2',
                text: 'Connect Input A to both the XOR gate and the AND gate.',
                hint: 'Drag a wire from Input A pin to XOR pin 1, and another wire from Input A to AND pin 1 (fan-out).',
                check: (graph) => {
                    const xor = getComps(graph).find(c => c.type === 'XOR');
                    const and = getComps(graph).find(c => c.type === 'AND');
                    const inA = graph.getInputComponents()[0];
                    return !!(xor && and && inA && xor.inputs[0].connectedTo?.componentId === inA.id && and.inputs[0].connectedTo?.componentId === inA.id);
                }
            },
            {
                id: 'l2_step3',
                text: 'Connect Input B to both the XOR gate and the AND gate.',
                hint: 'Drag a wire from Input B pin to XOR pin 2, and another wire from Input B to AND pin 2.',
                check: (graph) => {
                    const xor = getComps(graph).find(c => c.type === 'XOR');
                    const and = getComps(graph).find(c => c.type === 'AND');
                    const inB = graph.getInputComponents()[1];
                    return !!(xor && and && inB && xor.inputs[1].connectedTo?.componentId === inB.id && and.inputs[1].connectedTo?.componentId === inB.id);
                }
            },
            {
                id: 'l2_step4',
                text: 'Wire the XOR output to SUM, and the AND output to CARRY.',
                hint: 'Drag a wire from the XOR output pin to the SUM output component, and from the AND output to the CARRY output component.',
                check: (graph) => {
                    const xor = getComps(graph).find(c => c.type === 'XOR');
                    const and = getComps(graph).find(c => c.type === 'AND');
                    const outputs = graph.getOutputComponents();
                    const sumOut = outputs.find(o => o.label.toUpperCase().includes('SUM')) || outputs[0];
                    const carryOut = outputs.find(o => o.label.toUpperCase().includes('CARRY')) || outputs[1];
                    return !!(xor && and && sumOut?.inputs[0].connectedTo?.componentId === xor.id && carryOut?.inputs[0].connectedTo?.componentId === and.id);
                }
            },
            {
                id: 'l2_step5',
                text: 'Test Binary Addition: Set A=1, B=1. Verify SUM=0 and CARRY=1 (1 + 1 = 2).',
                hint: 'Click Input A and Input B to set both to 1. SUM should turn gray (0) and CARRY should turn green (1)!',
                check: (graph, simulator) => {
                    const inputs = graph.getInputComponents();
                    const outputs = graph.getOutputComponents();
                    if (inputs.length < 2 || outputs.length < 2) return false;
                    const res = simulator.evaluateWithInputs({ [inputs[0].id]: 1, [inputs[1].id]: 1 });
                    const sumOut = outputs.find(o => o.label.toUpperCase().includes('SUM')) || outputs[0];
                    const carryOut = outputs.find(o => o.label.toUpperCase().includes('CARRY')) || outputs[1];
                    return !!(res.ok && res.outputs[sumOut.id] === 0 && res.outputs[carryOut.id] === 1);
                }
            }
        ],
        validate: (graph, simulator) => {
            const inputs = graph.getInputComponents();
            const outputs = graph.getOutputComponents();

            if (inputs.length < 2) {
                return { pass: false, message: 'Circuit requires 2 inputs (A and B).' };
            }
            if (outputs.length < 2) {
                return { pass: false, message: 'Circuit requires 2 outputs (one for SUM, one for CARRY).' };
            }

            const inA = inputs[0];
            const inB = inputs[1];

            // Match output by label or position
            let sumOut = outputs.find(o => o.label.toUpperCase().includes('SUM')) || outputs[0];
            let carryOut = outputs.find(o => o.label.toUpperCase().includes('CARRY')) || outputs[1];
            if (sumOut.id === carryOut.id) {
                carryOut = outputs.find(o => o.id !== sumOut.id) || outputs[1];
            }

            // Expected truth table: [A, B, SUM, CARRY]
            const tests = [
                { a: 0, b: 0, s: 0, c: 0 },
                { a: 0, b: 1, s: 1, c: 0 },
                { a: 1, b: 0, s: 1, c: 0 },
                { a: 1, b: 1, s: 0, c: 1 }
            ];

            for (const t of tests) {
                const res = simulator.evaluateWithInputs({ [inA.id]: t.a, [inB.id]: t.b });
                if (!res.ok) {
                    return { pass: false, message: `Evaluation failed: ${res.error}` };
                }

                const actualS = res.outputs[sumOut.id];
                const actualC = res.outputs[carryOut.id];

                if (actualS !== t.s || actualC !== t.c) {
                    return {
                        pass: false,
                        message: `Mismatch for inputs A=${t.a}, B=${t.b}: Expected SUM=${t.s}, CARRY=${t.c}. Got SUM=${actualS !== null ? actualS : '?'}, CARRY=${actualC !== null ? actualC : '?'}.`
                    };
                }
            }

            return {
                pass: true,
                message: '🎉 Perfect! Both SUM (XOR) and CARRY (AND) evaluate correctly for all binary combinations. Check the generated Verilog to see your continuous assign statements!'
            };
        }
    },

    {
        id: 'lesson-3-mux',
        title: '3. Understanding a 2:1 MUX',
        difficulty: 'intermediate',
        description: 'Build selection logic where a control signal routes one of two data inputs to the output.',
        objective: 'Construct a 2:1 multiplexer where Y = Sel ? B : A.',
        explanation: `
            Multiplexers (MUXes) are the data selectors of digital systems.
            They implement conditional routing in hardware, equivalent to Verilog's ternary operator <code>assign y = sel ? b : a;</code> or <code>if (sel) y = b; else y = a;</code>.
        `,
        whatIsHappening: 'In hardware, a 2:1 MUX acts as an electronic selector switch. When Sel=0, data passes from pin A to output Y. When Sel=1, data passes from pin B to output Y. In ASIC synthesis, this continuous dataflow models transmission gates or standard multiplexer cells.',
        task: 'Place a 2:1 MUX component. Connect input A to port 0, input B to port 1, input Sel to the selection pin (bottom), and route the output to Y.',
        solutionPreset: 'mux-2to1',
        quiz: {
        "question": "In a 2:1 Multiplexer with inputs In0 and In1, which input is forwarded to Out when Sel = 1?",
        "options": [
                {
                        "text": "In1",
                        "correct": true,
                        "explain": "Correct! Sel = 0 steers In0; Sel = 1 steers In1."
                },
                {
                        "text": "In0",
                        "correct": false,
                        "explain": "Incorrect. In0 is selected when Sel = 0."
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'inp_a', type: 'INPUT', label: 'A', x: 80, y: 60, value: 0 },
                { id: 'inp_b', type: 'INPUT', label: 'B', x: 80, y: 140, value: 1 },
                { id: 'inp_sel', type: 'INPUT', label: 'Sel', x: 160, y: 220, value: 0 },
                { id: 'out_y', type: 'OUTPUT', label: 'Y', x: 440, y: 100 }
            ],
            connections: []
        },
        steps: [
            {
                id: 'l3_step1',
                text: 'Place a 2:1 MUX (MUX2) component on the canvas.',
                hint: 'Look under "Selection Logic" in the left Palette. Drag the "MUX2" component into the center between the inputs and output Y.',
                check: (graph) => getComps(graph).some(c => c.type === 'MUX2')
            },
            {
                id: 'l3_step2',
                text: 'Connect Input A to port in0 (top-left) of the MUX.',
                hint: 'Drag a wire from Input A (right pin) to the top input pin of the MUX2 component.',
                check: (graph) => {
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    const inA = graph.getInputComponents().find(i => i.label.toUpperCase() === 'A');
                    return !!(mux && inA && mux.inputs[0].connectedTo?.componentId === inA.id);
                }
            },
            {
                id: 'l3_step3',
                text: 'Connect Input B to port in1 (middle-left) of the MUX.',
                hint: 'Drag a wire from Input B (right pin) to the second input pin of the MUX2 component.',
                check: (graph) => {
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    const inB = graph.getInputComponents().find(i => i.label.toUpperCase() === 'B');
                    return !!(mux && inB && mux.inputs[1].connectedTo?.componentId === inB.id);
                }
            },
            {
                id: 'l3_step4',
                text: 'Connect Input Sel to select port in2 (bottom pin) of the MUX.',
                hint: 'Drag a wire from Input Sel (right pin) to the bottom pin of the MUX2 component.',
                check: (graph) => {
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    const inSel = graph.getInputComponents().find(i => i.label.toUpperCase().includes('SEL'));
                    return !!(mux && inSel && mux.inputs[2].connectedTo?.componentId === inSel.id);
                }
            },
            {
                id: 'l3_step5',
                text: 'Connect MUX output out0 to Output Y.',
                hint: 'Drag a wire from the right output pin of the MUX2 component to the input pin of Output Y.',
                check: (graph) => {
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    const outY = graph.getOutputComponents()[0];
                    return !!(mux && outY && outY.inputs[0].connectedTo?.componentId === mux.id);
                }
            }
        ],
        validate: (graph, simulator) => {
            const inputs = graph.getInputComponents();
            const outputs = graph.getOutputComponents();

            if (inputs.length < 3) {
                return { pass: false, message: 'A 2:1 MUX requires 3 inputs: A, B, and Sel.' };
            }
            if (outputs.length < 1) {
                return { pass: false, message: 'Circuit requires an output Y.' };
            }

            const inA = inputs.find(i => i.label.toUpperCase() === 'A') || inputs[0];
            const inB = inputs.find(i => i.label.toUpperCase() === 'B') || inputs[1];
            const inSel = inputs.find(i => i.label.toUpperCase().includes('SEL')) || inputs[2];
            const outY = outputs[0];

            // 8 input test cases
            for (let a = 0; a <= 1; a++) {
                for (let b = 0; b <= 1; b++) {
                    for (let s = 0; s <= 1; s++) {
                        const expected = s === 0 ? a : b;
                        const res = simulator.evaluateWithInputs({
                            [inA.id]: a,
                            [inB.id]: b,
                            [inSel.id]: s
                        });
                        if (!res.ok) {
                            return { pass: false, message: `Evaluation failed: ${res.error}` };
                        }
                        const actual = res.outputs[outY.id];
                        if (actual !== expected) {
                            return {
                                pass: false,
                                message: `Incorrect MUX behavior! When Sel=${s}, A=${a}, B=${b}: expected output ${expected}, but got ${actual !== null ? actual : '?'}.`
                            };
                        }
                    }
                }
            }

            return {
                pass: true,
                message: '🎉 Correct! Your 2:1 multiplexer successfully routes input A when Sel=0 and input B when Sel=1.'
            };
        }
    },

    {
        id: 'lesson-4-dff',
        title: '4. Sequential Logic & Flip-Flops',
        difficulty: 'intermediate',
        description: 'Observe edge-triggered behavior and state retention between clock cycles.',
        objective: 'Understand how a D flip-flop updates Q only on rising clock edges and retains data otherwise.',
        explanation: `
            Unlike combinational gates where outputs change immediately when inputs change, <strong>sequential circuits</strong> have memory.
            A <strong>D Flip-Flop (DFF)</strong> samples data input D only when the clock transitions from <strong>0 to 1</strong> (the rising edge).
            Between rising edges, the stored output Q remains unchanged even if D changes!
        `,
        whatIsHappening: 'A D Flip-Flop consists of Master and Slave latches. When the clock rises from 0 to 1, the Master locks in the current value of input D, and the Slave propagates it to output Q. State updates happen in lockstep with the clock frequency, forming the basis of all synchronous digital microprocessors.',
        task: 'Open the "Waveform Viewer" tab below, click "Clock Step" twice to observe rising and falling clock edges, and verify that Q only updates on posedge clk.',
        solutionPreset: 'dff-demo',
        quiz: {
        "question": "When does a D Flip-Flop copy the value on input D to output Q?",
        "options": [
                {
                        "text": "Only on the instant of the rising clock edge (0 -> 1)",
                        "correct": true,
                        "explain": "Correct! Edge-triggered flip-flops sample data precisely on the positive clock edge."
                },
                {
                        "text": "Continuously whenever the clock is high (1)",
                        "correct": false,
                        "explain": "Incorrect. That would be a level-sensitive latch, not an edge-triggered flip-flop!"
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'inp_d', type: 'INPUT', label: 'D', x: 80, y: 90, value: 1 },
                { id: 'clk_1', type: 'CLOCK', label: 'CLK', x: 80, y: 180, value: 0 },
                { id: 'dff_1', type: 'DFF', label: 'DFF', x: 260, y: 100 },
                { id: 'out_q', type: 'OUTPUT', label: 'Q', x: 440, y: 115 }
            ],
            connections: [
                { fromComponent: 'inp_d', fromPin: 'inp_d.out0', toComponent: 'dff_1', toPin: 'dff_1.in0' },
                { fromComponent: 'clk_1', fromPin: 'clk_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in1' },
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'out_q', toPin: 'out_q.in0' }
            ]
        },
        steps: [
            {
                id: 'l4_step1',
                text: 'Verify Circuit Wiring: DFF is connected to D input, CLK clock, and Output Q.',
                hint: 'The starter circuit is already wired for you! Input D goes to pin D, Clock goes to pin CLK, and pin Q goes to Output.',
                check: (graph) => {
                    const dff = graph.getDFFComponents()[0];
                    return !!(dff && dff.inputs[0].connectedTo && dff.inputs[1].connectedTo);
                }
            },
            {
                id: 'l4_step2',
                text: 'Open the "Waveform Viewer" tab in the bottom drawer.',
                hint: 'Click the "Waveform Viewer" tab at the bottom of the screen to open the timing diagram viewer.',
                check: () => true
            },
            {
                id: 'l4_step3',
                text: 'Click "Clock Step" to create a rising clock edge (CLK: 0 -> 1).',
                hint: 'In the Waveform Viewer panel, find and click the "Clock Step" button. Watch the CLK signal rise to 1 and Q capture 1.',
                check: (graph, sim, seq) => (seq ? seq.getWaveformHistory().length >= 1 : false)
            },
            {
                id: 'l4_step4',
                text: 'Click "Clock Step" again to return CLK to 0 and complete 1 full clock cycle.',
                hint: 'Click "Clock Step" a second time so the clock finishes its square pulse back to 0.',
                check: (graph, sim, seq) => (seq ? seq.getWaveformHistory().length >= 2 : false)
            },
            {
                id: 'l4_step5',
                text: 'Observe State Retention: Toggle Input D to 0 and notice Q stays 1 until next clock edge!',
                hint: 'Click Input D on the canvas. Notice the wire to D turns gray (0), but Output Q stays green (1) because no rising clock edge occurred!',
                check: (graph, sim, seq) => (seq ? seq.getWaveformHistory().length >= 2 : false)
            }
        ],
        validate: (graph, simulator, sequentialEngine) => {
            const dffs = graph.getDFFComponents();
            if (dffs.length === 0) {
                return { pass: false, message: 'Circuit must include at least one D Flip-Flop.' };
            }
            if (graph.getClockComponents().length === 0) {
                return { pass: false, message: 'Circuit must include a Clock component.' };
            }

            const dff = dffs[0];
            const dPin = dff.inputs[0];
            const clkPin = dff.inputs[1];

            if (!dPin.connectedTo || !clkPin.connectedTo) {
                return { pass: false, message: 'Both the D input and CLK input of the flip-flop must be connected.' };
            }

            // Verify output component is connected to Q
            const outputs = graph.getOutputComponents();
            if (outputs.length === 0) {
                return { pass: false, message: 'Circuit must include an Output component to observe Q.' };
            }
            const qConnected = outputs.some(out => {
                const inPin = out.inputs[0];
                return inPin.connectedTo && inPin.connectedTo.componentId === dff.id;
            });
            if (!qConnected) {
                return { pass: false, message: 'Connect the D Flip-Flop Q output to the Output component.' };
            }

            // Check if sequential engine has recorded waveform steps
            const history = sequentialEngine ? sequentialEngine.getWaveformHistory() : [];
            if (history.length < 2) {
                return {
                    pass: false,
                    message: 'Please open the "Waveform Viewer" tab and click "Clock Step" at least twice to observe the rising and falling edges!'
                };
            }

            return {
                pass: true,
                message: '🎉 Great job exploring sequential logic! Check the Waveform tab to see how Q updates strictly aligned with rising clock edges.'
            };
        }
    },

    {
        id: 'lesson-5-mux-cond',
        title: '5. Conditional Selection (MUX)',
        difficulty: 'intermediate',
        description: 'Implement data selection logic mapping to the RTL ternary operator assign y = sel ? b : a.',
        objective: 'Route input A when Sel=0 and input B when Sel=1 to output Y.',
        explanation: `
            Multiplexers are the hardware manifestation of conditional execution.
            In synthesizable Verilog, this is written as continuous assignment <code>assign y = sel ? b : a;</code> or procedural <code>if/else</code>.
            When <strong>Sel is 0</strong>, path A is selected. When <strong>Sel is 1</strong>, path B is selected.
        `,
        whatIsHappening: 'In Verilog, conditional selection is expressed as assign y = sel ? b : a; (ternary operator) or procedural if (sel) y = b; else y = a;. In physical silicon, logic synthesis compilers map both descriptions into a standard multiplexer library cell.',
        task: 'Connect inputs A and B to the data pins of the 2:1 MUX, connect Sel to the select pin (bottom), and route the output to Y. Verify across all 8 truth table combinations.',
        solutionPreset: 'mux-cond',
        quiz: {
        "question": "In Verilog, what hardware does the continuous assignment `assign y = sel ? b : a;` infer?",
        "options": [
                {
                        "text": "A 2:1 multiplexer",
                        "correct": true,
                        "explain": "Correct! The ternary conditional operator (? :) synthesizes directly into a multiplexer."
                },
                {
                        "text": "A D flip-flop register",
                        "correct": false,
                        "explain": "Incorrect. Flip-flops require an edge-triggered always @(posedge clk) block."
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'inp_a', type: 'INPUT', label: 'A', x: 80, y: 70, value: 0 },
                { id: 'inp_b', type: 'INPUT', label: 'B', x: 80, y: 150, value: 1 },
                { id: 'inp_sel', type: 'INPUT', label: 'Sel', x: 180, y: 240, value: 0 },
                { id: 'mux_1', type: 'MUX2', label: 'MUX', x: 280, y: 110 },
                { id: 'out_y', type: 'OUTPUT', label: 'Y', x: 460, y: 110 }
            ],
            connections: []
        },
        steps: [
            {
                id: 'l5_step1',
                text: 'Wire Input A to MUX pin in0 (port 0).',
                hint: 'Drag a wire from Input A (right pin) to the top input pin of the MUX2 component.',
                check: (graph) => {
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    const inA = graph.getInputComponents().find(i => i.label.toUpperCase() === 'A');
                    return !!(mux && inA && mux.inputs[0].connectedTo?.componentId === inA.id);
                }
            },
            {
                id: 'l5_step2',
                text: 'Wire Input B to MUX pin in1 (port 1).',
                hint: 'Drag a wire from Input B (right pin) to the second input pin of the MUX2 component.',
                check: (graph) => {
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    const inB = graph.getInputComponents().find(i => i.label.toUpperCase() === 'B');
                    return !!(mux && inB && mux.inputs[1].connectedTo?.componentId === inB.id);
                }
            },
            {
                id: 'l5_step3',
                text: 'Wire Input Sel to MUX pin in2 (select pin at the bottom).',
                hint: 'Drag a wire from Input Sel (right pin) to the bottom pin of the MUX2 component.',
                check: (graph) => {
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    const inSel = graph.getInputComponents().find(i => i.label.toUpperCase().includes('SEL'));
                    return !!(mux && inSel && mux.inputs[2].connectedTo?.componentId === inSel.id);
                }
            },
            {
                id: 'l5_step4',
                text: 'Wire MUX output out0 to Output Y.',
                hint: 'Drag a wire from the right output pin of the MUX2 component to the input pin of Output Y.',
                check: (graph) => {
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    const outY = graph.getOutputComponents()[0];
                    return !!(mux && outY && outY.inputs[0].connectedTo?.componentId === mux.id);
                }
            },
            {
                id: 'l5_step5',
                text: 'Inspect Generated Verilog: Open the "Generated Verilog" tab below to observe assign y = sel ? b : a.',
                hint: 'Click the "Generated Verilog" tab at the bottom to view the synthesizable HDL code.',
                check: () => true
            }
        ],
        validate: (graph, simulator) => {
            const inputs = graph.getInputComponents();
            const outputs = graph.getOutputComponents();

            if (inputs.length < 3) {
                return { pass: false, message: 'Circuit requires 3 inputs: A, B, and Sel.' };
            }
            if (outputs.length < 1) {
                return { pass: false, message: 'Circuit requires an Output component Y.' };
            }

            const inA = inputs.find(i => i.label.toUpperCase() === 'A') || inputs[0];
            const inB = inputs.find(i => i.label.toUpperCase() === 'B') || inputs[1];
            const inSel = inputs.find(i => i.label.toUpperCase().includes('SEL')) || inputs[2];
            const outY = outputs[0];

            for (let a = 0; a <= 1; a++) {
                for (let b = 0; b <= 1; b++) {
                    for (let s = 0; s <= 1; s++) {
                        const expected = s === 0 ? a : b;
                        const res = simulator.evaluateWithInputs({
                            [inA.id]: a,
                            [inB.id]: b,
                            [inSel.id]: s
                        });
                        if (!res.ok) {
                            return { pass: false, message: `Evaluation failed: ${res.error}` };
                        }
                        const actual = res.outputs[outY.id];
                        if (actual !== expected) {
                            return {
                                pass: false,
                                message: `Mismatch when Sel=${s}, A=${a}, B=${b}: Expected Y=${expected}, got ${actual !== null ? actual : '?'}.`
                            };
                        }
                    }
                }
            }

            return {
                pass: true,
                message: '🎉 Excellent! Conditional data selection verified across all 8 combinations. Check the Generated Verilog tab to see assign y = sel ? b : a.'
            };
        }
    },

    {
        id: 'lesson-6-reg-enable',
        title: '6. Register with Clock Enable',
        difficulty: 'advanced',
        description: 'Construct a clock-enabled DFF using the ASIC recirculating data MUX architecture.',
        objective: 'Build a register where Q only loads D when EN=1 on rising clock edge; when EN=0, Q recirculates and holds.',
        explanation: `
            In physical ASIC synthesis, clock gating using logic gates is strictly avoided because it introduces clock skew and timing violations.
            Instead, clock enable is implemented using a <strong>recirculating MUX</strong> before the flip-flop:
            <code>always @(posedge clk) if (en) q &lt;= d;</code>
            When EN is 0, the previous Q is fed back into D, holding state safely.
        `,
        whatIsHappening: 'In physical ASIC cell libraries, clock gating using external logic gates creates clock skew and clock tree violations. Instead, hardware designers implement clock enable using an input multiplexer that loops output Q back to data input D when EN=0. The flip-flop still receives a clean, un-gated clock pulse, but safely re-loads its own current value!',
        task: 'Wire the circuit: connect D to MUX in1, loop DFF Q back to MUX in0, connect EN to MUX select, and route MUX output to DFF data in. Step the clock in Waveform tab to verify that D is ignored when EN=0.',
        solutionPreset: 'reg-enable',
        quiz: {
        "question": "When Enable (EN) = 0 on a register with clock enable, what happens on the next clock tick?",
        "options": [
                {
                        "text": "It recirculates its current Q value (holds state)",
                        "correct": true,
                        "explain": "Correct! When EN=0, the recirculation MUX routes Q back into D, holding the stored value."
                },
                {
                        "text": "It clears to 0",
                        "correct": false,
                        "explain": "Incorrect. Reset is controlled by RST, not EN. EN=0 simply holds state."
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 60, y: 70, value: 1 },
                { id: 'input_en', type: 'INPUT', label: 'EN', x: 60, y: 190, value: 0 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 60, y: 260, value: 0 },
                { id: 'mux_1', type: 'MUX2', label: 'MUX', x: 220, y: 90 },
                { id: 'dff_1', type: 'DFF', label: 'DFF', x: 360, y: 100 },
                { id: 'output_q', type: 'OUTPUT', label: 'Q', x: 500, y: 115 }
            ],
            connections: [
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in1' },
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'output_q', toPin: 'output_q.in0' }
            ]
        },
        steps: [
            {
                id: 'l6_step1',
                text: 'Connect MUX output to the DFF data input.',
                hint: 'Drag a wire from the MUX output pin (right side) to DFF input pin D (top-left pin).',
                check: (graph) => {
                    const dff = graph.getDFFComponents()[0];
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    return !!(dff && mux && dff.inputs[0].connectedTo?.componentId === mux.id);
                }
            },
            {
                id: 'l6_step2',
                text: 'Wire the Recirculating Loop: Connect DFF output Q back to MUX pin in0.',
                hint: 'Drag a wire from DFF output pin Q (or Output Q) back to port in0 (top-left) of the MUX. This retains state when EN=0!',
                check: (graph) => {
                    const dff = graph.getDFFComponents()[0];
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    return !!(dff && mux && mux.inputs[0].connectedTo?.componentId === dff.id);
                }
            },
            {
                id: 'l6_step3',
                text: 'Connect Input D to MUX pin in1 (new data load path).',
                hint: 'Drag a wire from Input D to port in1 (middle-left pin) of the MUX.',
                check: (graph) => {
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    const inD = graph.getInputComponents().find(i => i.label.toUpperCase() === 'D');
                    return !!(mux && inD && mux.inputs[1].connectedTo?.componentId === inD.id);
                }
            },
            {
                id: 'l6_step4',
                text: 'Connect Input EN to MUX select pin in2 (bottom pin).',
                hint: 'Drag a wire from Input EN to the select pin (bottom) of the MUX.',
                check: (graph) => {
                    const mux = getComps(graph).find(c => c.type === 'MUX2');
                    const inEn = graph.getInputComponents().find(i => i.label.toUpperCase() === 'EN');
                    return !!(mux && inEn && mux.inputs[2].connectedTo?.componentId === inEn.id);
                }
            },
            {
                id: 'l6_step5',
                text: 'Step Clock in Waveform Tab: With EN=0, pulse the clock to observe state retention (Q holds 0).',
                hint: 'Go to the Waveform Viewer tab and click "Clock Step" twice. When EN=0, D=1 is safely ignored!',
                check: (graph, sim, seq) => (seq ? seq.getWaveformHistory().length >= 2 : false)
            }
        ],
        validate: (graph, simulator, sequentialEngine) => {
            const dffs = graph.getDFFComponents();
            const muxes = Array.from(graph.components.values()).filter(c => c.type === 'MUX2');
            const clocks = graph.getClockComponents();
            const outputs = graph.getOutputComponents();
            const inputs = graph.getInputComponents();

            if (dffs.length === 0 || muxes.length === 0 || clocks.length === 0 || outputs.length === 0) {
                return { pass: false, message: 'Circuit must include a DFF, a 2:1 MUX, a Clock, and an Output component.' };
            }

            const dff = dffs[0];
            const mux = muxes[0];
            const clk = clocks[0];
            const outQ = outputs[0];

            const inD = inputs.find(i => i.label.toUpperCase() === 'D') || inputs[0];
            const inEn = inputs.find(i => i.label.toUpperCase() === 'EN') || inputs[1];

            // Structural check: DFF input connected to MUX output
            if (!dff.inputs[0].connectedTo || dff.inputs[0].connectedTo.componentId !== mux.id) {
                return { pass: false, message: 'The D input of the flip-flop must be driven by the output of the 2:1 MUX.' };
            }

            // Check feedback loop: MUX has an input driven by DFF output
            const muxHasFeedback = mux.inputs.some(p => p.connectedTo && p.connectedTo.componentId === dff.id);
            if (!muxHasFeedback) {
                return { pass: false, message: 'The recirculating loop is missing: connect DFF Q output back to MUX input 0 (hold state).' };
            }

            if (!sequentialEngine) {
                return { pass: true, message: 'Structural wiring valid.' };
            }

            // Behavioral verification using sequential engine
            sequentialEngine.reset();
            sequentialEngine.initializeDFFs();
            simulator.evaluate();

            // Test 1: EN=0, D=1. Apply posedge -> Q must stay 0
            graph.setInputValue(inD.id, 1);
            graph.setInputValue(inEn.id, 0);
            simulator.evaluate();
            sequentialEngine.clockStep(); // 0 -> 1
            sequentialEngine.clockStep(); // 1 -> 0
            if (sequentialEngine.getDFFState(dff.id).Q !== 0) {
                return { pass: false, message: 'Clock Enable failed: When EN=0, rising clock must NOT load D=1 into Q.' };
            }

            // Test 2: EN=1, D=1. Apply posedge -> Q must update to 1
            graph.setInputValue(inEn.id, 1);
            simulator.evaluate();
            sequentialEngine.clockStep(); // 0 -> 1
            sequentialEngine.clockStep(); // 1 -> 0
            if (sequentialEngine.getDFFState(dff.id).Q !== 1) {
                return { pass: false, message: 'Load failed: When EN=1, rising clock must load D=1 into Q.' };
            }

            // Test 3: EN=0, D=0. Apply posedge -> Q must hold 1
            graph.setInputValue(inD.id, 0);
            graph.setInputValue(inEn.id, 0);
            simulator.evaluate();
            sequentialEngine.clockStep(); // 0 -> 1
            sequentialEngine.clockStep(); // 1 -> 0
            if (sequentialEngine.getDFFState(dff.id).Q !== 1) {
                return { pass: false, message: 'Retention failed: When EN=0 and D changes to 0, Q must retain 1.' };
            }

            return {
                pass: true,
                message: '🎉 Perfect! Your recirculating clock enable register holds state when EN=0 and synchronously loads when EN=1. This is the exact pattern synthesized by ASIC standard cell libraries.'
            };
        }
    },

    {
        id: 'lesson-7-sync-reset',
        title: '7. Register with Synchronous Reset',
        difficulty: 'advanced',
        description: 'Build synchronous reset logic forcing flip-flop Q to 0 on posedge clk when RST=1.',
        objective: 'Implement synchronous reset logic where Q <= RST ? 0 : D on the rising clock edge.',
        explanation: `
            Synchronous reset guarantees that state resets in total alignment with the clock network, avoiding asynchronous recovery/removal timing hazards.
            In RTL:
            <code>always @(posedge clk) begin if (rst) q &lt;= 1'b0; else q &lt;= d; end</code>
            In gate-level synthesis, this maps to an AND gate with inverted reset: <code>D_eff = D &amp; (~RST)</code>.
        `,
        whatIsHappening: 'In physical chips, synchronous reset ensures registers only clear their state on the rising clock edge (0→1). This eliminates unpredictable transient glitches and metastability. In logic gates, this is built using an inverter and an AND gate: D_effective = D & (~RST). When RST is 1, the inverted signal is 0, forcing the AND gate to 0 so the flip-flop captures 0 on the next clock pulse.',
        task: 'Route RST into the NOT gate. Connect the NOT gate output and Input D to the AND gate. Connect the AND gate output to the DFF data input. Step the clock with RST=1 in the Waveform Viewer to verify that Q synchronously resets to 0.',
        solutionPreset: 'reg-sync-reset',
        quiz: {
        "question": "Why is synchronous reset preferred over asynchronous reset in high-speed digital ASICs?",
        "options": [
                {
                        "text": "Eliminates spurious glitch resets and prevents reset removal timing violations",
                        "correct": true,
                        "explain": "Correct! Synchronous reset is filtered by the clock, preventing glitches from resetting the chip."
                },
                {
                        "text": "It requires zero silicon area",
                        "correct": false,
                        "explain": "Incorrect. Synchronous reset requires a logic gate or MUX before D."
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 60, y: 70, value: 1 },
                { id: 'input_rst', type: 'INPUT', label: 'RST', x: 60, y: 160, value: 0 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 60, y: 250, value: 0 },
                { id: 'not_1', type: 'NOT', label: 'NOT', x: 180, y: 160 },
                { id: 'and_1', type: 'AND', label: 'AND', x: 280, y: 90 },
                { id: 'dff_1', type: 'DFF', label: 'DFF', x: 380, y: 100 },
                { id: 'output_q', type: 'OUTPUT', label: 'Q', x: 520, y: 115 }
            ],
            connections: [
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in1' },
                { fromComponent: 'dff_1', fromPin: 'dff_1.out0', toComponent: 'output_q', toPin: 'output_q.in0' }
            ]
        },
        steps: [
            {
                id: 'l7_step1',
                text: 'Wire Input RST into the NOT gate input pin.',
                hint: 'Drag a wire from Input RST (right pin) to the input pin of the NOT gate.',
                check: (graph) => {
                    const notGate = getComps(graph).find(c => c.type === 'NOT');
                    const inRst = graph.getInputComponents().find(i => i.label.toUpperCase() === 'RST');
                    return !!(notGate && inRst && notGate.inputs[0].connectedTo?.componentId === inRst.id);
                }
            },
            {
                id: 'l7_step2',
                text: 'Wire Input D to the top input (in0) of the AND gate.',
                hint: 'Drag a wire from Input D (right pin) to the top input pin of the AND gate.',
                check: (graph) => {
                    const andGate = getComps(graph).find(c => c.type === 'AND');
                    const inD = graph.getInputComponents().find(i => i.label.toUpperCase() === 'D');
                    return !!(andGate && inD && (andGate.inputs[0].connectedTo?.componentId === inD.id || andGate.inputs[1].connectedTo?.componentId === inD.id));
                }
            },
            {
                id: 'l7_step3',
                text: 'Wire the NOT gate output to the other input of the AND gate.',
                hint: 'Drag a wire from the right output pin of the NOT gate to the second input pin of the AND gate.',
                check: (graph) => {
                    const andGate = getComps(graph).find(c => c.type === 'AND');
                    const notGate = getComps(graph).find(c => c.type === 'NOT');
                    return !!(andGate && notGate && (andGate.inputs[0].connectedTo?.componentId === notGate.id || andGate.inputs[1].connectedTo?.componentId === notGate.id));
                }
            },
            {
                id: 'l7_step4',
                text: 'Wire the AND gate output to the DFF data input (pin D).',
                hint: 'Drag a wire from the right output pin of the AND gate to the top-left pin (in0) of the DFF.',
                check: (graph) => {
                    const dff = graph.getDFFComponents()[0];
                    const andGate = getComps(graph).find(c => c.type === 'AND');
                    return !!(dff && andGate && dff.inputs[0].connectedTo?.componentId === andGate.id);
                }
            },
            {
                id: 'l7_step5',
                text: 'Step Clock in Waveform Viewer: Set RST=1 and pulse the clock to observe synchronous clearing.',
                hint: 'Toggle RST to 1. Open the Waveform Viewer tab and click "Clock Step" twice. Notice Q is forced to 0!',
                check: (graph, sim, seq) => (seq ? seq.getWaveformHistory().length >= 2 : false)
            }
        ],
        validate: (graph, simulator, sequentialEngine) => {
            const dffs = graph.getDFFComponents();
            const clocks = graph.getClockComponents();
            const inputs = graph.getInputComponents();

            if (dffs.length === 0 || clocks.length === 0) {
                return { pass: false, message: 'Circuit must include a DFF and a Clock.' };
            }

            const dff = dffs[0];
            const inD = inputs.find(i => i.label.toUpperCase() === 'D') || inputs[0];
            const inRst = inputs.find(i => i.label.toUpperCase() === 'RST') || inputs[1];

            if (!dff.inputs[0].connectedTo) {
                return { pass: false, message: 'Connect the reset gating logic to the DFF data input.' };
            }

            if (!sequentialEngine) {
                return { pass: true, message: 'Structural wiring valid.' };
            }

            // Behavioral test
            sequentialEngine.reset();
            sequentialEngine.initializeDFFs();
            simulator.evaluate();

            // Test 1: RST=0, D=1 -> Q becomes 1
            graph.setInputValue(inRst.id, 0);
            graph.setInputValue(inD.id, 1);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();
            if (sequentialEngine.getDFFState(dff.id).Q !== 1) {
                return { pass: false, message: 'Normal loading failed: When RST=0 and D=1, rising clock should set Q=1.' };
            }

            // Test 2: RST=1, D=1 -> Q synchronously resets to 0!
            graph.setInputValue(inRst.id, 1);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();
            if (sequentialEngine.getDFFState(dff.id).Q !== 0) {
                return { pass: false, message: 'Synchronous reset failed: When RST=1, rising clock must force Q to 0 even if D=1.' };
            }

            // Test 3: RST=0, D=1 -> Q loads 1 again
            graph.setInputValue(inRst.id, 0);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();
            if (sequentialEngine.getDFFState(dff.id).Q !== 1) {
                return { pass: false, message: 'Reset deassertion failed: When RST returns to 0, normal operation must resume.' };
            }

            return {
                pass: true,
                message: '🎉 Outstanding! Synchronous reset verified. When RST=1, the active clock edge synchronously clears state without glitches.'
            };
        }
    },

    {
        id: 'lesson-8-clock-timing',
        title: '8. Clock Edge Timing & Pipelines',
        difficulty: 'advanced',
        description: 'Explore cycle-by-cycle latency across a multi-stage flip-flop pipeline.',
        objective: 'Observe how data pulses propagate through a 2-stage shift register strictly on rising clock edges.',
        explanation: `
            In synchronous digital systems, logic stages are partitioned by registers.
            Each register introduces exactly <strong>1 clock cycle of latency</strong>.
            In a 2-stage pipeline ($D \\to \\text{DFF}_1 \\to \\text{DFF}_2$), a pulse on D appears at $Q_1$ on cycle 1, and at $Q_2$ on cycle 2.
            This cycle-by-cycle pipeline isolation allows ASICs to run at high clock frequencies.
        `,
        whatIsHappening: 'Every flip-flop is a 1-clock-cycle delay element. In this 2-stage pipeline, data at D enters Stage 1 on the first clock edge. On the next clock edge, Stage 1 passes its data into Stage 2. Pipelining allows digital processors to divide complex math into single-cycle steps, running at gigahertz clock speeds without timing violations.',
        task: 'Connect Input D to DFF1 data input, connect DFF1 Q to DFF2 data input, and connect outputs Q1 and Q2. Step the clock in Waveform Viewer to observe data shifting cycle-by-cycle.',
        solutionPreset: 'shift-reg-2stage',
        quiz: {
        "question": "In a 2-stage shift register (DFF1 -> DFF2), if DFF1 contains 1 and DFF2 contains 0, what happens on a clock edge?",
        "options": [
                {
                        "text": "DFF2 captures 1 (the OLD value of DFF1) at the exact same time DFF1 captures new D",
                        "correct": true,
                        "explain": "Correct! Because flip-flops sample on the edge, DFF2 latches DFF1's pre-edge state before DFF1's new output propagates."
                },
                {
                        "text": "Data races through both DFFs simultaneously in a single cycle",
                        "correct": false,
                        "explain": "Incorrect! Setup/hold times prevent races; data advances by exactly 1 stage per cycle."
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'input_d', type: 'INPUT', label: 'D', x: 60, y: 80, value: 1 },
                { id: 'clock_1', type: 'CLOCK', label: 'CLK', x: 60, y: 190, value: 0 },
                { id: 'dff_1', type: 'DFF', label: 'DFF1', x: 200, y: 80 },
                { id: 'dff_2', type: 'DFF', label: 'DFF2', x: 340, y: 80 },
                { id: 'out_q1', type: 'OUTPUT', label: 'Q1', x: 220, y: 220 },
                { id: 'out_q2', type: 'OUTPUT', label: 'Q2', x: 480, y: 95 }
            ],
            connections: [
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in1' },
                { fromComponent: 'clock_1', fromPin: 'clock_1.out0', toComponent: 'dff_2', toPin: 'dff_2.in1' }
            ]
        },
        steps: [
            {
                id: 'l8_step1',
                text: 'Connect Input D to DFF1 data input (pin in0).',
                hint: 'Drag a wire from Input D (right pin) to DFF1 top-left pin.',
                check: (graph) => {
                    const dffs = graph.getDFFComponents();
                    const inD = graph.getInputComponents()[0];
                    return !!(dffs[0] && inD && dffs[0].inputs[0].connectedTo?.componentId === inD.id);
                }
            },
            {
                id: 'l8_step2',
                text: 'Connect DFF1 Q output to DFF2 data input (pin in0).',
                hint: 'Drag a wire from DFF1 right output pin to DFF2 top-left pin.',
                check: (graph) => {
                    const dffs = graph.getDFFComponents();
                    return !!(dffs.length >= 2 && dffs[1].inputs[0].connectedTo?.componentId === dffs[0].id);
                }
            },
            {
                id: 'l8_step3',
                text: 'Wire DFF1 Q output to Output Q1.',
                hint: 'Drag a wire from DFF1 output pin to the input pin of Output Q1.',
                check: (graph) => {
                    const dffs = graph.getDFFComponents();
                    const outQ1 = graph.getOutputComponents().find(o => o.label.toUpperCase().includes('Q1')) || graph.getOutputComponents()[0];
                    return !!(dffs[0] && outQ1 && outQ1.inputs[0].connectedTo?.componentId === dffs[0].id);
                }
            },
            {
                id: 'l8_step4',
                text: 'Wire DFF2 Q output to Output Q2.',
                hint: 'Drag a wire from DFF2 output pin to the input pin of Output Q2.',
                check: (graph) => {
                    const dffs = graph.getDFFComponents();
                    const outQ2 = graph.getOutputComponents().find(o => o.label.toUpperCase().includes('Q2')) || graph.getOutputComponents()[1];
                    return !!(dffs[1] && outQ2 && outQ2.inputs[0].connectedTo?.componentId === dffs[1].id);
                }
            },
            {
                id: 'l8_step5',
                text: 'Step Clock Twice: Click "Clock Step" in Waveform Viewer to watch the pulse move into Stage 1.',
                hint: 'Open Waveform Viewer and click "Clock Step" twice. Observe Q1 transition to 1, while Q2 remains 0 until the next cycle!',
                check: (graph, sim, seq) => (seq ? seq.getWaveformHistory().length >= 2 : false)
            }
        ],
        validate: (graph, simulator, sequentialEngine) => {
            const dffs = graph.getDFFComponents();
            const clocks = graph.getClockComponents();
            const outputs = graph.getOutputComponents();
            const inputs = graph.getInputComponents();

            if (dffs.length < 2) {
                return { pass: false, message: 'Circuit must contain 2 D Flip-Flops for the pipeline stages.' };
            }
            if (clocks.length === 0) {
                return { pass: false, message: 'Circuit must contain a shared Clock.' };
            }
            if (outputs.length < 2) {
                return { pass: false, message: 'Circuit must contain 2 Output components (Q1 and Q2).' };
            }

            const dff1 = dffs[0];
            const dff2 = dffs[1];
            const inD = inputs[0];

            if (!dff1.inputs[0].connectedTo) {
                return { pass: false, message: 'Connect input D to the first flip-flop (DFF1).' };
            }
            if (!dff2.inputs[0].connectedTo) {
                return { pass: false, message: 'Connect DFF1 Q output to DFF2 D input.' };
            }

            if (!sequentialEngine) {
                return { pass: true, message: 'Structural wiring valid.' };
            }

            sequentialEngine.reset();
            sequentialEngine.initializeDFFs();

            // Cycle 1: D=1 -> Q1=1, Q2=0
            graph.setInputValue(inD.id, 1);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();

            const q1_cycle1 = sequentialEngine.getDFFState(dff1.id).Q;
            const q2_cycle1 = sequentialEngine.getDFFState(dff2.id).Q;
            if (q1_cycle1 !== 1 || q2_cycle1 !== 0) {
                return {
                    pass: false,
                    message: `Cycle 1 error: Expected Q1=1, Q2=0. Got Q1=${q1_cycle1}, Q2=${q2_cycle1}.`
                };
            }

            // Cycle 2: D=0 -> Q1=0, Q2=1
            graph.setInputValue(inD.id, 0);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();

            const q1_cycle2 = sequentialEngine.getDFFState(dff1.id).Q;
            const q2_cycle2 = sequentialEngine.getDFFState(dff2.id).Q;
            if (q1_cycle2 !== 0 || q2_cycle2 !== 1) {
                return {
                    pass: false,
                    message: `Cycle 2 error: Expected Q1=0, Q2=1 (data moved to stage 2). Got Q1=${q1_cycle2}, Q2=${q2_cycle2}.`
                };
            }

            return {
                pass: true,
                message: '🎉 Congratulations! You have successfully constructed and verified a 2-stage pipelined shift register. Notice how simultaneous nonblocking evaluation prevents shoot-through race conditions!'
            };
        }
    },

    {
        id: 'lesson-9-full-adder',
        title: '9. 1-Bit Full Adder & Carry Propagation',
        difficulty: 'intermediate',
        description: 'Construct a 1-bit full adder with inputs A, B, Cin and outputs SUM, COUT.',
        objective: 'Implement full adder Boolean logic: SUM = A ⊕ B ⊕ Cin and COUT = (A·B) + (Cin·(A⊕B)).',
        explanation: `
            A <strong>Full Adder</strong> adds two operand bits (A, B) plus an incoming carry bit (Cin).
            It is the core building block of ripple-carry adders and ALU arithmetic units:
            <ul>
                <li><strong>SUM</strong> bit is generated by a 3-input XOR parity function: <code>SUM = A ^ B ^ Cin</code>.</li>
                <li><strong>COUT</strong> bit is generated when at least two inputs are 1: <code>COUT = (A & B) | (Cin & (A ^ B))</code>.</li>
            </ul>
        `,
        whatIsHappening: 'A 1-bit full adder computes binary arithmetic with an incoming carry bit: SUM = A ⊕ B ⊕ Cin (odd parity) and COUT = (A·B) + (Cin·(A⊕B)) (majority logic). If you add 1 + 1 + 1 in binary, the result is 3 (11₂ in binary: SUM=1 and COUT=1). In physical ALUs, full adders are chained together so the carry-out ripples into the carry-in of the next higher bit.',
        task: 'Place two XOR gates, two AND gates, and one OR gate from the palette. Wire SUM = A ⊕ B ⊕ CIN, and wire COUT = (A·B) + (CIN·(A⊕B)). Test with A=1, B=1, CIN=1 to verify SUM=1, COUT=1.',
        solutionPreset: 'full-adder',
        quiz: {
        "question": "For a Full Adder with A = 1, B = 1, and Cin = 1, what are SUM and Cout?",
        "options": [
                {
                        "text": "SUM = 1, Cout = 1 (1 + 1 + 1 = 3 = '11' in binary)",
                        "correct": true,
                        "explain": "Correct! Three 1s add to 3 in decimal, which is binary 11 (Cout=1, SUM=1)."
                },
                {
                        "text": "SUM = 0, Cout = 1 (Binary 10 = Decimal 2)",
                        "correct": false,
                        "explain": "Incorrect. 1 + 1 + 1 = 3, not 2."
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'inp_a', type: 'INPUT', label: 'A', x: 60, y: 70, value: 0 },
                { id: 'inp_b', type: 'INPUT', label: 'B', x: 60, y: 150, value: 0 },
                { id: 'inp_cin', type: 'INPUT', label: 'CIN', x: 60, y: 230, value: 0 },
                { id: 'out_sum', type: 'OUTPUT', label: 'SUM', x: 560, y: 70 },
                { id: 'out_cout', type: 'OUTPUT', label: 'COUT', x: 560, y: 170 }
            ],
            connections: []
        },
        steps: [
            {
                id: 'l9_step1',
                text: 'Place two XOR gates (XOR1, XOR2) on the canvas from the palette.',
                hint: 'Drag two XOR gates from the Combinational Logic palette and drop them in the center workspace.',
                check: (graph) => getComps(graph).filter(c => c.type === 'XOR').length >= 2
            },
            {
                id: 'l9_step2',
                text: 'Place two AND gates (AND1, AND2) and one OR gate (OR1) from the palette.',
                hint: 'Drag two AND gates and one OR gate from the palette onto the canvas.',
                check: (graph) => {
                    const ands = getComps(graph).filter(c => c.type === 'AND').length;
                    const ors = getComps(graph).filter(c => c.type === 'OR').length;
                    return ands >= 2 && ors >= 1;
                }
            },
            {
                id: 'l9_step3',
                text: 'Wire inputs A and B to the first XOR gate and first AND gate.',
                hint: 'Connect Input A to XOR1 and AND1. Connect Input B to the second pin of XOR1 and AND1.',
                check: (graph) => {
                    const xors = getComps(graph).filter(c => c.type === 'XOR');
                    const ands = getComps(graph).filter(c => c.type === 'AND');
                    const inA = graph.getInputComponents().find(i => i.label.toUpperCase() === 'A');
                    const inB = graph.getInputComponents().find(i => i.label.toUpperCase() === 'B');
                    if (!inA || !inB || xors.length === 0 || ands.length === 0) return false;
                    const xor0HasInputs = (xors[0].inputs[0].connectedTo?.componentId === inA.id || xors[0].inputs[1].connectedTo?.componentId === inA.id);
                    const and0HasInputs = (ands[0].inputs[0].connectedTo?.componentId === inA.id || ands[0].inputs[1].connectedTo?.componentId === inA.id);
                    return xor0HasInputs && and0HasInputs;
                }
            },
            {
                id: 'l9_step4',
                text: 'Wire XOR1 output and CIN to XOR2, and route XOR2 output to SUM.',
                hint: 'Drag XOR1 output to XOR2 pin 0, CIN to XOR2 pin 1, and XOR2 output to Output SUM.',
                check: (graph) => {
                    const outSum = graph.getOutputComponents().find(o => o.label.toUpperCase().includes('SUM')) || graph.getOutputComponents()[0];
                    return !!(outSum && outSum.inputs[0].connectedTo);
                }
            },
            {
                id: 'l9_step5',
                text: 'Wire carry generation into the OR gate, and connect to Output COUT.',
                hint: 'Wire AND1 and AND2 outputs into the OR gate, then connect the OR gate output to COUT.',
                check: (graph) => {
                    const outCout = graph.getOutputComponents().find(o => o.label.toUpperCase().includes('COUT') || o.label.toUpperCase().includes('CARRY')) || graph.getOutputComponents()[1];
                    return !!(outCout && outCout.inputs[0].connectedTo);
                }
            }
        ],
        validate: (graph, simulator) => {
            const inputs = graph.getInputComponents();
            const outputs = graph.getOutputComponents();

            if (inputs.length < 3) {
                return { pass: false, message: 'Circuit requires 3 inputs: A, B, and CIN.' };
            }
            if (outputs.length < 2) {
                return { pass: false, message: 'Circuit requires 2 outputs: SUM and COUT.' };
            }

            const inA = inputs.find(i => i.label.toUpperCase() === 'A') || inputs[0];
            const inB = inputs.find(i => i.label.toUpperCase() === 'B') || inputs[1];
            const inCin = inputs.find(i => i.label.toUpperCase().includes('CIN') || i.label.toUpperCase().includes('C')) || inputs[2];

            let sumOut = outputs.find(o => o.label.toUpperCase().includes('SUM')) || outputs[0];
            let coutOut = outputs.find(o => o.label.toUpperCase().includes('COUT') || o.label.toUpperCase().includes('CARRY')) || outputs[1];
            if (sumOut.id === coutOut.id) {
                coutOut = outputs.find(o => o.id !== sumOut.id) || outputs[1];
            }

            for (let a = 0; a <= 1; a++) {
                for (let b = 0; b <= 1; b++) {
                    for (let cin = 0; cin <= 1; cin++) {
                        const expectedSum = (a ^ b ^ cin);
                        const expectedCout = ((a & b) | (cin & (a ^ b)));

                        const res = simulator.evaluateWithInputs({
                            [inA.id]: a,
                            [inB.id]: b,
                            [inCin.id]: cin
                        });

                        if (!res.ok) {
                            return { pass: false, message: `Evaluation error: ${res.error}` };
                        }

                        const actualSum = res.outputs[sumOut.id];
                        const actualCout = res.outputs[coutOut.id];

                        if (actualSum !== expectedSum || actualCout !== expectedCout) {
                            return {
                                pass: false,
                                message: `Mismatch for A=${a}, B=${b}, Cin=${cin}: Expected SUM=${expectedSum}, COUT=${expectedCout}, but got SUM=${actualSum !== null ? actualSum : '?'}, COUT=${actualCout !== null ? actualCout : '?'}.`
                            };
                        }
                    }
                }
            }

            return {
                pass: true,
                message: '🎉 Outstanding! 1-Bit Full Adder verified across all 8 input combinations ($2^3 = 8$). Both SUM parity and COUT majority logic produce exact binary arithmetic.'
            };
        }
    },

    {
        id: 'lesson-10-reg-enable',
        title: '10. DFFE: Register with Clock Enable',
        difficulty: 'intermediate',
        description: 'Wire and test a DFF with Enable (DFFE), verifying state retention when EN=0.',
        objective: 'Verify that DFFE updates Q <= D on rising clock edges when EN=1, and holds Q when EN=0.',
        explanation: `
            A <strong>Register with Enable (DFFE)</strong> provides synchronous clock gating functionality:
            <code>always @(posedge clk) begin if (en) q &lt;= d; end</code>
            When <code>EN=1</code>, the rising clock edge loads data <code>D</code> into <code>Q</code>.
            When <code>EN=0</code>, the register retains its previous state, ignoring changes on input D.
        `,
        whatIsHappening: 'The DFFE is an ASIC standard library cell containing a D Flip-Flop with integrated Clock Enable. When EN=1, the cell samples input D on the rising clock edge (0→1). When EN=0, clock pulses are safely ignored and previous state Q is preserved. In Verilog RTL, this maps directly to always @(posedge clk) begin if (en) q <= d; end.',
        task: 'Connect Input D to the data pin (in0) of the DFFE, and connect Input EN to the enable pin (in2). Pulse the clock in the Waveform Viewer to confirm that D is captured when EN=1 and retained when EN=0.',
        solutionPreset: 'dff-enable',
        quiz: {
        "question": "In Verilog, how is a DFFE described inside an `always @(posedge clk)` block?",
        "options": [
                {
                        "text": "if (en) q <= d;",
                        "correct": true,
                        "explain": "Correct! If en is 1, nonblocking assignment q <= d occurs; otherwise q retains its value."
                },
                {
                        "text": "q = en & d;",
                        "correct": false,
                        "explain": "Incorrect. That describes combinational gating, not a sequential register."
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'inp_d', type: 'INPUT', label: 'D', x: 60, y: 70, value: 1 },
                { id: 'inp_en', type: 'INPUT', label: 'EN', x: 60, y: 160, value: 0 },
                { id: 'clk_1', type: 'CLOCK', label: 'CLK', x: 60, y: 250, value: 0 },
                { id: 'dffe_1', type: 'DFFE', label: 'DFFE', x: 260, y: 90 },
                { id: 'out_q', type: 'OUTPUT', label: 'Q', x: 460, y: 105 }
            ],
            connections: [
                { fromComponent: 'clk_1', fromPin: 'clk_1.out0', toComponent: 'dffe_1', toPin: 'dffe_1.in1' },
                { fromComponent: 'dffe_1', fromPin: 'dffe_1.out0', toComponent: 'out_q', toPin: 'out_q.in0' }
            ]
        },
        steps: [
            {
                id: 'l10_step1',
                text: 'Wire Input D to the top data input (pin in0) of the DFFE.',
                hint: 'Drag a wire from Input D (right pin) to the top-left pin of the DFFE component.',
                check: (graph) => {
                    const dffe = getComps(graph).find(c => c.type === 'DFFE');
                    const inD = graph.getInputComponents().find(i => i.label.toUpperCase() === 'D');
                    return !!(dffe && inD && dffe.inputs[0].connectedTo?.componentId === inD.id);
                }
            },
            {
                id: 'l10_step2',
                text: 'Wire Input EN to the bottom enable input (pin in2) of the DFFE.',
                hint: 'Drag a wire from Input EN (right pin) to the bottom-left pin of the DFFE component.',
                check: (graph) => {
                    const dffe = getComps(graph).find(c => c.type === 'DFFE');
                    const inEn = graph.getInputComponents().find(i => i.label.toUpperCase() === 'EN');
                    return !!(dffe && inEn && dffe.inputs[2].connectedTo?.componentId === inEn.id);
                }
            },
            {
                id: 'l10_step3',
                text: 'Verify Hold: Step clock in Waveform Viewer with EN=0 (Q holds 0).',
                hint: 'Open the Waveform Viewer tab and click "Clock Step" twice. With EN=0, D=1 is safely ignored!',
                check: (graph, sim, seq) => (seq ? seq.getWaveformHistory().length >= 2 : false)
            },
            {
                id: 'l10_step4',
                text: 'Verify Load: Toggle EN=1 and step clock to load D=1 into Q.',
                hint: 'Set EN=1 on the canvas, then click "Clock Step" twice in Waveform Viewer. Output Q updates to 1!',
                check: (graph, sim, seq) => (seq ? seq.getWaveformHistory().length >= 4 : false)
            }
        ],
        validate: (graph, simulator, sequentialEngine) => {
            const dffes = Array.from(graph.components.values()).filter(c => c.type === 'DFFE');
            const clocks = graph.getClockComponents();
            const outputs = graph.getOutputComponents();
            const inputs = graph.getInputComponents();

            if (dffes.length === 0 || clocks.length === 0 || outputs.length === 0) {
                return { pass: false, message: 'Circuit must include a DFFE (DFF with Enable), Clock, and Output Q.' };
            }

            const dffe = dffes[0];
            const inD = inputs.find(i => i.label.toUpperCase() === 'D') || inputs[0];
            const inEn = inputs.find(i => i.label.toUpperCase() === 'EN') || inputs[1];

            if (!dffe.inputs[0].connectedTo) {
                return { pass: false, message: 'Connect data input D to the DFFE component.' };
            }
            if (!dffe.inputs[2].connectedTo) {
                return { pass: false, message: 'Connect enable input EN to the DFFE component.' };
            }

            if (!sequentialEngine) {
                return { pass: true, message: 'Wiring valid.' };
            }

            sequentialEngine.reset();
            sequentialEngine.initializeDFFs();
            simulator.evaluate();

            // Test 1: EN=0, D=1 -> posedge clk -> Q must stay 0 (hold)
            graph.setInputValue(inD.id, 1);
            graph.setInputValue(inEn.id, 0);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();
            if (sequentialEngine.getDFFState(dffe.id).Q !== 0) {
                return { pass: false, message: 'Clock Enable check failed: When EN=0, rising clock edge must NOT load D into Q.' };
            }

            // Test 2: EN=1, D=1 -> posedge clk -> Q updates to 1
            graph.setInputValue(inEn.id, 1);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();
            if (sequentialEngine.getDFFState(dffe.id).Q !== 1) {
                return { pass: false, message: 'Load check failed: When EN=1, rising clock edge must load D=1 into Q.' };
            }

            // Test 3: EN=0, D=0 -> posedge clk -> Q must retain 1!
            graph.setInputValue(inD.id, 0);
            graph.setInputValue(inEn.id, 0);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();
            if (sequentialEngine.getDFFState(dffe.id).Q !== 1) {
                return { pass: false, message: 'Retention check failed: When EN=0 and D changes to 0, Q must retain its previous value of 1.' };
            }

            return {
                pass: true,
                message: '🎉 Perfect! The DFFE register correctly captures data when EN=1 and maintains state when EN=0 across clock edges.'
            };
        }
    },

    {
        id: 'lesson-11-sync-reset-priority',
        title: '11. Synchronous Reset with Documented Priority',
        difficulty: 'advanced',
        description: 'Verify that synchronous reset takes priority over clock enable on rising clock edges.',
        objective: 'Connect a DFFESR and verify that when RST=1 and EN=1 simultaneously, Reset dominates.',
        explanation: `
            In production RTL coding, when both <strong>Reset</strong> and <strong>Clock Enable</strong> are present,
            the synchronous reset must take strict priority over the enable condition:
            <pre style="margin:4px 0; font-size:11px;"><code>always @(posedge clk) begin
    if (rst) begin
        q &lt;= 1'b0;      // Priority 1: Synchronous Reset
    end else if (en) begin
        q &lt;= d;         // Priority 2: Clock Enable
    end
end</code></pre>
            This ensures critical system reset conditions are never blocked by an inactive enable line.
        `,
        whatIsHappening: 'When both Reset (RST) and Clock Enable (EN) arrive simultaneously at a register, Reset MUST take priority! If Enable took precedence, a frozen or disabled subsystem could never be reset during a system fault. In RTL, if (rst) q <= 0; else if (en) q <= d; codifies this strict priority structure.',
        task: 'Wire Input D, EN, and RST into the DFFESR component. Step the clock in Waveform Viewer with both RST=1 and EN=1 to confirm that Reset dominates and clears Q to 0.',
        solutionPreset: 'dff-esr-priority',
        quiz: {
        "question": "If both Reset (RST) and Enable (EN) are asserted simultaneously (RST=1, EN=1), what must happen?",
        "options": [
                {
                        "text": "Reset strictly wins: Q becomes 0",
                        "correct": true,
                        "explain": "Correct! Reset priority guarantees deterministic initialization even if an enable signal is active."
                },
                {
                        "text": "Enable wins: Q loads D",
                        "correct": false,
                        "explain": "Incorrect. Reset must always take priority over enable."
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'inp_d', type: 'INPUT', label: 'D', x: 60, y: 60, value: 1 },
                { id: 'inp_en', type: 'INPUT', label: 'EN', x: 60, y: 140, value: 1 },
                { id: 'inp_rst', type: 'INPUT', label: 'RST', x: 60, y: 220, value: 1 },
                { id: 'clk_1', type: 'CLOCK', label: 'CLK', x: 60, y: 300, value: 0 },
                { id: 'dffesr_1', type: 'DFFESR', label: 'DFF_ESR', x: 280, y: 100 },
                { id: 'out_q', type: 'OUTPUT', label: 'Q', x: 480, y: 115 }
            ],
            connections: [
                { fromComponent: 'clk_1', fromPin: 'clk_1.out0', toComponent: 'dffesr_1', toPin: 'dffesr_1.in1' },
                { fromComponent: 'dffesr_1', fromPin: 'dffesr_1.out0', toComponent: 'out_q', toPin: 'out_q.in0' }
            ]
        },
        steps: [
            {
                id: 'l11_step1',
                text: 'Wire Input D to DFFESR data pin in0.',
                hint: 'Drag a wire from Input D (right pin) to the top-left pin (in0) of DFFESR.',
                check: (graph) => {
                    const reg = getComps(graph).find(c => c.type === 'DFFESR');
                    const inD = graph.getInputComponents().find(i => i.label.toUpperCase() === 'D');
                    return !!(reg && inD && reg.inputs[0].connectedTo?.componentId === inD.id);
                }
            },
            {
                id: 'l11_step2',
                text: 'Wire Input EN to DFFESR enable pin in2.',
                hint: 'Drag a wire from Input EN (right pin) to pin in2 of DFFESR.',
                check: (graph) => {
                    const reg = getComps(graph).find(c => c.type === 'DFFESR');
                    const inEn = graph.getInputComponents().find(i => i.label.toUpperCase() === 'EN');
                    return !!(reg && inEn && reg.inputs[2].connectedTo?.componentId === inEn.id);
                }
            },
            {
                id: 'l11_step3',
                text: 'Wire Input RST to DFFESR synchronous reset pin in3.',
                hint: 'Drag a wire from Input RST (right pin) to pin in3 of DFFESR.',
                check: (graph) => {
                    const reg = getComps(graph).find(c => c.type === 'DFFESR');
                    const inRst = graph.getInputComponents().find(i => i.label.toUpperCase() === 'RST');
                    return !!(reg && inRst && reg.inputs[3].connectedTo?.componentId === inRst.id);
                }
            },
            {
                id: 'l11_step4',
                text: 'Verify Reset Dominance: Step clock with both RST=1 and EN=1 to see Q clear to 0.',
                hint: 'In Waveform Viewer, click "Clock Step" twice. With RST=1 and EN=1 active together, Q clears to 0!',
                check: (graph, sim, seq) => (seq ? seq.getWaveformHistory().length >= 2 : false)
            }
        ],
        validate: (graph, simulator, sequentialEngine) => {
            const dffesrs = Array.from(graph.components.values()).filter(c => c.type === 'DFFESR');
            const clocks = graph.getClockComponents();
            const inputs = graph.getInputComponents();

            if (dffesrs.length === 0 || clocks.length === 0) {
                return { pass: false, message: 'Circuit must contain a DFFESR component and a Clock.' };
            }

            const reg = dffesrs[0];
            const inD = inputs.find(i => i.label.toUpperCase() === 'D') || inputs[0];
            const inEn = inputs.find(i => i.label.toUpperCase() === 'EN') || inputs[1];
            const inRst = inputs.find(i => i.label.toUpperCase() === 'RST') || inputs[2];

            if (!reg.inputs[0].connectedTo) return { pass: false, message: 'Connect D input to DFFESR.' };
            if (!reg.inputs[2].connectedTo) return { pass: false, message: 'Connect EN input to DFFESR.' };
            if (!reg.inputs[3].connectedTo) return { pass: false, message: 'Connect RST input to DFFESR.' };

            if (!sequentialEngine) return { pass: true, message: 'Wiring valid.' };

            sequentialEngine.reset();
            sequentialEngine.initializeDFFs();
            simulator.evaluate();

            // Test 1: RST=0, EN=1, D=1 -> posedge clk -> Q = 1
            graph.setInputValue(inRst.id, 0);
            graph.setInputValue(inEn.id, 1);
            graph.setInputValue(inD.id, 1);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();
            if (sequentialEngine.getDFFState(reg.id).Q !== 1) {
                return { pass: false, message: 'Load failed: When RST=0 and EN=1, D=1 must load into Q.' };
            }

            // Test 2: RST=1, EN=1, D=1 -> posedge clk -> Q MUST clear to 0!
            graph.setInputValue(inRst.id, 1);
            graph.setInputValue(inEn.id, 1);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();
            if (sequentialEngine.getDFFState(reg.id).Q !== 0) {
                return { pass: false, message: 'Priority violation: When RST=1 and EN=1 simultaneously, Reset must dominate and force Q to 0!' };
            }

            // Test 3: RST=0, EN=0, D=1 -> posedge clk -> Q holds 0
            graph.setInputValue(inRst.id, 0);
            graph.setInputValue(inEn.id, 0);
            graph.setInputValue(inD.id, 1);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();
            if (sequentialEngine.getDFFState(reg.id).Q !== 0) {
                return { pass: false, message: 'Hold failed: When RST=0 and EN=0, Q must hold its previous value.' };
            }

            return {
                pass: true,
                message: '🎉 Excellent! Documented priority verified: Synchronous reset strictly overrides enable on the active clock edge, eliminating timing race conditions.'
            };
        }
    },

    {
        id: 'lesson-12-blocking-nonblocking',
        title: '12. Blocking vs Nonblocking Pipeline Semantics',
        difficulty: 'advanced',
        description: 'Trace 2-cycle latency across a pipelined register stage and observe nonblocking concurrency.',
        objective: 'Observe how nonblocking assignments (<=) prevent race shoot-through across clock edges.',
        explanation: `
            In hardware, physical flip-flops sample their inputs simultaneously on the active clock edge.
            In Verilog, nonblocking assignments (<code>&lt;=</code>) model this concurrent behavior by:
            <ol>
                <li>Evaluating all RHS expressions using current state at the start of the time step.</li>
                <li>Updating all LHS register targets simultaneously at the end of the time step.</li>
            </ol>
            If blocking assignments (<code>=</code>) were used, the first register would update immediately, and the second register would erroneously capture the new value in the <em>same</em> clock edge (race shoot-through).
        `,
        whatIsHappening: 'Physical registers sample their inputs concurrently at the active clock edge. Verilog nonblocking assignments (<=) mirror this: every register evaluates its input based on state BEFORE the clock edge, and only commits updates AFTER the edge completes. If blocking assignments (=) were used, Stage 1 would immediately update and Stage 2 would mistakenly capture the new value in the very same clock edge — a dangerous software simulation race condition!',
        task: 'Wire Input D to STAGE1, connect STAGE1 Q to STAGE2 D, and wire both outputs Q1 and Q2. Step the clock over multiple cycles to confirm that a data pulse takes exactly 2 cycles to traverse the pipeline without shoot-through.',
        solutionPreset: 'blocking-vs-nonblocking',
        quiz: {
        "question": "Which assignment operator MUST be used for sequential logic in synthesizable Verilog?",
        "options": [
                {
                        "text": "Nonblocking (`<=`)",
                        "correct": true,
                        "explain": "Correct! `<=` schedules updates at the end of the simulation time step, preventing race conditions between pipeline stages."
                },
                {
                        "text": "Blocking (`=`)",
                        "correct": false,
                        "explain": "Incorrect! Blocking assignments in sequential always blocks create order-dependent simulation race conditions."
                }
        ]
},
        starterCircuit: {
            components: [
                { id: 'inp_d', type: 'INPUT', label: 'D', x: 60, y: 80, value: 1 },
                { id: 'clk_1', type: 'CLOCK', label: 'CLK', x: 60, y: 180, value: 0 },
                { id: 'dff_1', type: 'DFF', label: 'STAGE1', x: 200, y: 80 },
                { id: 'dff_2', type: 'DFF', label: 'STAGE2', x: 360, y: 80 },
                { id: 'out_q1', type: 'OUTPUT', label: 'Q1', x: 220, y: 230 },
                { id: 'out_q2', type: 'OUTPUT', label: 'Q2', x: 500, y: 95 }
            ],
            connections: [
                { fromComponent: 'clk_1', fromPin: 'clk_1.out0', toComponent: 'dff_1', toPin: 'dff_1.in1' },
                { fromComponent: 'clk_1', fromPin: 'clk_1.out0', toComponent: 'dff_2', toPin: 'dff_2.in1' }
            ]
        },
        steps: [
            {
                id: 'l12_step1',
                text: 'Wire Input D to STAGE1 data input pin in0.',
                hint: 'Drag a wire from Input D (right pin) to STAGE1 top-left pin.',
                check: (graph) => {
                    const dffs = graph.getDFFComponents();
                    const inD = graph.getInputComponents()[0];
                    return !!(dffs[0] && inD && dffs[0].inputs[0].connectedTo?.componentId === inD.id);
                }
            },
            {
                id: 'l12_step2',
                text: 'Wire STAGE1 Q output to STAGE2 data input pin in0.',
                hint: 'Drag a wire from STAGE1 right output pin to STAGE2 top-left pin.',
                check: (graph) => {
                    const dffs = graph.getDFFComponents();
                    return !!(dffs.length >= 2 && dffs[1].inputs[0].connectedTo?.componentId === dffs[0].id);
                }
            },
            {
                id: 'l12_step3',
                text: 'Wire STAGE1 Q to Output Q1, and STAGE2 Q to Output Q2.',
                hint: 'Connect STAGE1 output pin to Output Q1, and STAGE2 output pin to Output Q2.',
                check: (graph) => {
                    const dffs = graph.getDFFComponents();
                    const outputs = graph.getOutputComponents();
                    const q1 = outputs.find(o => o.label.toUpperCase().includes('Q1')) || outputs[0];
                    const q2 = outputs.find(o => o.label.toUpperCase().includes('Q2')) || outputs[1];
                    return !!(dffs.length >= 2 && q1 && q2 && q1.inputs[0].connectedTo?.componentId === dffs[0].id && q2.inputs[0].connectedTo?.componentId === dffs[1].id);
                }
            },
            {
                id: 'l12_step4',
                text: 'Step Clock for Cycle 1: Verify Q1=1 and Q2=0 (no race shoot-through).',
                hint: 'Open Waveform Viewer and click "Clock Step" twice. Notice Q1 captures 1, but Q2 remains 0!',
                check: (graph, sim, seq) => (seq ? seq.getWaveformHistory().length >= 2 : false)
            },
            {
                id: 'l12_step5',
                text: 'Toggle D=0 and Step Clock for Cycle 2: Observe Q1=0 and Q2=1.',
                hint: 'Set D=0 on canvas, then click "Clock Step" twice in Waveform Viewer. The 1 has shifted to STAGE2!',
                check: (graph, sim, seq) => (seq ? seq.getWaveformHistory().length >= 4 : false)
            }
        ],
        validate: (graph, simulator, sequentialEngine) => {
            const dffs = graph.getDFFComponents();
            const clocks = graph.getClockComponents();
            const outputs = graph.getOutputComponents();
            const inputs = graph.getInputComponents();

            if (dffs.length < 2 || clocks.length === 0 || outputs.length < 2) {
                return { pass: false, message: 'Circuit must contain 2 DFF pipeline stages, a shared Clock, and 2 Outputs (Q1, Q2).' };
            }

            const dff1 = dffs[0];
            const dff2 = dffs[1];
            const inD = inputs[0];

            if (!dff1.inputs[0].connectedTo) return { pass: false, message: 'Connect input D to STAGE1.' };
            if (!dff2.inputs[0].connectedTo || dff2.inputs[0].connectedTo.componentId !== dff1.id) {
                return { pass: false, message: 'Connect STAGE1 Q output to STAGE2 D input.' };
            }

            if (!sequentialEngine) return { pass: true, message: 'Wiring valid.' };

            sequentialEngine.reset();
            sequentialEngine.initializeDFFs();

            // Cycle 1: D=1 -> posedge clk -> Q1=1, Q2=0
            graph.setInputValue(inD.id, 1);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();

            const q1_c1 = sequentialEngine.getDFFState(dff1.id).Q;
            const q2_c1 = sequentialEngine.getDFFState(dff2.id).Q;
            if (q1_c1 !== 1 || q2_c1 !== 0) {
                return { pass: false, message: `Cycle 1 error: Expected Q1=1, Q2=0. Got Q1=${q1_c1}, Q2=${q2_c1}.` };
            }

            // Cycle 2: D=0 -> posedge clk -> Q1=0, Q2=1
            graph.setInputValue(inD.id, 0);
            simulator.evaluate();
            sequentialEngine.clockStep();
            sequentialEngine.clockStep();

            const q1_c2 = sequentialEngine.getDFFState(dff1.id).Q;
            const q2_c2 = sequentialEngine.getDFFState(dff2.id).Q;
            if (q1_c2 !== 0 || q2_c2 !== 1) {
                return { pass: false, message: `Cycle 2 error: Expected Q1=0, Q2=1 (data moved to stage 2). Got Q1=${q1_c2}, Q2=${q2_c2}.` };
            }

            return {
                pass: true,
                message: '🎉 Congratulations! You verified nonblocking assignment concurrency: each stage samples its input prior to edge updates, providing predictable multi-cycle pipeline isolation.'
            };
        }
    }
];

export class LessonManager {
    /**
     * @param {string} containerId - Element ID for lessons container
     * @param {import('../engine/circuit_graph.js').CircuitGraph} graph
     * @param {import('../engine/logic_simulator.js').LogicSimulator} simulator
     * @param {import('../ui/circuit_editor.js').CircuitEditor} editor
     * @param {import('../engine/sequential_engine.js').SequentialEngine} sequentialEngine
     */
    constructor(containerId, graph, simulator, editor, sequentialEngine) {
        this.container = document.getElementById(containerId);
        this.graph = graph;
        this.simulator = simulator;
        this.editor = editor;
        this.seq = sequentialEngine;

        this.currentLesson = null;
        this._graphChangeListener = null;
        this.renderList();
    }

    getCompletedLessonIds() {
        try {
            const raw = localStorage.getItem('rtl_lessons_completed');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    markLessonCompleted(id) {
        try {
            const list = this.getCompletedLessonIds();
            if (!list.includes(id)) {
                list.push(id);
                localStorage.setItem('rtl_lessons_completed', JSON.stringify(list));
            }
        } catch {
            // Storage access graceful fallback
        }
    }

    resetProgress() {
        try {
            localStorage.removeItem('rtl_lessons_completed');
        } catch {}
        this.renderList();
    }

    getLessonById(id) {
        return LESSONS.find(l => l.id === id);
    }


    _updateCanvasTutor(completedCount, steps) {
        if (typeof document === 'undefined') return;
        const tutor = document.getElementById('canvas-tutor-banner');
        if (!tutor) return;

        if (!this.currentLesson || !steps || steps.length === 0) {
            tutor.style.display = 'none';
            try { window.app?.componentLibrary?.clearHighlights(); } catch {}
            return;
        }

        tutor.style.display = 'flex';
        const labelEl = document.getElementById('tutor-step-label');
        const textEl = document.getElementById('tutor-step-text');
        const solBtn = document.getElementById('btn-tutor-solution');
        const dismissBtn = document.getElementById('btn-tutor-dismiss');

        if (dismissBtn && !dismissBtn._bound) {
            dismissBtn._bound = true;
            dismissBtn.addEventListener('click', () => {
                tutor.style.display = 'none';
            });
        }

        if (solBtn && !solBtn._bound) {
            solBtn._bound = true;
            solBtn.addEventListener('click', () => {
                const loadBtn = document.getElementById('btn-load-solution');
                if (loadBtn) loadBtn.click();
            });
        }

        if (completedCount === steps.length) {
            // All steps passed!
            tutor.classList.add('tutor-success');
            if (labelEl) labelEl.textContent = '🎉 All Steps Complete!';
            if (textEl) textEl.textContent = 'Great job! Click Verify & Check Solution to finish and advance.';
            try { window.app?.componentLibrary?.clearHighlights(); } catch {}
            return;
        }

        tutor.classList.remove('tutor-success');

        // Find active step
        const activeIdx = steps.findIndex(s => {
            try { return !s.check(this.graph, this.simulator, this.seq); } catch { return true; }
        });

        if (activeIdx !== -1) {
            const activeStep = steps[activeIdx];
            if (labelEl) labelEl.textContent = `Step ${activeIdx + 1} of ${steps.length}`;
            if (textEl) textEl.textContent = activeStep.text;

            // Highlight component in palette if step requires placement
            const txt = activeStep.text;
            let compType = null;
            if (/AND gate/i.test(txt)) compType = 'AND';
            else if (/OR gate/i.test(txt)) compType = 'OR';
            else if (/NOT gate|Inverter/i.test(txt)) compType = 'NOT';
            else if (/NAND gate/i.test(txt)) compType = 'NAND';
            else if (/NOR gate/i.test(txt)) compType = 'NOR';
            else if (/XOR gate/i.test(txt)) compType = 'XOR';
            else if (/XNOR gate/i.test(txt)) compType = 'XNOR';
            else if (/Input|Switch/i.test(txt)) compType = 'INPUT';
            else if (/Output/i.test(txt)) compType = 'OUTPUT';
            else if (/Clock/i.test(txt)) compType = 'CLOCK';
            else if (/DFFESR/i.test(txt)) compType = 'DFFESR';
            else if (/DFFSR/i.test(txt)) compType = 'DFFSR';
            else if (/DFFE/i.test(txt)) compType = 'DFFE';
            else if (/D Flip-Flop|DFF/i.test(txt)) compType = 'DFF';
            else if (/Multiplexer|MUX/i.test(txt)) compType = 'MUX2';

            try {
                if (compType) {
                    window.app?.componentLibrary?.highlightComponentType(compType);
                } else {
                    window.app?.componentLibrary?.clearHighlights();
                }
            } catch {}
        }
    }

    renderList() {
        if (!this.container) return;

        // Detach any existing graph listener when returning to list
        if (this._graphChangeListener) {
            this.graph.off('change', this._graphChangeListener);
            this._graphChangeListener = null;
        }

        const completedIds = this.getCompletedLessonIds();
        const completedCount = completedIds.length;
        const totalCount = LESSONS.length;
        const percent = Math.round((completedCount / totalCount) * 100);

        let html = `
            <div class="lessons-list">
                <div class="inspector-card-title" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>Guided RTL Lessons</span>
                    <span style="font-size:10px; font-weight:normal; color:var(--text-muted);">${completedCount}/${totalCount} Done</span>
                </div>

                <div class="lesson-progress-box" style="margin-bottom:12px; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:6px;">
                    <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                        <span style="color:var(--text-main); font-weight:600;">Fundamentals Progress</span>
                        <span style="color:var(--accent-primary); font-weight:600;">${percent}%</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.1); height:6px; border-radius:3px; overflow:hidden;">
                        <div style="background:var(--accent-primary); width:${percent}%; height:100%; transition:width 0.3s ease;"></div>
                    </div>
                    ${completedCount > 0 ? `
                        <div style="text-align:right; margin-top:4px;">
                            <button id="btn-reset-fundamentals-progress" class="btn btn-sm btn-ghost" style="font-size:10px; padding:2px 4px; color:var(--text-muted);">Reset Progress</button>
                        </div>
                    ` : ''}
                </div>
        `;

        LESSONS.forEach((lesson, idx) => {
            const isCompleted = completedIds.includes(lesson.id);
            html += `
                <div class="lesson-card ${this.currentLesson?.id === lesson.id ? 'active' : ''} ${isCompleted ? 'completed-lesson' : ''}" data-lesson-id="${lesson.id}">
                    <div class="lesson-header">
                        <span class="lesson-title">${isCompleted ? '✓ ' : ''}${lesson.title}</span>
                        <span class="lesson-badge ${lesson.difficulty}">${lesson.difficulty}</span>
                    </div>
                    <div class="lesson-desc">${lesson.description}</div>
                </div>
            `;
        });

        html += `
                <div class="inspector-card-title" style="margin-top: 16px;">Advanced RTL Systems (Lessons 13–24)</div>
                <div class="advanced-curriculum-nav" style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
                    <a href="advanced-lab/index.html?tab=datapath" class="lesson-card" style="text-decoration:none; display:block;">
                        <div class="lesson-header">
                            <span class="lesson-title">13–16: Vectors, Adders & ALU Datapaths</span>
                            <span class="lesson-badge advanced">ADV</span>
                        </div>
                        <div class="lesson-desc">Multi-bit buses, carry-lookahead vs ripple adder, ALU flags (Z, C, V, N)</div>
                    </a>
                    <a href="advanced-lab/index.html?tab=sequential" class="lesson-card" style="text-decoration:none; display:block;">
                        <div class="lesson-header">
                            <span class="lesson-title">17–20: Registers, Counters & Shift Registers</span>
                            <span class="lesson-badge advanced">ADV</span>
                        </div>
                        <div class="lesson-desc">Recirculating multi-bit registers, modulo binary counters, universal shift registers</div>
                    </a>
                    <a href="advanced-lab/index.html?tab=fsm" class="lesson-card" style="text-decoration:none; display:block;">
                        <div class="lesson-header">
                            <span class="lesson-title">21–24: Moore & Mealy State Machines</span>
                            <span class="lesson-badge advanced">ADV</span>
                        </div>
                        <div class="lesson-desc">Interactive FSM state diagrams, sequence detectors, zero-latency Mealy vs Moore outputs</div>
                    </a>
                    <a href="advanced-lab/index.html?tab=lessons" class="btn btn-primary btn-sm" style="text-align:center; text-decoration:none; margin-top:4px; display:block;">
                        🚀 Open Advanced Lab Curriculum (12 Lessons) →
                    </a>
                </div>
            </div>`;
        this.container.innerHTML = html;

        // Bind reset progress
        const resetProgressBtn = this.container.querySelector('#btn-reset-fundamentals-progress');
        if (resetProgressBtn) {
            resetProgressBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Reset your RTL Fundamentals lesson progress?')) {
                    this.resetProgress();
                }
            });
        }

        // Bind clicks
        const cards = this.container.querySelectorAll('.lesson-card[data-lesson-id]');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-lesson-id');
                const lesson = LESSONS.find(l => l.id === id);
                if (lesson) this.openLesson(lesson);
            });
        });
    }

    openLesson(lesson) {
        this.currentLesson = lesson;
        if (!this.container) return;

        // Clean previous listener
        if (this._graphChangeListener) {
            this.graph.off('change', this._graphChangeListener);
        }

        const whatIsHappeningHtml = lesson.whatIsHappening ? `
            <div class="lesson-silicon-explainer" style="margin: 8px 0; padding: 8px 10px; background: rgba(56, 189, 248, 0.08); border-left: 3px solid var(--accent-primary); border-radius: 4px; font-size: 11.5px; line-height: 1.45; color: #bae6fd;">
                <div style="font-weight: 600; color: var(--accent-primary); margin-bottom: 3px; display:flex; align-items:center; gap:4px;">
                    <span>⚡ What's Happening in Silicon:</span>
                </div>
                <div>${lesson.whatIsHappening}</div>
            </div>
        ` : '';

        this.container.innerHTML = `
            <div class="lesson-workspace-view">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <button id="btn-back-lessons" class="btn btn-sm">← Back to Lessons</button>
                    <span class="lesson-badge ${lesson.difficulty}">${lesson.difficulty}</span>
                </div>

                <h4 style="color:var(--accent-primary); font-size:13px; margin-top:6px; margin-bottom:2px;">${lesson.title}</h4>

                <div class="lesson-instructions" style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">${lesson.explanation}</div>

                ${whatIsHappeningHtml}

                <div class="lesson-task-box" style="margin: 6px 0; padding: 8px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-color); border-radius: 4px; font-size: 11.5px;">
                    <strong style="color:var(--text-main);">Goal:</strong> ${lesson.task}
                </div>

                <!-- Live Step Checklist -->
                <div class="lesson-steps-container" style="margin: 8px 0; padding: 8px; background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-color); border-radius: 5px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                        <span style="font-size:11px; font-weight:600; color:var(--text-main);">Interactive Steps (<span id="steps-completed-count">0</span>/${lesson.steps ? lesson.steps.length : 0})</span>
                        ${lesson.solutionPreset ? `<button id="btn-load-solution" class="btn btn-sm btn-ghost" style="font-size:10px; color:var(--accent-primary);" title="Load reference solution circuit">👀 Load Solution</button>` : ''}
                    </div>
                    <div id="lesson-steps-list" style="display:flex; flex-direction:column; gap:6px;"></div>
                </div>

                <div id="lesson-feedback" style="display:none; margin: 8px 0;"></div>

                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                    <button id="btn-check-solution" class="btn btn-success btn-sm" style="flex:1;">
                        ✓ Verify & Check Solution
                    </button>
                    <button id="btn-reset-lesson" class="btn btn-sm">
                        ↺ Reset Circuit
                    </button>
                </div>
            </div>
        `;

        // Load starter circuit if provided
        if (lesson.starterCircuit) {
            this.graph.deserialize(lesson.starterCircuit);
            this.simulator.evaluate();
            this.editor.render();
        }

        // Live checklist updates on graph modifications
        this._graphChangeListener = () => this.updateStepChecklist();
        this.graph.on('change', this._graphChangeListener);
        this.updateStepChecklist();

        // Bind back button
        const backBtn = document.getElementById('btn-back-lessons');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.currentLesson = null;
                this.renderList();
            });
        }

        // Bind reset button
        const resetBtn = document.getElementById('btn-reset-lesson');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (lesson.starterCircuit) {
                    this.graph.deserialize(lesson.starterCircuit);
                } else {
                    this.graph.clear();
                }
                this.simulator.evaluate();
                this.editor.render();
                const fb = document.getElementById('lesson-feedback');
                if (fb) fb.style.display = 'none';
                this.updateStepChecklist();
            });
        }

        // Bind load solution button
        const loadSolBtn = document.getElementById('btn-load-solution');
        if (loadSolBtn && lesson.solutionPreset && PRESETS[lesson.solutionPreset]) {
            loadSolBtn.addEventListener('click', () => {
                if (confirm('Load the verified reference circuit for this lesson? You can inspect and test it immediately.')) {
                    this.graph.deserialize(PRESETS[lesson.solutionPreset].circuit);
                    this.simulator.evaluate();
                    this.editor.render();
                    this.updateStepChecklist();
                }
            });
        }

        // Bind check solution button
        const checkBtn = document.getElementById('btn-check-solution');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => {
                this.checkCurrentSolution();
            });
        }

        // Render interactive concept check quiz
        this._renderQuiz(lesson);
    }

    _renderQuiz(lesson) {
        if (!lesson || !lesson.quiz) return;
        const container = document.getElementById('lesson-feedback');
        if (!container) return;

        let quizContainer = document.getElementById('lesson-quiz-container');
        if (!quizContainer) {
            quizContainer = document.createElement('div');
            quizContainer.id = 'lesson-quiz-container';
            container.parentNode.insertBefore(quizContainer, container.nextSibling);
        }

        quizContainer.innerHTML = `
            <div class="lesson-quiz-box">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                    <span style="font-size:14px;">🧠</span>
                    <span style="font-size:11px; font-weight:700; color:var(--accent-primary);">Concept Check</span>
                </div>
                <div class="quiz-question">${lesson.quiz.question}</div>
                <div class="quiz-options">
                    ${lesson.quiz.options.map((opt, oIdx) => `
                        <button class="quiz-opt-btn" data-opt-idx="${oIdx}">
                            ${opt.text}
                        </button>
                    `).join('')}
                </div>
                <div id="quiz-feedback-box" class="quiz-feedback" style="display:none;"></div>
            </div>
        `;

        quizContainer.querySelectorAll('.quiz-opt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const oIdx = parseInt(btn.getAttribute('data-opt-idx'), 10);
                const opt = lesson.quiz.options[oIdx];
                const feedback = document.getElementById('quiz-feedback-box');
                if (!opt || !feedback) return;

                quizContainer.querySelectorAll('.quiz-opt-btn').forEach(b => {
                    b.classList.remove('correct', 'incorrect');
                });

                if (opt.correct) {
                    btn.classList.add('correct');
                    feedback.className = 'quiz-feedback correct';
                    feedback.innerHTML = `✓ ${opt.explain}`;
                    feedback.style.display = 'block';
                    try { soundManager.playStepSuccess(); } catch {}
                } else {
                    btn.classList.add('incorrect');
                    feedback.className = 'quiz-feedback incorrect';
                    feedback.innerHTML = `✗ ${opt.explain}`;
                    feedback.style.display = 'block';
                }
            });
        });
    }

    updateStepChecklist() {
        if (!this.currentLesson || !this.currentLesson.steps) return;

        const listContainer = document.getElementById('lesson-steps-list');
        const countSpan = document.getElementById('steps-completed-count');
        if (!listContainer) return;

        let completedCount = 0;
        let foundFirstIncomplete = false;

        const html = this.currentLesson.steps.map((step, idx) => {
            let isPassed = false;
            try {
                isPassed = !!step.check(this.graph, this.simulator, this.seq);
            } catch {
                isPassed = false;
            }

            if (isPassed) completedCount++;

            let badgeHtml = '';
            let stepClass = '';

            if (isPassed) {
                badgeHtml = `<span style="display:inline-block; padding:1px 5px; font-size:9.5px; border-radius:3px; background:rgba(34,197,94,0.2); color:#4ade80; font-weight:600; white-space:nowrap;">✓ Done</span>`;
                stepClass = 'step-done';
            } else if (!foundFirstIncomplete) {
                foundFirstIncomplete = true;
                badgeHtml = `<span style="display:inline-block; padding:1px 5px; font-size:9.5px; border-radius:3px; background:rgba(56,189,248,0.25); color:#38bdf8; font-weight:600; white-space:nowrap;">➔ Next Step</span>`;
                stepClass = 'step-active';
            } else {
                badgeHtml = `<span style="display:inline-block; padding:1px 5px; font-size:9.5px; border-radius:3px; background:rgba(255,255,255,0.06); color:var(--text-muted); font-weight:600; white-space:nowrap;">○ Step ${idx + 1}</span>`;
                stepClass = 'step-pending';
            }

            return `
                <div class="lesson-step-item ${stepClass}" style="padding:6px; background:rgba(255,255,255,0.02); border-radius:4px; border:1px solid ${stepClass === 'step-active' ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.05)'};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
                        <div style="font-size:11px; line-height:1.35; color:${isPassed ? 'var(--text-muted)' : 'var(--text-main)'}; text-decoration:${isPassed ? 'line-through' : 'none'};">
                            ${step.text}
                        </div>
                        <div>${badgeHtml}</div>
                    </div>
                    ${step.hint ? `
                        <div style="margin-top:4px;">
                            <button class="btn-step-hint" data-step-id="${step.id}" style="background:none; border:none; color:var(--accent-primary); font-size:10px; cursor:pointer; padding:0; text-decoration:underline;">
                                💡 Show Hint
                            </button>
                            <div id="hint-box-${step.id}" style="display:none; margin-top:3px; padding:4px 6px; background:rgba(245,158,11,0.1); border-left:2px solid #f59e0b; border-radius:3px; font-size:10.5px; color:#fde68a;">
                                ${step.hint}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        listContainer.innerHTML = html;
        if (countSpan) countSpan.textContent = completedCount;

        // Auditory celebration when step is newly completed
        if (completedCount > (this._lastCompletedStepCount || 0)) {
            try { soundManager.playStepSuccess(); } catch {}
        }
        this._lastCompletedStepCount = completedCount;

        // Update on-canvas guided tutor banner & palette guide highlights
        this._updateCanvasTutor(completedCount, this.currentLesson.steps);

        // Bind hint toggle buttons
        listContainer.querySelectorAll('.btn-step-hint').forEach(btn => {
            btn.addEventListener('click', () => {
                const stepId = btn.getAttribute('data-step-id');
                const box = document.getElementById(`hint-box-${stepId}`);
                if (box) {
                    const isOpen = box.style.display !== 'none';
                    box.style.display = isOpen ? 'none' : 'block';
                    btn.textContent = isOpen ? '💡 Show Hint' : 'Hide Hint';
                }
            });
        });
    }

    checkCurrentSolution() {
        if (!this.currentLesson) return;

        const fb = document.getElementById('lesson-feedback');
        if (!fb) return;

        const result = this.currentLesson.validate(this.graph, this.simulator, this.seq);

        fb.style.display = 'block';
        fb.className = `lesson-feedback-box ${result.pass ? 'feedback-success' : 'feedback-error'}`;

        if (result.pass) {
            this.markLessonCompleted(this.currentLesson.id);
            try { soundManager.playLessonComplete(); } catch {}
            this.updateStepChecklist();

            // Find next lesson
            const currentIdx = LESSONS.findIndex(l => l.id === this.currentLesson.id);
            const nextLesson = (currentIdx >= 0 && currentIdx < LESSONS.length - 1) ? LESSONS[currentIdx + 1] : null;

            let nextNavHtml = '';
            if (nextLesson) {
                nextNavHtml = `
                    <div style="margin-top: 10px;">
                        <button id="btn-next-lesson" class="btn btn-primary btn-sm" style="width:100%;">
                            Next Lesson: ${nextLesson.title} →
                        </button>
                    </div>
                `;
            } else {
                nextNavHtml = `
                    <div style="margin-top: 10px; padding: 8px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 4px;">
                        <div style="font-weight: 600; color: #4ade80; font-size: 11px;">🎓 FUNDAMENTALS CURRICULUM COMPLETE!</div>
                        <div style="font-size: 11px; color: var(--text-muted); margin: 4px 0 6px 0;">You've mastered all 12 single-bit digital logic & RTL lessons! Advance to multi-bit datapaths, ALUs, counters, and FSMs:</div>
                        <a href="advanced-lab/index.html?tab=datapath" class="btn btn-primary btn-sm" style="display:inline-block; text-decoration:none;">🚀 Launch Advanced RTL Lab →</a>
                    </div>
                `;
            }

            let extraGuide = '';
            if (this.currentLesson.id === 'lesson-2-half-adder' || this.currentLesson.id === 'lesson-9-full-adder') {
                extraGuide = `
                    <div style="margin-top: 8px; padding: 8px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px;">
                        <div style="font-weight: 600; color: var(--accent-primary); font-size: 11px;">🚀 LEVEL UP IN ADVANCED RTL LAB:</div>
                        <div style="font-size: 11px; color: var(--text-muted); margin: 4px 0 6px 0;">You've mastered 1-bit binary addition! Next, explore how 4-bit ripple-carry adders and full ALUs are built using multi-bit buses.</div>
                        <a href="advanced-lab/index.html?tab=datapath" class="btn btn-primary btn-sm" style="display:inline-block; text-decoration:none;">Open 4-Bit Adder & ALU Lab →</a>
                    </div>
                `;
            } else if (this.currentLesson.id === 'lesson-6-reg-enable' || this.currentLesson.id === 'lesson-10-reg-enable' || this.currentLesson.id === 'lesson-7-sync-reset' || this.currentLesson.id === 'lesson-11-sync-reset-priority') {
                extraGuide = `
                    <div style="margin-top: 8px; padding: 8px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px;">
                        <div style="font-weight: 600; color: var(--accent-primary); font-size: 11px;">🚀 LEVEL UP IN ADVANCED RTL LAB:</div>
                        <div style="font-size: 11px; color: var(--text-muted); margin: 4px 0 6px 0;">Take registers further with multi-bit vector registers, binary modulo counters, and universal shift registers.</div>
                        <a href="advanced-lab/index.html?tab=sequential" class="btn btn-primary btn-sm" style="display:inline-block; text-decoration:none;">Open Multi-Bit Sequential Lab →</a>
                    </div>
                `;
            } else if (this.currentLesson.id === 'lesson-3-mux' || this.currentLesson.id === 'lesson-5-mux-cond') {
                extraGuide = `
                    <div style="margin-top: 8px; padding: 8px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px;">
                        <div style="font-weight: 600; color: var(--accent-primary); font-size: 11px;">🚀 LEVEL UP IN ADVANCED RTL LAB:</div>
                        <div style="font-size: 11px; color: var(--text-muted); margin: 4px 0 6px 0;">Explore how multi-bit multiplexers route data words inside arithmetic datapaths and ALUs.</div>
                        <a href="advanced-lab/index.html?tab=datapath" class="btn btn-primary btn-sm" style="display:inline-block; text-decoration:none;">Open Datapath Visualizer →</a>
                    </div>
                `;
            }

            fb.innerHTML = `<div>${result.message}</div>${nextNavHtml}${extraGuide}`;

            // Bind next lesson button
            const nextBtn = document.getElementById('btn-next-lesson');
            if (nextBtn && nextLesson) {
                nextBtn.addEventListener('click', () => {
                    this.openLesson(nextLesson);
                });
            }
        } else {
            fb.innerHTML = result.message;
        }
    }
}
