/**
 * app.js — Main Application Controller
 * 
 * Coordinates engine layers (CircuitGraph, LogicSimulator, SequentialEngine, VerilogGenerator)
 * with UI controllers (CircuitEditor, ComponentLibrary, PanelManager, TruthTable, WaveformViewer, LessonManager).
 * 
 * @module App
 */

import { CircuitGraph } from './engine/circuit_graph.js';
import { LogicSimulator } from './engine/logic_simulator.js';
import { SequentialEngine } from './engine/sequential_engine.js';
import { VerilogGenerator } from './engine/verilog_generator.js';

import { CircuitEditor } from './ui/circuit_editor.js';
import { ComponentLibrary } from './ui/component_library.js';
import { PanelManager } from './ui/panels.js';
import { TruthTable } from './ui/truth_table.js';
import { WaveformViewer } from './ui/waveform_viewer.js';

import { PRESETS } from './modules/presets.js';
import { LessonManager } from './modules/lessons.js';
import { soundManager } from './ui/sound_effects.js';

export class RTLPlaygroundApp {
    constructor() {
        // 1. Initialize Engines
        this.graph = new CircuitGraph();
        this.simulator = new LogicSimulator(this.graph);
        this.sequentialEngine = new SequentialEngine(this.graph, this.simulator);
        this.verilogGenerator = new VerilogGenerator(this.graph);

        // 2. Initialize UI Controllers
        this.editor = new CircuitEditor('circuit-svg', this.graph, this.simulator);
        this.componentLibrary = new ComponentLibrary('palette-container', this.editor);
        this.panels = new PanelManager(this.graph, this.verilogGenerator, this.editor);
        this.truthTable = new TruthTable('truth-table-view', this.graph, this.simulator);
        this.waveform = new WaveformViewer('waveform-view', this.sequentialEngine, this.editor);
        this.lessons = new LessonManager('lessons-container', this.graph, this.simulator, this.editor, this.sequentialEngine);

        this._setupEvents();
        this._loadDefaultCircuit();
        this.tour = new QuickTourController();
        this.handbook = new HandbookController();
        this._setupAudioControls();

        // Check if user is visiting for the first time
        try {
            if (!localStorage.getItem('rtl_tour_seen')) {
                setTimeout(() => {
                    this.tour.open();
                }, 500);
            }
        } catch {}
    }

