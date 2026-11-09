/**
 * panels.js — Workspace Layout, Panel Tabs, and Inspector Manager
 * 
 * Manages tab switching in left sidebar and bottom drawer,
 * component inspector display, circuit health checks, and Verilog display.
 * 
 * @module PanelManager
 */

export const RTL_EXPLANATIONS = {
    'assign': {
        name: 'Continuous Assignment ("assign")',
        summary: 'Used for dataflow modeling of combinational hardware. The left-hand side (LHS) must be a <code>wire</code> net. The right-hand side (RHS) expression is evaluated continuously whenever any operand changes value.',
        exampleVerilog: `// Dataflow combinational logic
wire sum, carry;
assign sum   = (a ^ b);
assign carry = (a & b);`,
        hardware: 'Synthesizes directly into combinational logic gates (AND, OR, XOR) with zero clock-cycle delay.',
        rule: 'Continuous assigns cannot drive a <code>reg</code> net in IEEE 1364 Verilog.'
    },
    'always-comb': {
        name: 'Combinational Procedural "always @(*)"',
        summary: 'Used for procedural combinational modeling. The <code>@(*)</code> wildcard sensitivity list automatically triggers whenever any RHS signal changes. The LHS target must be declared as <code>reg</code>.',
        exampleVerilog: `// Procedural combinational block
always @(*) begin
    sum   = (a ^ b);
    carry = (a & b);
end`,
        hardware: 'Synthesizes to combinational gates. Every path must assign all outputs to prevent unintended transparent latches.',
        rule: 'Always use blocking assignments (<code>=</code>) inside combinational <code>always @(*)</code> blocks.'
    },
    'if-else': {
        name: 'Conditional Logic ("if / else")',
        summary: 'Expresses conditional decisions and priority routing inside procedural blocks. In continuous assigns, the equivalent hardware is modeled using the ternary operator <code>(sel ? b : a)</code>.',
        exampleVerilog: `// Conditional data selection
always @(*) begin
    if (sel) begin
        y = b;
    end else begin
        y = a;
    end
end`,
        hardware: 'Synthesizes to multiplexers (MUX2X1) or priority logic chains.',
        rule: 'Always provide a terminating <code>else</code> branch to avoid inferring unwanted level-sensitive latches.'
    },
    'case': {
        name: 'Multiplexer Selection Using "case"',
        summary: 'The <code>case</code> statement evaluates a selection expression against mutually exclusive constant branches. It is the industry standard for modeling parallel multiplexers and finite state machines.',
        exampleVerilog: `// 2:1 Multiplexer modeled via case
always @(*) begin
    case (sel)
        1'b0: y = a;
        1'b1: y = b;
        default: y = 1'bx;
    endcase
end`,
        hardware: 'Synthesizes to balanced multiplexer trees (MUX2X1, MUX4X1) without cascading priority delays.',
        rule: 'Always include a <code>default</code> clause to prevent unintended latch inference for unhandled states.'
    },
    'always-ff': {
        name: 'Positive-Edge-Triggered "always @(posedge clk)"',
        summary: 'Models synchronous sequential registers. The block executes strictly on the 0→1 rising transition of the clock. Flip-flops sample their D inputs at the instant of the edge and hold state until the next edge.',
        exampleVerilog: `// Rising-edge triggered register
always @(posedge clk) begin
    if (rst) begin
        q <= 1'b0;      // Synchronous reset
    end else if (en) begin
        q <= d;         // Clock enable
    end
end`,
        hardware: 'Synthesizes to physical D-type flip-flop standard cells (DFFX1, DFFSRX1) with 1-cycle latency.',
        rule: 'Sequential blocks MUST use nonblocking assignments (<code>&lt;=</code>) to model concurrent register updates.'
    },
    'blocking-nonblocking': {
        name: 'Blocking (=) versus Nonblocking (<=) Assignments',
        summary: 'Blocking assignments (<code>=</code>) execute sequentially in software order. Nonblocking assignments (<code>&lt;=</code>) evaluate all RHS expressions concurrently at the clock edge, then update all LHS targets simultaneously.',
        exampleVerilog: `// Correct Nonblocking (<=): Concurrent hardware registers
always @(posedge clk) begin
    q1 <= d;
    q2 <= q1;  // q2 samples previous q1 simultaneously!
end
// Flawed Blocking (=): Sequential software race condition
always @(posedge clk) begin
    q1 = d;
    q2 = q1;   // q2 receives new d in the SAME cycle!
end`,
        hardware: 'Physical registers sample concurrently. Nonblocking (<code>&lt;=</code>) prevents race conditions and pipeline shoot-through.',
        rule: 'Golden Rule: Use <code>&lt;=</code> for sequential logic (<code>posedge clk</code>), and <code>=</code> for combinational logic.'
    }
};

