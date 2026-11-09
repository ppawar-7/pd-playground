/**
 * app.js — Main Application Controller for Advanced RTL Lab
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

import { DatapathVisualizer } from './ui/datapath_visualizer.js';
import { RegisterVisualizer } from './ui/register_visualizer.js';
import { FSMEditor } from './ui/fsm_editor.js';
import { AdvancedWaveformViewer } from './ui/advanced_waveforms.js';
import { ADVANCED_LESSONS, LessonProgressManager } from './lessons/advanced_lessons.js';
import { AdvancedVerilogGenerator } from './engine/advanced_verilog.js';

class AdvancedRTLApp {
    constructor() {
        this.currentTab = 'datapath';
        this.init();
    }

    init() {
        this.setupNavigation();

        // 1. Initialize Datapath Visualizer
        const dpContainer = document.getElementById('datapath-mount');
        if (dpContainer) {
            this.datapathVis = new DatapathVisualizer(dpContainer);
        }

        // 2. Initialize Waveform Viewer
        const waveCanvas = document.getElementById('advanced-waveform-canvas');
        if (waveCanvas) {
            this.waveformVis = new AdvancedWaveformViewer(waveCanvas);
        }

        // 3. Initialize Register Visualizer
        const regContainer = document.getElementById('sequential-mount');
        if (regContainer) {
            this.regVis = new RegisterVisualizer(regContainer, (cycleData) => {
                if (this.waveformVis) {
                    this.waveformVis.recordCycle(cycleData);
                }
            });
        }

        // 4. Initialize FSM Editor
        const fsmContainer = document.getElementById('fsm-mount');
        if (fsmContainer) {
            this.fsmEditor = new FSMEditor(fsmContainer, (code, moduleName) => {
                this.displayVerilog(code, moduleName);
                this.switchTab('verilog');
            });
        }

        // 5. Initialize Guided Lessons
        this.renderLessons();

        // 6. Setup Verilog Selector
        this.setupVerilogTab();

        // 7. Direct Tab Deep-linking via URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const reqTab = urlParams.get('tab');
        if (reqTab && document.getElementById(`tab-${reqTab}`)) {
            this.switchTab(reqTab);
        }
    }

    setupNavigation() {
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                this.switchTab(target);
            });
        });
    }

    switchTab(tabId) {
        this.currentTab = tabId;
        document.querySelectorAll('.nav-tab').forEach(t => {
            if (t.dataset.tab === tabId) t.classList.add('active');
            else t.classList.remove('active');
        });

        document.querySelectorAll('.tab-content').forEach(c => {
            if (c.id === `tab-${tabId}`) c.classList.add('active');
            else c.classList.remove('active');
        });

        if (tabId === 'waveforms' && this.waveformVis) {
            this.waveformVis.render();
        }
    }

    renderLessons() {
        const container = document.getElementById('lessons-mount');
        if (!container) return;

        const completed = new Set(LessonProgressManager.getCompletedLessons());

        const FUNDAMENTALS = [
            { id: 1, title: 'Understanding Logic Gates', diff: 'Beginner', cat: 'Combinational', obj: 'Construct a 2-input AND gate and verify Boolean truth table.', preset: 'and-gate' },
            { id: 2, title: 'Building a Half Adder', diff: 'Beginner', cat: 'Arithmetic', obj: '1-bit adder producing SUM (XOR) and CARRY (AND).', preset: 'half-adder' },
            { id: 3, title: '2:1 Multiplexer', diff: 'Beginner', cat: 'Data Routing', obj: 'Conditional data steering using select line.', preset: 'mux-2to1' },
            { id: 4, title: 'D Flip-Flop Register', diff: 'Intermediate', cat: 'Sequential', obj: 'Rising-edge state storage and clock sensitivity.', preset: 'dff-demo' },
            { id: 5, title: 'MUX with Conditional Operator (?:)', diff: 'Intermediate', cat: 'RTL Coding', obj: 'Synthesizable continuous assign y = sel ? b : a.', preset: 'mux-cond' },
            { id: 6, title: 'Register with Clock Enable (ASIC MUX)', diff: 'Intermediate', cat: 'Sequential', obj: 'Clock gating mitigation via recirculation MUX.', preset: 'reg-enable' },
            { id: 7, title: 'Synchronous Reset Architecture', diff: 'Intermediate', cat: 'Sequential', obj: 'Deterministic posedge initialization without glitching.', preset: 'reg-sync-reset' },
            { id: 8, title: 'Clock Timing & Waveforms', diff: 'Intermediate', cat: 'Timing', obj: 'Hold, setup, and sequential propagation cycles.', preset: 'shift-reg-2stage' },
            { id: 9, title: '1-Bit Full Adder with Ripple', diff: 'Intermediate', cat: 'Arithmetic', obj: 'Full 8-state addition with input carry Cin.', preset: 'full-adder' },
            { id: 10, title: 'Native Register with Clock Enable (DFFE)', diff: 'Advanced', cat: 'RTL Primitives', obj: 'Hardware-synthesizable DFFE with nonblocking Verilog.', preset: 'dff-enable' },
            { id: 11, title: 'Priority in DFF with Enable & Sync Reset (DFFESR)', diff: 'Advanced', cat: 'RTL Primitives', obj: 'Strict reset-over-enable evaluation order in RTL.', preset: 'dff-esr-priority' },
            { id: 12, title: 'Blocking vs Nonblocking Assignment Semantics', diff: 'Advanced', cat: 'Verilog Theory', obj: 'Pipeline races (= vs <=) and synthesis equivalence.', preset: 'blocking-vs-nonblocking' }
        ];

        container.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
                <div>
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--accent-cyan);">Comprehensive Digital RTL Curriculum (24 Lessons)</h2>
                    <p style="color: var(--text-muted); font-size: 0.85rem;">
                        Tier 1–2: RTL Fundamentals (12 Lessons in Gate Editor) &nbsp;•&nbsp;
                        Tier 3–4: Advanced Systems & FSMs (12 Lessons Verified: ${completed.size} / ${ADVANCED_LESSONS.length})
                    </p>
                </div>
                <div style="display:flex; gap: 8px;">
                    <a href="../index.html" class="btn btn-secondary btn-sm" style="text-decoration:none;">← Open Fundamentals Editor</a>
                    <button id="btn-reset-lessons" class="btn btn-secondary btn-sm">Reset Progress</button>
                </div>
            </div>

            <!-- Tier 3 & 4: Advanced RTL Lab Lessons -->
            <h3 style="font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; color: #f3f4f6;">
                Part 2: Multi-Bit Vectors, Datapaths, Counters, FSMs & Verification (Lessons 13–24)
            </h3>
            <div class="lessons-list" style="margin-bottom: 28px;">
                ${ADVANCED_LESSONS.map((l, idx) => {
                    const isDone = completed.has(l.id);
                    const challengeInputsHtml = this._renderChallengeUI(l);
                    const hintsHtml = (l.hints && l.hints.length > 0) ? `
                        <div style="margin-top:6px;">
                            <button class="btn-adv-hint" data-lesson-id="${l.id}" style="background:none; border:none; color:var(--accent-cyan); font-size:0.75rem; cursor:pointer; padding:0; text-decoration:underline;">
                                💡 View Pedagogical Hint
                            </button>
                            <div id="adv-hint-${l.id}" style="display:none; margin-top:4px; padding:6px 8px; background:rgba(245,158,11,0.1); border-left:2px solid #f59e0b; border-radius:3px; font-size:0.78rem; color:#fde68a;">
                                ${l.hints.map(h => `• ${h}`).join('<br>')}
                            </div>
                        </div>
                    ` : '';

                    return `
                        <div class="lesson-card ${isDone ? 'completed' : ''}" id="card-${l.id}">
                            <div>
                                <div class="lesson-header">
                                    <span class="badge ${l.difficulty === 'Beginner' ? 'badge-primary' : (l.difficulty === 'Intermediate' ? 'badge-warn' : 'badge-info')}">
                                        ${l.difficulty}
                                    </span>
                                    <span class="badge">${l.category}</span>
                                </div>
                                <div class="lesson-title">${idx + 13}. ${l.title}</div>
                                <div class="lesson-obj">${l.objective}</div>
                                <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px;">${l.challenge}</div>
                                ${challengeInputsHtml}
                                ${hintsHtml}
                            </div>
                            <div style="margin-top: 10px;">
                                <div id="feedback-${l.id}" style="font-size: 0.8rem; margin-bottom: 8px;"></div>
                                <button class="btn ${isDone ? 'btn-secondary' : 'btn-primary'} btn-block btn-solve" data-lesson-id="${l.id}">
                                    ${isDone ? '✓ Re-Verify Solution' : 'Verify Challenge Solution'}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Tier 1 & 2: RTL Fundamentals (Single-bit) -->
            <h3 style="font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; color: #f3f4f6;">
                Part 1: Single-Bit RTL Fundamentals (Lessons 1–12)
            </h3>
            <div class="lessons-list">
                ${FUNDAMENTALS.map((f) => `
                    <div class="lesson-card" style="border-left: 3px solid var(--accent-cyan);">
                        <div>
                            <div class="lesson-header">
                                <span class="badge badge-primary">${f.diff}</span>
                                <span class="badge">${f.cat}</span>
                            </div>
                            <div class="lesson-title">${f.id}. ${f.title}</div>
                            <div class="lesson-obj">${f.obj}</div>
                        </div>
                        <div style="margin-top: 10px;">
                            <a href="../index.html?preset=${f.preset}" class="btn btn-secondary btn-block btn-sm" style="text-decoration:none; text-align:center; display:block;">
                                Launch in Visual Editor →
                            </a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Reset progress button
        const btnReset = container.querySelector('#btn-reset-lessons');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (confirm('Reset all lesson progress?')) {
                    LessonProgressManager.resetProgress();
                    this.renderLessons();
                }
            });
        }

        // Attach hint toggle handlers
        container.querySelectorAll('.btn-adv-hint').forEach(btn => {
            btn.addEventListener('click', () => {
                const lId = btn.dataset.lessonId;
                const hintBox = container.querySelector(`#adv-hint-${lId}`);
                if (hintBox) {
                    const isOpen = hintBox.style.display !== 'none';
                    hintBox.style.display = isOpen ? 'none' : 'block';
                    btn.textContent = isOpen ? '💡 View Pedagogical Hint' : 'Hide Hint';
                }
            });
        });

        // Attach verify handlers
        container.querySelectorAll('.btn-solve').forEach(btn => {
            btn.addEventListener('click', () => {
                const lId = btn.dataset.lessonId;
                const lesson = ADVANCED_LESSONS.find(x => x.id === lId);
                if (lesson) {
                    // Collect actual student inputs from the challenge UI
                    const studentSolution = this._collectUserSolution(lId);
                    const res = lesson.validate(studentSolution);

                    const feedback = container.querySelector(`#feedback-${lId}`);
                    if (res.success) {
                        LessonProgressManager.markCompleted(lId);
                        feedback.innerHTML = `<span style="color: #10b981; font-weight:600;">✅ ${res.message}</span>`;
                        this.renderLessons();
                    } else {
                        feedback.innerHTML = `<span style="color: #f43f5e; font-weight:600;">❌ ${res.message}</span>`;
                    }
                }
            });
        });
    }

    _renderChallengeUI(lesson) {
        switch (lesson.id) {
            case 'lesson_1_vectors_slicing':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">Configure Slicing Ranges:</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>Upper Nibble: <code>data[</code><input type="number" id="inp-${lesson.id}-umsb" value="7" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; text-align:center;"><code>:</code><input type="number" id="inp-${lesson.id}-ulsb" value="4" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; text-align:center;"><code>]</code></div>
                            <div>Lower Nibble: <code>data[</code><input type="number" id="inp-${lesson.id}-lmsb" value="3" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; text-align:center;"><code>:</code><input type="number" id="inp-${lesson.id}-llsb" value="0" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; text-align:center;"><code>]</code></div>
                        </div>
                    </div>
                `;
            case 'lesson_2_concatenation':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">Specify Operand & Result Bit-Widths:</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>Page width: <input type="number" id="inp-${lesson.id}-page" value="4" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; text-align:center;"> bits</div>
                            <div>Offset width: <input type="number" id="inp-${lesson.id}-offset" value="8" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; text-align:center;"> bits</div>
                            <div>Total address: <input type="number" id="inp-${lesson.id}-total" value="12" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; text-align:center;"> bits</div>
                        </div>
                    </div>
                `;
            case 'lesson_3_ripple_carry':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">Adder Stage Carry Logic:</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>Stage 0 (1 & 1): <select id="inp-${lesson.id}-s0" style="padding:2px 4px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px;"><option value="gen">Generates Carry (G=1)</option><option value="prop">Propagates (P=1)</option></select></div>
                            <div>Stage 1 (0 ^ 1): <select id="inp-${lesson.id}-s1" style="padding:2px 4px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px;"><option value="prop">Propagates Carry (P=1)</option><option value="gen">Generates (G=1)</option></select></div>
                        </div>
                    </div>
                `;
            case 'lesson_4_alu_flags':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">Predict Condition Flags for 5 + 4 = 9 (4-bit signed/unsigned):</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>Unsigned Carry: <select id="inp-${lesson.id}-c" style="padding:2px 4px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px;"><option value="0">C = 0 (No carry out > 15)</option><option value="1">C = 1 (Carry generated)</option></select></div>
                            <div>Signed Overflow: <select id="inp-${lesson.id}-v" style="padding:2px 4px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px;"><option value="1">V = 1 (Positive + Positive = Negative!)</option><option value="0">V = 0 (No signed overflow)</option></select></div>
                        </div>
                    </div>
                `;
            case 'lesson_5_registers_enable':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">Register State Retention:</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>When Clock Enable EN=0 and D changes: <select id="inp-${lesson.id}-hold" style="padding:2px 4px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px;"><option value="true">Retains previous state Q (Hold)</option><option value="false">Overwrites Q with D immediately</option></select></div>
                        </div>
                    </div>
                `;
            case 'lesson_6_sync_reset':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">Priority Resolution:</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>Simultaneous RST=1 and EN=1 on rising clock: <select id="inp-${lesson.id}-prio" style="padding:2px 4px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px;"><option value="true">Reset takes priority (Q <= 0)</option><option value="false">Enable takes priority (Q <= D)</option></select></div>
                        </div>
                    </div>
                `;
            case 'lesson_7_modulo_counter':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">Modulo-6 Counter Timing:</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>Terminal Count (tc) pulses HIGH at count: <input type="number" id="inp-${lesson.id}-tc" value="5" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; text-align:center;"></div>
                            <div>Modulo wrap-around modulus: <input type="number" id="inp-${lesson.id}-mod" value="6" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; text-align:center;"></div>
                        </div>
                    </div>
                `;
            case 'lesson_8_shift_registers':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">4-Cycle Serial Shifting (Bits 1, 0, 1, 1):</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>Resulting 4-bit Parallel Word: <select id="inp-${lesson.id}-shift" style="padding:2px 4px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px;"><option value="11">0b1011 (Hex 0xB / Decimal 11)</option><option value="13">0b1101 (Hex 0xD)</option><option value="0">0b0000</option></select></div>
                        </div>
                    </div>
                `;
            case 'lesson_9_fsm_moore':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">101 Sequence Detector Transition:</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>From state S_10, input bit 1 arrives: <select id="inp-${lesson.id}-fsm" style="padding:2px 4px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px;"><option value="S_101">Transition to S_101 (Pattern matched, out=1)</option><option value="S_RESET">Transition to S_RESET</option><option value="S_1">Transition to S_1</option></select></div>
                        </div>
                    </div>
                `;
            case 'lesson_10_moore_vs_mealy':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">FSM Timing & Latency Analysis:</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>Zero-cycle combinational reaction: <select id="inp-${lesson.id}-fsmtype" style="padding:2px 4px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px;"><option value="MEALY">Mealy Machine (Output = f(State, Inputs) -> 0 latency)</option><option value="MOORE">Moore Machine (Output = f(State) -> 1 cycle registered)</option></select></div>
                        </div>
                    </div>
                `;
            case 'lesson_11_latch_inference':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">Synthesis Latch Prevention Rule:</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>How to guarantee NO latches in always @(*): <select id="inp-${lesson.id}-latch" style="padding:2px 4px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px;"><option value="true">Complete assignment on all branches + default assignments</option><option value="false">Omitting the terminating else branch</option></select></div>
                        </div>
                    </div>
                `;
            case 'lesson_12_testbench_basics':
                return `
                    <div class="challenge-ui" style="margin: 8px 0; padding: 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 0.8rem;">
                        <div style="margin-bottom: 4px; font-weight:600; color:#38bdf8;">Testbench Stimulus Configuration:</div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <div>Clock Period: <input type="number" id="inp-${lesson.id}-period" value="10" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; text-align:center;"> time units</div>
                            <div>2-Stage Pipeline Latency: <input type="number" id="inp-${lesson.id}-latency" value="2" style="width:36px; padding:2px; background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; text-align:center;"> clock cycles</div>
                        </div>
                    </div>
                `;
            default:
                return '';
        }
    }

    _collectUserSolution(lId) {
        switch (lId) {
            case 'lesson_1_vectors_slicing':
                return {
                    upperMsb: parseInt(document.getElementById(`inp-${lId}-umsb`)?.value || '0', 10),
                    upperLsb: parseInt(document.getElementById(`inp-${lId}-ulsb`)?.value || '0', 10),
                    lowerMsb: parseInt(document.getElementById(`inp-${lId}-lmsb`)?.value || '0', 10),
                    lowerLsb: parseInt(document.getElementById(`inp-${lId}-llsb`)?.value || '0', 10)
                };
            case 'lesson_2_concatenation':
                return {
                    pageBits: parseInt(document.getElementById(`inp-${lId}-page`)?.value || '0', 10),
                    offsetBits: parseInt(document.getElementById(`inp-${lId}-offset`)?.value || '0', 10),
                    totalBits: parseInt(document.getElementById(`inp-${lId}-total`)?.value || '0', 10)
                };
            case 'lesson_3_ripple_carry':
                return {
                    genStage0: document.getElementById(`inp-${lId}-s0`)?.value === 'gen',
                    propStage1: document.getElementById(`inp-${lId}-s1`)?.value === 'prop'
                };
            case 'lesson_4_alu_flags':
                return {
                    C: parseInt(document.getElementById(`inp-${lId}-c`)?.value || '0', 10),
                    V: parseInt(document.getElementById(`inp-${lId}-v`)?.value || '0', 10)
                };
            case 'lesson_5_registers_enable':
                return {
                    heldCorrectly: document.getElementById(`inp-${lId}-hold`)?.value === 'true'
                };
            case 'lesson_6_sync_reset':
                return {
                    resetPriority: document.getElementById(`inp-${lId}-prio`)?.value === 'true'
                };
            case 'lesson_7_modulo_counter':
                return {
                    tcAtCount: parseInt(document.getElementById(`inp-${lId}-tc`)?.value || '0', 10),
                    modulo: parseInt(document.getElementById(`inp-${lId}-mod`)?.value || '0', 10)
                };
            case 'lesson_8_shift_registers':
                return {
                    finalParallel: parseInt(document.getElementById(`inp-${lId}-shift`)?.value || '0', 10)
                };
            case 'lesson_9_fsm_moore':
                return {
                    nextState: document.getElementById(`inp-${lId}-fsm`)?.value || ''
                };
            case 'lesson_10_moore_vs_mealy':
                return {
                    immediateType: document.getElementById(`inp-${lId}-fsmtype`)?.value || ''
                };
            case 'lesson_11_latch_inference':
                return {
                    hasDefaultAssign: document.getElementById(`inp-${lId}-latch`)?.value === 'true',
                    completeAssignment: document.getElementById(`inp-${lId}-latch`)?.value === 'true'
                };
            case 'lesson_12_testbench_basics':
                return {
                    clockPeriod: parseInt(document.getElementById(`inp-${lId}-period`)?.value || '0', 10),
                    expectedLatency: parseInt(document.getElementById(`inp-${lId}-latency`)?.value || '0', 10)
                };
            default:
                return {};
        }
    }

    setupVerilogTab() {
        const select = document.getElementById('verilog-module-select');
        const codeView = document.getElementById('verilog-code-viewer');
        const btnCopy = document.getElementById('btn-copy-verilog');

        const updateCode = () => {
            const val = select.value;
            let code = '';
            if (val === 'half_adder') code = AdvancedVerilogGenerator.generateHalfAdder();
            else if (val === 'full_adder') code = AdvancedVerilogGenerator.generateFullAdder();
            else if (val === 'rca4') code = AdvancedVerilogGenerator.generateRippleCarryAdder({ width: 4 });
            else if (val === 'alu4') code = AdvancedVerilogGenerator.generateALU({ width: 4 });
            else if (val === 'reg4') code = AdvancedVerilogGenerator.generateRegister({ width: 4 });
            else if (val === 'counter') code = AdvancedVerilogGenerator.generateCounter({ width: 4, maxCount: 9 });
            else if (val === 'shift') code = AdvancedVerilogGenerator.generateShiftRegister({ width: 4 });
            else if (val === 'fsm') {
                code = AdvancedVerilogGenerator.generateFSM(this.fsmEditor ? this.fsmEditor.fsm : { states: ['IDLE'] });
            }
            codeView.textContent = code;
        };

        if (select) {
            select.addEventListener('change', updateCode);
            updateCode();
        }

        if (btnCopy) {
            btnCopy.addEventListener('click', () => {
                navigator.clipboard.writeText(codeView.textContent);
                btnCopy.textContent = 'Copied!';
                setTimeout(() => { btnCopy.textContent = 'Copy Code'; }, 1500);
            });
        }
    }

    displayVerilog(code, moduleName) {
        const codeView = document.getElementById('verilog-code-viewer');
        if (codeView) {
            codeView.textContent = code;
        }
    }
}

// Bootstrap on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    window.advancedRTLApp = new AdvancedRTLApp();
    window.app = window.advancedRTLApp;
});