    _setupEvents() {
        // Circuit graph change pipeline
        this.graph.on('change', () => {
            // 1. Evaluate combinational logic
            this.simulator.evaluate();

            // 2. Update visual signals
            this.editor.updateSignals();

            // 3. Update Verilog code
            this.panels.updateVerilog();

            // 4. Update Inspector & health stats
            this.panels.updateInspector(null);

            // 5. Update Truth Table if visible
            if (this.panels.currentDrawerTab === 'truth-table') {
                this.truthTable.render();
            }

            // 6. Update Waveform if visible
            if (this.panels.currentDrawerTab === 'waveform') {
                this.waveform.redraw();
            }
        });

        // Preset selector
        const presetSelect = document.getElementById('preset-select');
        if (presetSelect) {
            presetSelect.addEventListener('change', (e) => {
                const key = e.target.value;
                this.loadPreset(key);
            });
        }

        // Reset canvas buttons
        const resetBtn = document.getElementById('btn-reset-circuit');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetCircuit();
            });
        }

        const clearCanvasBtn = document.getElementById('btn-canvas-clear');
        if (clearCanvasBtn) {
            clearCanvasBtn.addEventListener('click', () => {
                this.resetCircuit();
            });
        }
    }


    _setupAudioControls() {
        const audioBtn = document.getElementById('btn-audio-toggle');
        const audioIcon = document.getElementById('audio-toggle-icon');
        if (!audioBtn) return;

        const updateIcon = () => {
            if (audioIcon) audioIcon.textContent = soundManager.isMuted ? '🔇' : '🔊';
            audioBtn.title = soundManager.isMuted ? 'Sound Effects: Muted (Click to Unmute)' : 'Sound Effects: Active (Click to Mute)';
        };
        updateIcon();

        audioBtn.addEventListener('click', () => {
            soundManager.toggleMute();
            updateIcon();
        });
    }

    loadPreset(presetKey) {
        const preset = PRESETS[presetKey];
        if (!preset) return;

        this.graph.deserialize(preset.circuit);
        this.sequentialEngine.reset();
        this.sequentialEngine.initializeDFFs();
        this.simulator.evaluate();
        this.editor.render();
        this.panels.updateVerilog();
        this.panels.updateInspector(null);

        const statusBar = document.getElementById('canvas-status-text');
        if (statusBar) {
            statusBar.textContent = `Loaded Preset: ${preset.name}`;
            statusBar.style.color = 'var(--accent-primary)';
            setTimeout(() => {
                statusBar.textContent = 'Ready';
                statusBar.style.color = 'var(--text-muted)';
            }, 3000);
        }
    }

    resetCircuit() {
        this.graph.clear();
        this.sequentialEngine.reset();
        this.simulator.evaluate();
        this.editor.render();
        this.panels.updateVerilog();
        this.panels.updateInspector(null);

        const select = document.getElementById('preset-select');
        if (select) select.value = '';

        const statusBar = document.getElementById('canvas-status-text');
        if (statusBar) {
            statusBar.textContent = 'Circuit Cleared';
            setTimeout(() => {
                statusBar.textContent = 'Ready';
            }, 2000);
        }
    }

    _loadDefaultCircuit() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlPreset = urlParams.get('preset');
        if (urlPreset && PRESETS[urlPreset]) {
            this.loadPreset(urlPreset);
            const select = document.getElementById('preset-select');
            if (select) select.value = urlPreset;
        } else {
            // Load Half Adder preset by default for immediate exploration
            this.loadPreset('half-adder');
            const select = document.getElementById('preset-select');
            if (select) select.value = 'half-adder';
        }

        const urlLesson = urlParams.get('lesson');
        if (urlLesson && this.lessons) {
            // Switch to lessons tab
            const lessonTabBtn = document.querySelector('.sidebar-tab-btn[data-tab="lessons"]');
            if (lessonTabBtn) lessonTabBtn.click();
            const targetLesson = this.lessons.getLessonById ? this.lessons.getLessonById(urlLesson) : null;
            if (targetLesson) this.lessons.openLesson(targetLesson);
        }
    }
}

export class QuickTourController {
    constructor() {
        this.modal = document.getElementById('tour-modal');
        this.titleEl = document.getElementById('tour-step-title');
        this.contentEl = document.getElementById('tour-step-content');
        this.dotsEl = document.getElementById('tour-dots');
        this.prevBtn = document.getElementById('btn-tour-prev');
        this.nextBtn = document.getElementById('btn-tour-next');
        this.closeBtn = document.getElementById('btn-tour-close');

        this.currentStep = 0;
        this.steps = [
            {
                title: 'Welcome to RTL Playground! 👋',
                icon: '🚀',
                html: `
                    <p style="margin-bottom:10px;">RTL (Register-Transfer Level) is how digital chips and microprocessors are designed across the world!</p>
                    <p style="margin-bottom:10px;">In this playground, you can build electronic circuits using logic gates (AND, OR, NOT, XOR) and flip-flops, simulate signals live, and see real synthesizable Verilog code generated instantly.</p>
                    <div style="padding:8px 12px; background:rgba(56,189,248,0.1); border-left:3px solid var(--accent-primary); border-radius:4px; font-size:12px;">
                        💡 <strong>Zero experience needed!</strong> Follow the guided lessons to learn step by step.
                    </div>
                `
            },
            {
                title: 'Interacting with the Canvas 🖱️',
                icon: '🛠️',
                html: `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div><strong>1. Left Palette:</strong> Click & drag any logic gate, switch, or clock from the Palette onto the canvas.</div>
                        <div><strong>2. Toggle Inputs:</strong> Click input switches (A, B) directly on the canvas to flip between <strong>0 (LOW)</strong> and <strong>1 (HIGH)</strong>.</div>
                        <div><strong>3. Wiring:</strong> Click and drag from any output circle pin to an input circle pin to connect wires!</div>
                        <div><strong>4. Delete:</strong> Click any component or wire and press Delete or the trash button in the Inspector.</div>
                    </div>
                `
            },
            {
                title: 'Understanding Signals & Clocks ⚡',
                icon: '💡',
                html: `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div><strong style="color:#4ade80;">● Glowing Green Wires:</strong> Logic 1 (HIGH / 3.3V power). Electricity is active!</div>
                        <div><strong style="color:#94a3b8;">● Slate Gray Wires:</strong> Logic 0 (LOW / 0V Ground). No active voltage.</div>
                        <div><strong style="color:#38bdf8;">● Clock Pulse:</strong> Flip-flops update only on the rising clock edge. Step the clock in the <strong>Waveform Viewer</strong> tab below to watch data flow!</div>
                    </div>
                `
            },
            {
                title: 'Guided Lessons & Verilog Code 🎓',
                icon: '📚',
                html: `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div><strong>Lessons Tab:</strong> Click the <strong>Lessons</strong> tab in the left panel to access 12 guided challenges with live micro-step checklists and hints.</div>
                        <div><strong>Generated Verilog Tab:</strong> View industry-standard hardware description code generated live for your circuit!</div>
                        <div><strong>Ready to build?</strong> Let's start with Lesson 1: Understanding Logic Gates!</div>
                    </div>
                `
            }
        ];

        this.init();
    }