export class PanelManager {
    /**
     * @param {import('../engine/circuit_graph.js').CircuitGraph} graph
     * @param {import('../engine/verilog_generator.js').VerilogGenerator} verilogGen
     * @param {import('../ui/circuit_editor.js').CircuitEditor} editor
     */
    constructor(graph, verilogGen, editor) {
        this.graph = graph;
        this.verilogGen = verilogGen;
        this.editor = editor;

        this.currentDrawerTab = 'verilog';
        this.currentSidebarTab = 'palette';
        this.currentConstruct = 'assign';
        this.verilogStyle = 'continuous';

        this._bindDrawerTabs();
        this._bindSidebarTabs();
        this._bindInspector();
        this._bindExplainer();
        this.renderExplainer('assign');
    }

    _bindSidebarTabs() {
        const tabs = document.querySelectorAll('.sidebar-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const paletteView = document.getElementById('palette-container');
                const lessonsView = document.getElementById('lessons-container');

                if (target === 'palette') {
                    if (paletteView) paletteView.style.display = 'flex';
                    if (lessonsView) lessonsView.style.display = 'none';
                } else {
                    if (paletteView) paletteView.style.display = 'none';
                    if (lessonsView) lessonsView.style.display = 'flex';
                }
                this.currentSidebarTab = target;
            });
        });
    }

    _bindDrawerTabs() {
        const tabs = document.querySelectorAll('.drawer-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const panes = document.querySelectorAll('.tab-pane');
                panes.forEach(p => p.classList.remove('active'));

                const activePane = document.getElementById(`tab-${target}`);
                if (activePane) activePane.classList.add('active');

                this.currentDrawerTab = target;
                this.onTabSwitched(target);
            });
        });

        // Copy Verilog button
        const copyBtn = document.getElementById('copy-verilog-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const codeEl = document.getElementById('verilog-code-display');
                if (codeEl) {
                    navigator.clipboard.writeText(codeEl.textContent).then(() => {
                        const originalText = copyBtn.textContent;
                        copyBtn.textContent = '✓ Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                        }, 1800);
                    });
                }
            });
        }
    }

    _bindInspector() {
        this.editor.onSelectionChanged = (selection) => {
            this.updateInspector(selection);
            if (selection && selection.type === 'component' && selection.component) {
                this.updateVerilog(selection.component.id);
                this.renderExplainer(this._mapComponentToConstruct(selection.component));
            } else {
                this.updateVerilog(null);
            }
        };
    }

    _bindExplainer() {
        const chips = document.querySelectorAll('.explainer-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const construct = chip.getAttribute('data-construct');
                this.renderExplainer(construct);
            });
        });

        const btnCont = document.getElementById('btn-style-continuous');
        const btnProc = document.getElementById('btn-style-procedural');

        if (btnCont && btnProc) {
            btnCont.addEventListener('click', () => {
                btnCont.classList.add('active');
                btnProc.classList.remove('active');
                this.verilogStyle = 'continuous';
                const selectedComp = this.editor.selectedComponentId;
                this.updateVerilog(selectedComp);
            });
            btnProc.addEventListener('click', () => {
                btnProc.classList.add('active');
                btnCont.classList.remove('active');
                this.verilogStyle = 'procedural';
                const selectedComp = this.editor.selectedComponentId;
                this.updateVerilog(selectedComp);
            });
        }
    }

    renderExplainer(constructKey) {
        this.currentConstruct = constructKey;
        const data = RTL_EXPLANATIONS[constructKey] || RTL_EXPLANATIONS['assign'];
        const card = document.getElementById('verilog-explainer-card');
        if (!card) return;

        const chips = document.querySelectorAll('.explainer-chip');
        chips.forEach(c => {
            if (c.getAttribute('data-construct') === constructKey) {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        });

        card.innerHTML = `
            <div class="explainer-card-main">
                <div class="explainer-card-title">
                    <span>${data.name}</span>
                </div>
                <div class="explainer-card-desc">${data.summary}</div>
                <div class="explainer-card-hardware"><strong>Synthesis:</strong> ${data.hardware}</div>
                <div style="font-size:10.5px; color:#fde68a;"><strong>Rule:</strong> ${data.rule}</div>
            </div>
            <div class="explainer-card-side">
                <div style="font-size:10px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Validated Verilog Pattern</div>
                <pre class="explainer-code-snippet"><code>${this._escapeHtml(data.exampleVerilog)}</code></pre>
            </div>
        `;
    }

    _mapComponentToConstruct(comp) {
        if (!comp) return 'assign';
        switch (comp.type) {
            case 'AND':
            case 'OR':
            case 'NOT':
            case 'NAND':
            case 'NOR':
            case 'XOR':
            case 'XNOR':
            case 'INPUT':
            case 'OUTPUT':
                return this.verilogStyle === 'procedural' ? 'always-comb' : 'assign';
            case 'MUX2':
                return 'case';
            case 'DFF':
            case 'DFFE':
            case 'DFFSR':
            case 'DFFESR':
            case 'CLOCK':
                return 'always-ff';
            default:
                return 'assign';
        }
    }

    onTabSwitched(tabName) {
        if (tabName === 'verilog') {
            const selectedComp = this.editor.selectedComponentId;
            this.updateVerilog(selectedComp);
        } else if (tabName === 'truth-table') {
            if (window.app && window.app.truthTable) {
                window.app.truthTable.render();
            }
        } else if (tabName === 'waveform') {
            if (window.app && window.app.waveform) {
                window.app.waveform.redraw();
            }
        }
    }

    _escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    updateVerilog(selectedComponentId = null) {
        const codeDisplay = document.getElementById('verilog-code-display');
        const syncIndicator = document.getElementById('verilog-sync-indicator');
        if (!codeDisplay) return;

        const res = this.verilogStyle === 'procedural'
            ? this.verilogGen.generateProcedural('digital_circuit')
            : this.verilogGen.generate('digital_circuit');

        if (!res.ok || !res.code) {
            codeDisplay.textContent = res.code || '// No code generated';
            if (syncIndicator) syncIndicator.style.display = 'none';
            return;
        }

        const lines = res.code.split('\n');
        const selectedComp = selectedComponentId ? this.graph.getComponent(selectedComponentId) : null;
        let matchedCount = 0;

        // Build line-by-line HTML with syntax & selection highlighting
        const html = lines.map((line, idx) => {
            let isHighlighted = false;
            if (selectedComp) {
                const sName = (this.verilogGen.signalNames && this.verilogGen.signalNames.get(selectedComp.id)) 
                    || selectedComp.label 
                    || selectedComp.id;
                
                // Regex word boundary matching for signal identifier
                const idPattern = new RegExp(`\\b${sName}\\b`);
                if (idPattern.test(line)) {
                    isHighlighted = true;
                } else if ((selectedComp.type === 'DFF' || selectedComp.type === 'DFFE' || selectedComp.type === 'DFFSR' || selectedComp.type === 'DFFESR') && 
                           (line.includes(`${sName}_q`) || (line.includes('always @(posedge') && line.includes(sName)))) {
                    isHighlighted = true;
                }
            }

            if (isHighlighted) matchedCount++;
            const hlClass = isHighlighted ? 'highlighted-verilog-line' : '';
            return `<div class="verilog-line ${hlClass}" data-line="${idx + 1}"><span class="line-num">${idx + 1}</span><span class="line-text">${this._escapeHtml(line)}</span></div>`;
        }).join('');

        codeDisplay.innerHTML = html;
        if (syncIndicator) {
            syncIndicator.style.display = (selectedComp && matchedCount > 0) ? 'inline-block' : 'none';
        }
    }

    _getRtlMappingInfo(comp) {
        switch (comp.type) {
            case 'AND':
                return {
                    construct: 'Continuous Bitwise AND (&)',
                    example: `assign y = (in0 & in1);`,
                    cell: 'AND2X1 Combinational Cell',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'OR':
                return {
                    construct: 'Continuous Bitwise OR (|)',
                    example: `assign y = (in0 | in1);`,
                    cell: 'OR2X1 Combinational Cell',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'NOT':
                return {
                    construct: 'Continuous Inversion (~)',
                    example: `assign y = (~in0);`,
                    cell: 'INVX1 Inverter Cell',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'NAND':
                return {
                    construct: 'Continuous Bitwise NAND (~(&))',
                    example: `assign y = ~(in0 & in1);`,
                    cell: 'NAND2X1 Inverted Gate',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'NOR':
                return {
                    construct: 'Continuous Bitwise NOR (~(|))',
                    example: `assign y = ~(in0 | in1);`,
                    cell: 'NOR2X1 Inverted Gate',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'XOR':
                return {
                    construct: 'Continuous Bitwise XOR (^)',
                    example: `assign sum = (a ^ b);`,
                    cell: 'XOR2X1 Parity/Adder Cell',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'XNOR':
                return {
                    construct: 'Continuous Equivalence (~(^))',
                    example: `assign eq = ~(a ^ b);`,
                    cell: 'XNOR2X1 Equality Cell',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'MUX2':
                return {
                    construct: 'Ternary Conditional (sel ? in1 : in0)',
                    example: `assign y = sel ? b : a;`,
                    cell: 'MUX2X1 Data Selector',
                    timing: 'Zero cycle (combinational propagation delay)'
                };
            case 'DFF':
                return {
                    construct: 'Clocked always @(posedge clk)',
                    example: `always @(posedge clk) q <= d;`,
                    cell: 'DFFX1 Rising-Edge Register',
                    timing: 'Sequential 1-cycle latency (samples D on clock edge)'
                };
            case 'DFFE':
                return {
                    construct: 'always @(posedge clk) with Clock Enable',
                    example: `always @(posedge clk) begin\n    if (en) q <= d;\nend`,
                    cell: 'DFFEX1 Clock-Enabled Register',
                    timing: 'Sequential: loads D on rising edge if EN=1; holds state when EN=0'
                };
            case 'DFFSR':
                return {
                    construct: 'always @(posedge clk) with Synchronous Reset',
                    example: `always @(posedge clk) begin\n    if (rst) q <= 1'b0;\n    else q <= d;\nend`,
                    cell: 'DFFSRX1 Synchronous Reset Register',
                    timing: 'Sequential: synchronous clear on rising clock edge if RST=1'
                };
            case 'DFFESR':
                return {
                    construct: 'always @(posedge clk) with Reset Priority over Enable',
                    example: `always @(posedge clk) begin\n    if (rst) q <= 1'b0;\n    else if (en) q <= d;\nend`,
                    cell: 'DFFESRX1 Register (Reset Priority)',
                    timing: 'Sequential: reset takes priority over enable on rising clock edge'
                };
            case 'INPUT':
                return {
                    construct: 'Module Input Port (input wire)',
                    example: `input wire ${comp.label};`,
                    cell: 'Primary Input Pad / Net',
                    timing: 'Driven externally'
                };
            case 'OUTPUT':
                return {
                    construct: 'Module Output Port (output wire)',
                    example: `output wire ${comp.label};`,
                    cell: 'Primary Output Pad / Net',
                    timing: 'Driven continuously via assign'
                };
            case 'CLOCK':
                return {
                    construct: 'Clock Net (posedge clk sensitivity)',
                    example: `input wire ${comp.label};`,
                    cell: 'Clock Distribution Network / Tree',
                    timing: 'Periodic clock edge generator'
                };
            default:
                return null;
        }
    }

    _getLiveBehaviorExplanation(comp) {
        if (!comp) return null;
        const in0 = comp.inputs?.[0]?.value ?? null;
        const in1 = comp.inputs?.[1]?.value ?? null;
        const in2 = comp.inputs?.[2]?.value ?? null;
        const in3 = comp.inputs?.[3]?.value ?? null;
        const out0 = comp.outputs?.[0]?.value ?? null;

        switch (comp.type) {
            case 'AND': {
                const isHigh = out0 === 1;
                return {
                    state: isHigh ? 'OUTPUT HIGH (1)' : 'OUTPUT LOW (0)',
                    stateColor: isHigh ? '#4ade80' : '#94a3b8',
                    explanation: isHigh
                        ? 'Both inputs A and B are 1 (VDD). The internal CMOS pull-up network is active, driving output Y to 1.'
                        : `Input A=${in0 !== null ? in0 : '?'} and Input B=${in1 !== null ? in1 : '?'}. An AND gate outputs 0 whenever any input is 0. Output is pulled down to GND (0).`
                };
            }
            case 'OR': {
                const isHigh = out0 === 1;
                return {
                    state: isHigh ? 'OUTPUT HIGH (1)' : 'OUTPUT LOW (0)',
                    stateColor: isHigh ? '#4ade80' : '#94a3b8',
                    explanation: isHigh
                        ? `Input A=${in0 !== null ? in0 : '?'}, B=${in1 !== null ? in1 : '?'}. Output Y is 1 because at least one input is HIGH (1).`
                        : 'Both inputs A and B are 0 (GND). Output Y remains 0.'
                };
            }
            case 'NOT': {
                const isHigh = out0 === 1;
                return {
                    state: isHigh ? 'OUTPUT HIGH (1)' : 'OUTPUT LOW (0)',
                    stateColor: isHigh ? '#4ade80' : '#94a3b8',
                    explanation: `Input is ${in0 !== null ? in0 : '?'}. The CMOS inverter flips the voltage: ${in0 === 0 ? '0V (GND) is inverted to VDD (1)' : 'VDD (1) is inverted to 0V (0)'}.`
                };
            }
            case 'NAND': {
                const isHigh = out0 === 1;
                return {
                    state: isHigh ? 'OUTPUT HIGH (1)' : 'OUTPUT LOW (0)',
                    stateColor: isHigh ? '#4ade80' : '#94a3b8',
                    explanation: isHigh
                        ? 'Output is 1 because NOT all inputs are 1. Inverted AND logic.'
                        : 'Both inputs are 1, so the NAND gate inverts the result to 0.'
                };
            }
            case 'NOR': {
                const isHigh = out0 === 1;
                return {
                    state: isHigh ? 'OUTPUT HIGH (1)' : 'OUTPUT LOW (0)',
                    stateColor: isHigh ? '#4ade80' : '#94a3b8',
                    explanation: isHigh
                        ? 'Both inputs are 0, so the NOR gate drives output HIGH (1).'
                        : 'At least one input is 1, so the NOR gate inverts the result to 0.'
                };
            }
            case 'XOR': {
                const isHigh = out0 === 1;
                return {
                    state: isHigh ? 'OUTPUT HIGH (1)' : 'OUTPUT LOW (0)',
                    stateColor: isHigh ? '#4ade80' : '#94a3b8',
                    explanation: isHigh
                        ? `Inputs are different (A=${in0}, B=${in1}). XOR generates 1 for odd parity (binary sum without carry).`
                        : `Inputs are identical (A=${in0}, B=${in1}). XOR generates 0.`
                };
            }
            case 'XNOR': {
                const isHigh = out0 === 1;
                return {
                    state: isHigh ? 'OUTPUT HIGH (1)' : 'OUTPUT LOW (0)',
                    stateColor: isHigh ? '#4ade80' : '#94a3b8',
                    explanation: isHigh
                        ? 'Inputs are identical. XNOR acts as a 1-bit equality comparator (A == B).'
                        : 'Inputs are different, producing 0.'
                };
            }
            case 'MUX2': {
                const sel = in2 ?? 0;
                const activeIn = sel === 1 ? in1 : in0;
                return {
                    state: `ROUTING PORT ${sel}`,
                    stateColor: '#38bdf8',
                    explanation: `Select line is ${sel}. The multiplexer is actively steering Input ${sel === 1 ? 'B (port 1)' : 'A (port 0)'} (value ${activeIn !== null ? activeIn : '?'}) directly to Output Y.`
                };
            }
            case 'DFF': {
                return {
                    state: `STORED Q = ${out0 ?? 0}`,
                    stateColor: out0 === 1 ? '#4ade80' : '#94a3b8',
                    explanation: `Clock is ${in1 ?? 0}, incoming Data D is ${in0 ?? 0}. Stored state is Q=${out0 ?? 0}. On the next rising clock edge (0→1 transition), Q will capture ${in0 ?? 0}.`
                };
            }
            case 'DFFE': {
                const en = in2 ?? 0;
                return {
                    state: `STORED Q = ${out0 ?? 0} (EN=${en})`,
                    stateColor: en === 1 ? '#38bdf8' : '#94a3b8',
                    explanation: en === 1
                        ? `Clock Enable EN=1. On the next rising clock edge, Q will load new Data D=${in0 ?? 0}.`
                        : `Clock Enable EN=0. Clock pulses are ignored and Q=${out0 ?? 0} is held indefinitely.`
                };
            }
            case 'DFFSR': {
                const rst = in2 ?? 0;
                return {
                    state: `STORED Q = ${out0 ?? 0} (RST=${rst})`,
                    stateColor: rst === 1 ? '#f87171' : '#94a3b8',
                    explanation: rst === 1
                        ? 'Synchronous Reset RST=1. On the next rising clock edge, Q will be synchronously forced to 0.'
                        : `Normal operation (RST=0). Next clock edge loads Data D=${in0 ?? 0}.`
                };
            }
            case 'DFFESR': {
                const en = in2 ?? 0;
                const rst = in3 ?? 0;
                return {
                    state: `STORED Q = ${out0 ?? 0} (RST=${rst}, EN=${en})`,
                    stateColor: rst === 1 ? '#f87171' : (en === 1 ? '#38bdf8' : '#94a3b8'),
                    explanation: rst === 1
                        ? 'Reset Dominance: RST=1 overrides Enable! Next rising clock edge forces Q to 0.'
                        : (en === 1 ? `EN=1, RST=0: Next clock edge loads D=${in0 ?? 0}.` : 'EN=0, RST=0: Register retains state.')
                };
            }
            case 'INPUT': {
                const val = comp.value ?? 0;
                return {
                    state: val === 1 ? 'LOGIC HIGH (1 / VDD)' : 'LOGIC LOW (0 / GND)',
                    stateColor: val === 1 ? '#4ade80' : '#94a3b8',
                    explanation: 'Primary digital input switch. Click this component on the canvas to toggle its logic level between 0 and 1.'
                };
            }
            case 'OUTPUT': {
                const val = in0 ?? 0;
                return {
                    state: val === 1 ? 'PROBED HIGH (1)' : 'PROBED LOW (0)',
                    stateColor: val === 1 ? '#4ade80' : '#94a3b8',
                    explanation: `Primary circuit output monitor. Currently observing ${val === 1 ? 'HIGH (1 / green glow)' : 'LOW (0 / gray wire)'} from driving logic.`
                };
            }
            case 'CLOCK': {
                return {
                    state: `CLOCK = ${comp.value ?? 0}`,
                    stateColor: '#38bdf8',
                    explanation: 'Synchronous clock signal. Pulse it in the Waveform Viewer tab (or press Clock Step) to advance sequential flip-flops.'
                };
            }
            default:
                return null;
        }
    }

    updateInspector(selection) {
        const inspectorContainer = document.getElementById('inspector-content');
        if (!inspectorContainer) return;

        if (!selection || !selection.type) {
            // General circuit stats & beginner guidance
            const summary = this.graph.getSummary();
            const validation = this.graph.validateCircuit();

            if (summary.componentCount === 0) {
                // Empty canvas friendly quick-start card
                inspectorContainer.innerHTML = `
                    <div class="inspector-card" style="border-left: 3px solid var(--accent-primary);">
                        <div class="inspector-card-title" style="color:var(--accent-primary);">
                            <span>👋 Welcome to RTL Playground!</span>
                        </div>
                        <div style="font-size:12px; line-height:1.5; color:var(--text-muted); display:flex; flex-direction:column; gap:8px;">
                            <div>New to digital design? Follow these 4 easy steps:</div>
                            <ol style="margin:0 0 0 16px; padding:0; display:flex; flex-direction:column; gap:4px;">
                                <li><strong style="color:var(--text-main);">Palette:</strong> Drag a logic gate (AND, OR, NOT) or Input switch from the left panel onto the canvas.</li>
                                <li><strong style="color:var(--text-main);">Toggle Inputs:</strong> Click any Input switch (A, B) to toggle between <strong>0 (LOW)</strong> and <strong>1 (HIGH)</strong>.</li>
                                <li><strong style="color:var(--text-main);">Wire Pins:</strong> Drag a wire from output pins to input pins.</li>
                                <li><strong style="color:var(--text-main);">Guided Lessons:</strong> Open the <strong>Lessons</strong> tab on the left for step-by-step challenges!</li>
                            </ol>
                            <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
                                <button id="btn-inspector-start-lesson" class="btn btn-primary btn-sm" style="width:100%;">
                                    🚀 Start Lesson 1: Logic Gates →
                                </button>
                                <button id="btn-inspector-tour" class="btn btn-secondary btn-sm" style="width:100%;">
                                    ❓ Open Quick Beginner Tour
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="inspector-card">
                        <div class="inspector-card-title">Circuit Statistics</div>
                        <div style="font-size:11.5px; color:var(--text-muted);">Canvas is currently empty. Drag components from the Palette to begin!</div>
                    </div>
                `;

                const startLessonBtn = document.getElementById('btn-inspector-start-lesson');
                if (startLessonBtn) {
                    startLessonBtn.addEventListener('click', () => {
                        const lessonsTabBtn = document.querySelector('.sidebar-tab-btn[data-tab="lessons"]');
                        if (lessonsTabBtn) lessonsTabBtn.click();
                        if (window.app && window.app.lessonManager) {
                            const l1 = window.app.lessonManager.getLessonById('lesson-1-gates');
                            if (l1) window.app.lessonManager.openLesson(l1);
                        }
                    });
                }

                const tourBtn = document.getElementById('btn-inspector-tour');
                if (tourBtn && window.openQuickTour) {
                    tourBtn.addEventListener('click', () => window.openQuickTour());
                }
                return;
            }

            let healthHtml = '';
            if (!validation.valid) {
                healthHtml = `
                    <div class="circuit-alert alert-error">
                        <div>
                            <strong>Error:</strong> ${validation.errors.join('<br>')}
                        </div>
                    </div>
                `;
            } else if (validation.warnings.length > 0) {
                healthHtml = `
                    <div class="circuit-alert alert-warn">
                        <div>
                            <strong>Warning:</strong> ${validation.warnings.join('<br>')}
                        </div>
                    </div>
                `;
            } else {
                healthHtml = `
                    <div class="circuit-alert alert-ok">
                        <div>✓ Circuit topology clean & valid</div>
                    </div>
                `;
            }

            // Summary card with live activity overview
            inspectorContainer.innerHTML = `
                <div class="inspector-card" style="border-left: 3px solid var(--accent-primary);">
                    <div class="inspector-card-title" style="color:var(--accent-primary);">⚡ Live Circuit Activity</div>
                    <div style="font-size:11.5px; color:var(--text-muted); line-height:1.45;">
                        <div>Currently simulating in real time.</div>
                        <div style="margin-top:4px;">💡 <em>Tip: Click any component or wire on the canvas to inspect its live logic voltages and physical silicon behavior!</em></div>
                    </div>
                </div>

                <div class="inspector-card">
                    <div class="inspector-card-title">Circuit Statistics</div>
                    <div class="stat-grid">
                        <div class="stat-item">
                            <span class="stat-label">Components</span>
                            <span class="stat-val">${summary.componentCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Connections</span>
                            <span class="stat-val">${summary.connectionCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Inputs / Clocks</span>
                            <span class="stat-val">${summary.inputCount + summary.clockCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Outputs</span>
                            <span class="stat-val">${summary.outputCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Flip-Flops</span>
                            <span class="stat-val">${summary.dffCount}</span>
                        </div>
                    </div>
                </div>

                <div class="inspector-card">
                    <div class="inspector-card-title">Circuit Health</div>
                    ${healthHtml}
                </div>
            `;
            return;
        }

        if (selection.type === 'component') {
            const comp = selection.component;
            if (!comp) return;

            const liveExplainer = this._getLiveBehaviorExplanation(comp);
            let liveCardHtml = '';
            if (liveExplainer) {
                liveCardHtml = `
                    <div class="inspector-card" style="border-left: 3px solid ${liveExplainer.stateColor};">
                        <div class="inspector-card-title" style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:${liveExplainer.stateColor};">⚡ Live Hardware State</span>
                            <span style="font-size:10px; font-weight:600; padding:1px 6px; border-radius:3px; background:rgba(255,255,255,0.06); color:${liveExplainer.stateColor};">${liveExplainer.state}</span>
                        </div>
                        <div style="font-size:11.5px; line-height:1.45; color:var(--text-main);">
                            ${liveExplainer.explanation}
                        </div>
                    </div>
                `;
            }

            const rtlInfo = this._getRtlMappingInfo(comp);
            let rtlCardHtml = '';
            if (rtlInfo) {
                rtlCardHtml = `
                    <div class="inspector-card" style="border-left: 3px solid var(--accent-primary);">
                        <div class="inspector-card-title" style="color:var(--accent-primary);">RTL Hardware Mapping</div>
                        <div style="display:flex; flex-direction:column; gap:6px; font-size:12px;">
                            <div><strong>Construct:</strong> <code style="font-size:11px; color:#38bdf8;">${this._escapeHtml(rtlInfo.construct)}</code></div>
                            <div><strong>Verilog Pattern:</strong></div>
                            <pre class="rtl-example-code" style="padding:4px 6px; font-size:11px;"><code>${this._escapeHtml(rtlInfo.example)}</code></pre>
                            <div><strong>Synthesis Cell:</strong> <span>${rtlInfo.cell}</span></div>
                            <div style="font-size:11px; color:var(--text-muted);"><strong>Timing:</strong> ${rtlInfo.timing}</div>
                        </div>
                    </div>
                `;
            }

            inspectorContainer.innerHTML = `
                ${liveCardHtml}
                <div class="inspector-card">
                    <div class="inspector-card-title">
                        <span>Selected Component</span>
                        <button id="btn-delete-selected" class="btn btn-sm btn-danger">Delete</button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; font-size:11.5px;">
                        <div><strong>Type:</strong> ${comp.type}</div>
                        <div><strong>Label:</strong> ${comp.label}</div>
                        <div><strong>ID:</strong> <code style="font-size:10px;">${comp.id}</code></div>
                        <div><strong>Inputs:</strong> ${comp.inputs.length}</div>
                        <div><strong>Outputs:</strong> ${comp.outputs.length}</div>
                    </div>
                </div>
                ${rtlCardHtml}
            `;

            const delBtn = document.getElementById('btn-delete-selected');
            if (delBtn) {
                delBtn.addEventListener('click', () => {
                    this.graph.removeComponent(comp.id);
                    this.editor.render();
                    this.updateInspector(null);
                });
            }
        } else if (selection.type === 'wire') {
            const conn = selection.connection;
            if (!conn) return;

            // Find source component to read live wire voltage
            const srcComp = this.graph.getComponent(conn.fromComponent);
            const srcVal = srcComp?.outputs[0]?.value ?? null;
            const isHigh = srcVal === 1;

            inspectorContainer.innerHTML = `
                <div class="inspector-card" style="border-left: 3px solid ${isHigh ? '#4ade80' : '#94a3b8'};">
                    <div class="inspector-card-title" style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:${isHigh ? '#4ade80' : 'var(--text-main)'};">⚡ Live Signal Net</span>
                        <span style="font-size:10px; font-weight:600; padding:1px 6px; border-radius:3px; background:rgba(255,255,255,0.06); color:${isHigh ? '#4ade80' : '#94a3b8'};">
                            ${isHigh ? 'LOGIC HIGH (1 / VDD)' : 'LOGIC LOW (0 / GND)'}
                        </span>
                    </div>
                    <div style="font-size:11.5px; line-height:1.45; color:var(--text-main);">
                        Carrying <strong>${isHigh ? '3.3V / VDD (Logic 1)' : '0V / Ground (Logic 0)'}</strong>.
                        In physical design, wires represent copper or aluminum interconnects etched into chip metal layers (M1–M8).
                    </div>
                </div>

                <div class="inspector-card">
                    <div class="inspector-card-title">
                        <span>Selected Connection</span>
                        <button id="btn-delete-selected" class="btn btn-sm btn-danger">Delete</button>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; font-size:11px;">
                        <div><strong>From Pin:</strong> <code>${conn.fromComponent}.${conn.fromPin}</code></div>
                        <div><strong>To Pin:</strong> <code>${conn.toComponent}.${conn.toPin}</code></div>
                    </div>
                </div>
            `;

            const delBtn = document.getElementById('btn-delete-selected');
            if (delBtn) {
                delBtn.addEventListener('click', () => {
                    this.graph.removeConnection(conn.id);
                    this.editor.render();
                    this.updateInspector(null);
                });
            }
        }
    }
}
