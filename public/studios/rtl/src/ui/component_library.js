/**
 * component_library.js — Component Palette UI
 * 
 * Displays categorized component items (I/O, Basic Gates, Combinational, Sequential).
 * Clicking an item selects it for placement on the canvas.
 * Supports guided tutorial step highlighting to direct beginner focus.
 * 
 * @module ComponentLibrary
 */

export class ComponentLibrary {
    /**
     * @param {string} containerId - Element ID for palette container
     * @param {import('./circuit_editor.js').CircuitEditor} editor
     */
    constructor(containerId, editor) {
        this.container = document.getElementById(containerId);
        this.editor = editor;
        this.activeType = null;
        this.render();
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="palette-category">
                <div class="category-title">Inputs & Outputs</div>
                <div class="palette-grid">
                    <button class="palette-item" data-type="INPUT" title="1-bit Digital Input (Click to toggle 0/1)">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="5" width="14" height="14" rx="2" />
                                <text x="10" y="16" font-size="10" fill="currentColor" text-anchor="middle">1</text>
                                <line x1="17" y1="12" x2="22" y2="12" />
                            </svg>
                        </span>
                        <span>Input</span>
                    </button>
                    <button class="palette-item" data-type="OUTPUT" title="Digital Output Display">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="14" cy="12" r="7" />
                                <line x1="2" y1="12" x2="7" y2="12" />
                            </svg>
                        </span>
                        <span>Output</span>
                    </button>
                    <button class="palette-item" data-type="CLOCK" title="Clock Source for Sequential Logic">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="5" width="14" height="14" rx="2" />
                                <path d="M 6 15 L 9 15 L 9 9 L 14 9 L 14 15 L 17 15" stroke-width="1.5" />
                            </svg>
                        </span>
                        <span>Clock</span>
                    </button>
                </div>
            </div>

            <div class="palette-category">
                <div class="category-title">Logic Gates</div>
                <div class="palette-grid">
                    <button class="palette-item" data-type="AND" title="2-Input AND Gate">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M 4 2 L 15 2 A 8 8 0 0 1 15 18 L 4 18 Z" />
                            </svg>
                        </span>
                        <span>AND</span>
                    </button>
                    <button class="palette-item" data-type="OR" title="2-Input OR Gate">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M 4 2 Q 9 10 4 18 Q 15 18 24 10 Q 15 2 4 2 Z" />
                            </svg>
                        </span>
                        <span>OR</span>
                    </button>
                    <button class="palette-item" data-type="NOT" title="1-Input Inverter / NOT Gate">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <polygon points="4,3 20,10 4,17" />
                                <circle cx="23" cy="10" r="2" />
                            </svg>
                        </span>
                        <span>NOT</span>
                    </button>
                    <button class="palette-item" data-type="NAND" title="2-Input NAND Gate">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M 4 2 L 14 2 A 8 8 0 0 1 14 18 L 4 18 Z" />
                                <circle cx="24" cy="10" r="2" />
                            </svg>
                        </span>
                        <span>NAND</span>
                    </button>
                    <button class="palette-item" data-type="NOR" title="2-Input NOR Gate">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M 4 2 Q 9 10 4 18 Q 14 18 21 10 Q 14 2 4 2 Z" />
                                <circle cx="24" cy="10" r="2" />
                            </svg>
                        </span>
                        <span>NOR</span>
                    </button>
                    <button class="palette-item" data-type="XOR" title="2-Input Exclusive OR Gate">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M 2 2 Q 7 10 2 18" />
                                <path d="M 5 2 Q 10 10 5 18 Q 15 18 24 10 Q 15 2 5 2 Z" />
                            </svg>
                        </span>
                        <span>XOR</span>
                    </button>
                    <button class="palette-item" data-type="XNOR" title="2-Input Exclusive NOR Gate">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M 2 2 Q 7 10 2 18" />
                                <path d="M 5 2 Q 10 10 5 18 Q 14 18 21 10 Q 14 2 5 2 Z" />
                                <circle cx="24" cy="10" r="2" />
                            </svg>
                        </span>
                        <span>XNOR</span>
                    </button>
                </div>
            </div>

            <div class="palette-category">
                <div class="category-title">Combinational Blocks</div>
                <div class="palette-grid">
                    <button class="palette-item" data-type="MUX2" title="2-to-1 Multiplexer">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <polygon points="4,2 24,6 24,14 4,18" />
                            </svg>
                        </span>
                        <span>2:1 MUX</span>
                    </button>
                </div>
            </div>

            <div class="palette-category">
                <div class="category-title">Sequential Blocks</div>
                <div class="palette-grid">
                    <button class="palette-item" data-type="DFF" title="Positive-Edge Triggered D Flip-Flop">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="4" y="2" width="22" height="16" rx="2" />
                                <polyline points="4,12 8,14 4,16" />
                            </svg>
                        </span>
                        <span>DFF</span>
                    </button>
                    <button class="palette-item" data-type="DFFE" title="D Flip-Flop with Clock Enable (Loads D when EN=1, holds when EN=0)">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="4" y="2" width="22" height="16" rx="2" />
                                <text x="14" y="14" font-size="7" fill="currentColor">EN</text>
                            </svg>
                        </span>
                        <span>DFF + EN</span>
                    </button>
                    <button class="palette-item" data-type="DFFSR" title="D Flip-Flop with Synchronous Reset (Forces Q=0 on posedge clk when RST=1)">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="4" y="2" width="22" height="16" rx="2" />
                                <text x="13" y="14" font-size="7" fill="currentColor">RST</text>
                            </svg>
                        </span>
                        <span>DFF + RST</span>
                    </button>
                    <button class="palette-item" data-type="DFFESR" title="DFF with Enable & Sync Reset (RST takes priority over EN)">
                        <span class="palette-item-icon">
                            <svg viewBox="0 0 30 20" width="20" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="4" y="2" width="22" height="16" rx="2" />
                                <text x="11" y="14" font-size="6" fill="currentColor">E/R</text>
                            </svg>
                        </span>
                        <span>DFF + EN/RST</span>
                    </button>
                </div>
            </div>
        `;

        this._bindButtons();
    }

    _bindButtons() {
        const buttons = this.container.querySelectorAll('.palette-item');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                if (this.activeType === type) {
                    // Deselect
                    this.clearActive();
                    this.editor.setPendingComponentType(null);
                } else {
                    this.clearActive();
                    this.activeType = type;
                    btn.classList.add('active');
                    this.editor.setPendingComponentType(type);
                }
            });
        });
    }

    clearActive() {
        this.activeType = null;
        if (!this.container) return;
        const buttons = this.container.querySelectorAll('.palette-item');
        buttons.forEach(b => b.classList.remove('active'));
    }

    highlightComponentType(type) {
        this.clearHighlights();
        if (!type || !this.container) return;
        const btn = this.container.querySelector(`.palette-item[data-type="${type}"]`);
        if (btn) {
            btn.classList.add('palette-guide-highlight');
            try { btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch {}
        }
    }

    clearHighlights() {
        if (!this.container) return;
        const highlighted = this.container.querySelectorAll('.palette-guide-highlight');
        highlighted.forEach(b => b.classList.remove('palette-guide-highlight'));
    }
}