    init() {
        if (!this.modal) return;

        this.closeBtn?.addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        this.prevBtn?.addEventListener('click', () => {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.render();
            }
        });

        this.nextBtn?.addEventListener('click', () => {
            if (this.currentStep < this.steps.length - 1) {
                this.currentStep++;
                this.render();
            } else {
                this.close();
                const lessonTabBtn = document.querySelector('.sidebar-tab-btn[data-tab="lessons"]');
                if (lessonTabBtn) lessonTabBtn.click();
                if (window.app?.lessons) {
                    const l1 = window.app.lessons.getLessonById('lesson-1-gates');
                    if (l1) window.app.lessons.openLesson(l1);
                }
            }
        });

        const tourBtn = document.getElementById('btn-quick-tour');
        if (tourBtn) {
            tourBtn.addEventListener('click', () => this.open());
        }
        window.openQuickTour = () => this.open();
    }

    open() {
        this.currentStep = 0;
        this.render();
        if (this.modal) this.modal.style.display = 'flex';
        try { localStorage.setItem('rtl_tour_seen', 'true'); } catch {}
    }

    close() {
        if (this.modal) this.modal.style.display = 'none';
    }

    render() {
        const step = this.steps[this.currentStep];
        if (!step) return;

        if (this.titleEl) this.titleEl.textContent = step.title;
        if (this.contentEl) this.contentEl.innerHTML = step.html;

        if (this.prevBtn) {
            this.prevBtn.style.display = this.currentStep === 0 ? 'none' : 'inline-block';
        }

        if (this.nextBtn) {
            this.nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Start Lesson 1 🚀' : 'Next →';
        }

        if (this.dotsEl) {
            this.dotsEl.innerHTML = this.steps.map((_, idx) => `
                <div class="tour-dot ${idx === this.currentStep ? 'active' : ''}"></div>
            `).join('');
        }
    }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RTLPlaygroundApp();
});


export class HandbookController {
    constructor() {
        this.modal = document.getElementById('handbook-modal');
        this.closeBtn = document.getElementById('btn-handbook-close');
        this.openBtn = document.getElementById('btn-handbook');
        this.contentEl = document.getElementById('handbook-content');
        this.tabBtns = document.querySelectorAll('.handbook-tab-btn');
        this.currentTab = 'gates';

        this.tabData = {
            gates: {
                title: 'The 7 Fundamental Logic Gates',
                html: `
                    <p style="margin-bottom:12px; color:var(--text-muted); font-size:12px;">
                        All modern microprocessors, from smartphones to supercomputers, are built entirely from combinations of these 7 fundamental gates.
                    </p>
                    <div class="handbook-grid">
                        <div class="handbook-card">
                            <div class="handbook-card-title">
                                <span>AND Gate</span>
                                <span style="font-family:var(--font-mono); font-size:11px; color:#38bdf8;">Y = A · B</span>
                            </div>
                            <div style="font-size:11px; color:var(--text-muted);"><strong>Analogy:</strong> Two switches in series. Electricity only flows if switch A AND switch B are closed.</div>
                            <div style="font-size:11px; margin-top:4px;"><strong>Truth Table:</strong> [0,0→0] [0,1→0] [1,0→0] [1,1→1]</div>
                        </div>

                        <div class="handbook-card">
                            <div class="handbook-card-title">
                                <span>OR Gate</span>
                                <span style="font-family:var(--font-mono); font-size:11px; color:#38bdf8;">Y = A + B</span>
                            </div>
                            <div style="font-size:11px; color:var(--text-muted);"><strong>Analogy:</strong> Two switches in parallel. Current flows if switch A OR switch B is closed.</div>
                            <div style="font-size:11px; margin-top:4px;"><strong>Truth Table:</strong> [0,0→0] [0,1→1] [1,0→1] [1,1→1]</div>
                        </div>

                        <div class="handbook-card">
                            <div class="handbook-card-title">
                                <span>NOT Gate (Inverter)</span>
                                <span style="font-family:var(--font-mono); font-size:11px; color:#38bdf8;">Y = ~A</span>
                            </div>
                            <div style="font-size:11px; color:var(--text-muted);"><strong>Analogy:</strong> Normally-closed relay. Inverts high voltage to 0V ground, and ground to 3.3V power.</div>
                            <div style="font-size:11px; margin-top:4px;"><strong>Truth Table:</strong> [0→1] [1→0]</div>
                        </div>

                        <div class="handbook-card">
                            <div class="handbook-card-title">
                                <span>NAND Gate</span>
                                <span style="font-family:var(--font-mono); font-size:11px; color:#38bdf8;">Y = ~(A · B)</span>
                            </div>
                            <div style="font-size:11px; color:var(--text-muted);"><strong>Universal Gate:</strong> Inverted AND. Any digital chip can be constructed purely out of NAND gates alone!</div>
                            <div style="font-size:11px; margin-top:4px;"><strong>Truth Table:</strong> [0,0→1] [0,1→1] [1,0→1] [1,1→0]</div>
                        </div>

                        <div class="handbook-card">
                            <div class="handbook-card-title">
                                <span>NOR Gate</span>
                                <span style="font-family:var(--font-mono); font-size:11px; color:#38bdf8;">Y = ~(A + B)</span>
                            </div>
                            <div style="font-size:11px; color:var(--text-muted);"><strong>Universal Gate:</strong> Inverted OR. Outputs 1 only when all inputs are 0.</div>
                            <div style="font-size:11px; margin-top:4px;"><strong>Truth Table:</strong> [0,0→1] [0,1→0] [1,0→0] [1,1→0]</div>
                        </div>

                        <div class="handbook-card">
                            <div class="handbook-card-title">
                                <span>XOR Gate (Exclusive OR)</span>
                                <span style="font-family:var(--font-mono); font-size:11px; color:#38bdf8;">Y = A ^ B</span>
                            </div>
                            <div style="font-size:11px; color:var(--text-muted);"><strong>Analogy:</strong> 2-way staircase light switch. Toggling either switch flips the light! Output 1 when inputs differ.</div>
                            <div style="font-size:11px; margin-top:4px;"><strong>Truth Table:</strong> [0,0→0] [0,1→1] [1,0→1] [1,1→0]</div>
                        </div>

                        <div class="handbook-card">
                            <div class="handbook-card-title">
                                <span>XNOR Gate (Equivalence)</span>
                                <span style="font-family:var(--font-mono); font-size:11px; color:#38bdf8;">Y = ~(A ^ B)</span>
                            </div>
                            <div style="font-size:11px; color:var(--text-muted);"><strong>Equality Detector:</strong> Outputs 1 when inputs match (both 0 or both 1). Core building block of digital comparators.</div>
                            <div style="font-size:11px; margin-top:4px;"><strong>Truth Table:</strong> [0,0→1] [0,1→0] [1,0→0] [1,1→1]</div>
                        </div>
                    </div>
                `
            },
            levels: {
                title: 'The Physical Reality: Logic 0 vs Logic 1',
                html: `
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <p style="color:var(--text-muted); font-size:12px;">
                            In pure math, 0 and 1 are abstract numbers. But inside real physical silicon chips, they are physical voltages governed by electromagnetism and CMOS transistors.
                        </p>
                        <div class="handbook-grid">
                            <div class="handbook-card" style="border-left: 3px solid #4ade80;">
                                <div class="handbook-card-title" style="color:#4ade80;">Logic 1 (HIGH / Power)</div>
                                <div style="font-size:11px; color:var(--text-muted);"><strong>Physical Voltage:</strong> +3.3V or +1.2V (VDD supply rail).</div>
                                <div style="font-size:11px; margin-top:4px;"><strong>Silicon Behavior:</strong> PMOS transistors pull the net up toward the power rail. In this playground, active wires glow green with animated signal flow!</div>
                            </div>
                            <div class="handbook-card" style="border-left: 3px solid #94a3b8;">
                                <div class="handbook-card-title" style="color:#94a3b8;">Logic 0 (LOW / Ground)</div>
                                <div style="font-size:11px; color:var(--text-muted);"><strong>Physical Voltage:</strong> 0.0V (GND ground return).</div>
                                <div style="font-size:11px; margin-top:4px;"><strong>Silicon Behavior:</strong> NMOS transistors conduct to drain all electric charge to ground. In this playground, low wires are solid slate gray.</div>
                            </div>
                            <div class="handbook-card" style="border-left: 3px solid #ef4444;">
                                <div class="handbook-card-title" style="color:#ef4444;">Null / Floating Net (High-Z)</div>
                                <div style="font-size:11px; color:var(--text-muted);"><strong>Physical State:</strong> Unconnected pin or undriven wire.</div>
                                <div style="font-size:11px; margin-top:4px;"><strong>Danger in ASICs:</strong> Floating inputs pick up ambient electromagnetic noise and cause excessive leakage current. Always connect all gate inputs!</div>
                            </div>
                        </div>
                    </div>
                `
            },
            sequential: {
                title: 'Sequential Logic, Clocks & Flip-Flops',
                html: `
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <p style="color:var(--text-muted); font-size:12px;">
                            Combinational logic gates cannot remember the past. Sequential logic introduces memory and time synchronization using a master clock.
                        </p>
                        <div class="handbook-grid">
                            <div class="handbook-card">
                                <div class="handbook-card-title">Why Chips Need a Clock ⏱️</div>
                                <div style="font-size:11px; color:var(--text-muted);">
                                    Without a clock, signals would race through gates at different speeds depending on wire lengths and temperatures, causing chaotic glitches. The clock acts like an orchestra conductor, telling all memory units when to sample data simultaneously.
                                </div>
                            </div>
                            <div class="handbook-card">
                                <div class="handbook-card-title">The D Flip-Flop (Airlock Analogy) 🚪</div>
                                <div style="font-size:11px; color:var(--text-muted);">
                                    Imagine a two-door security airlock. When the clock is LOW, the outer door accepts new cargo (D). At the precise instant the clock rises (0→1), the outer door slams shut and the inner door opens, transferring cargo to the output (Q). Between clock ticks, Q is completely frozen and immune to changes on D!
                                </div>
                            </div>
                            <div class="handbook-card">
                                <div class="handbook-card-title">Setup & Hold Times 🛡️</div>
                                <div style="font-size:11px; color:var(--text-muted);">
                                    <strong>Setup Time (Tsu):</strong> Data on D must remain steady BEFORE the clock edge.<br>
                                    <strong>Hold Time (Th):</strong> Data on D must remain steady AFTER the clock edge.<br>
                                    Violating either time causes metastability (unpredictable oscillations)!
                                </div>
                            </div>
                        </div>
                    </div>
                `
            },
            'mux-math': {
                title: 'Data Routing (MUX) & Binary Arithmetic (Adders)',
                html: `
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <p style="color:var(--text-muted); font-size:12px;">
                            How computers make decisions and perform calculations.
                        </p>
                        <div class="handbook-grid">
                            <div class="handbook-card">
                                <div class="handbook-card-title">2:1 Multiplexer (Data Switch) 🔀</div>
                                <div style="font-size:11px; color:var(--text-muted);">
                                    Like a railroad switch: accepts two input data tracks (In0, In1) and uses a select line (Sel) to decide which one connects to the main track. Used in every CPU instruction decoder.
                                </div>
                            </div>
                            <div class="handbook-card">
                                <div class="handbook-card-title">1-Bit Half Adder ➕</div>
                                <div style="font-size:11px; color:var(--text-muted);">
                                    Adds two single bits: <strong>SUM = A ^ B</strong> (XOR), <strong>CARRY = A & B</strong> (AND). Cannot accept an incoming carry from a previous digit.
                                </div>
                            </div>
                            <div class="handbook-card">
                                <div class="handbook-card-title">1-Bit Full Adder 🔢</div>
                                <div style="font-size:11px; color:var(--text-muted);">
                                    Adds two bits (A, B) PLUS an incoming carry (Cin). Cascading 32 or 64 full adders in a row creates a 32-bit or 64-bit CPU arithmetic addition engine!
                                </div>
                            </div>
                        </div>
                    </div>
                `
            },
            verilog: {
                title: 'Hardware Description in Verilog RTL',
                html: `
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <p style="color:var(--text-muted); font-size:12px;">
                            Verilog is not software code (like C++ or Python). It describes physical silicon hardware circuits!
                        </p>
                        <div class="handbook-grid">
                            <div class="handbook-card">
                                <div class="handbook-card-title">Continuous Assign (Gates)</div>
                                <div style="font-size:11px; font-family:var(--font-mono); color:#38bdf8; background:rgba(0,0,0,0.3); padding:4px 6px; border-radius:4px;">
                                    assign y = a & b;
                                </div>
                                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                                    Describes physical wires and combinational gates. Updates continuously with zero clock dependency.
                                </div>
                            </div>
                            <div class="handbook-card">
                                <div class="handbook-card-title">Sequential Always (Registers)</div>
                                <div style="font-size:11px; font-family:var(--font-mono); color:#38bdf8; background:rgba(0,0,0,0.3); padding:4px 6px; border-radius:4px;">
                                    always @(posedge clk) begin<br>&nbsp;&nbsp;q <= d;<br>end
                                </div>
                                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                                    Infers D flip-flop registers triggered strictly on rising clock edges.
                                </div>
                            </div>
                            <div class="handbook-card">
                                <div class="handbook-card-title">Nonblocking (&lt;=) Rule</div>
                                <div style="font-size:11px; color:var(--text-muted);">
                                    Always use nonblocking (<code>&lt;=</code>) for sequential logic to model concurrent clock advancement and eliminate race conditions between pipeline stages!
                                </div>
                            </div>
                        </div>
                    </div>
                `
            }
        };

        this.init();
    }

    init() {
        if (!this.modal) return;

        this.openBtn?.addEventListener('click', () => this.open());
        this.closeBtn?.addEventListener('click', () => this.close());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.setTab(tab);
            });
        });
    }

    open() {
        this.render();
        if (this.modal) this.modal.style.display = 'flex';
    }

    close() {
        if (this.modal) this.modal.style.display = 'none';
    }

    setTab(tab) {
        if (!this.tabData[tab]) return;
        this.currentTab = tab;
        this.tabBtns.forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab') === tab);
        });
        this.render();
    }

    render() {
        if (!this.contentEl) return;
        const data = this.tabData[this.currentTab];
        if (data) {
            this.contentEl.innerHTML = data.html;
        }
    }
}
