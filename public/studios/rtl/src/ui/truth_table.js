/**
 * truth_table.js — Combinational Truth Table Generator and Viewer
 * 
 * Generates and displays full truth tables for circuits with up to 4 inputs.
 * Strictly preserves current user inputs & sequential state.
 * Highlights current live input combination row.
 * 
 * @module TruthTable
 */

export class TruthTable {
    /**
     * @param {string} containerId - Element ID for truth table tab content
     * @param {import('../engine/circuit_graph.js').CircuitGraph} graph
     * @param {import('../engine/logic_simulator.js').LogicSimulator} simulator
     */
    constructor(containerId, graph, simulator) {
        this.container = document.getElementById(containerId);
        this.graph = graph;
        this.simulator = simulator;
    }

    render() {
        if (!this.container) return;

        const inputs = this.graph.getInputComponents();
        const outputs = this.graph.getOutputComponents();

        // 1. Check if circuit has inputs or outputs
        if (inputs.length === 0 || outputs.length === 0) {
            this.container.innerHTML = `
                <div class="circuit-alert alert-warn">
                    <span>Add at least one <strong>Input</strong> and one <strong>Output</strong> component to generate a truth table.</span>
                </div>
            `;
            return;
        }

        // 2. Check maximum input limit (Decision 008: limit <= 4)
        if (inputs.length > 4) {
            this.container.innerHTML = `
                <div class="circuit-alert alert-warn">
                    <span>
                        Truth table generation is restricted to <strong>4 independent inputs</strong> ($2^4 = 16$ rows) in this version.
                        Your circuit currently has <strong>${inputs.length} inputs</strong> ($2^{${inputs.length}} = ${2 ** inputs.length} combinations).
                    </span>
                </div>
            `;
            return;
        }

        // 3. Check for cycles
        const validation = this.graph.validateCircuit();
        if (!validation.valid) {
            this.container.innerHTML = `
                <div class="circuit-alert alert-error">
                    <span>Cannot generate truth table: ${validation.errors.join('; ')}</span>
                </div>
            `;
            return;
        }

        const numInputs = inputs.length;
        const totalRows = 1 << numInputs;

        // Current live values for row highlighting
        const liveInputValues = inputs.map(i => i.outputs[0].value);

        // Build header
        let tableHtml = `
            <div class="truth-table-container">
                <div class="inspector-card-title">
                    <span>Combinational Truth Table (${totalRows} States)</span>
                    <span style="font-size:10px; color:var(--text-dim);">Live State Highlighted</span>
                </div>
                <div class="table-wrapper">
                    <table class="truth-table">
                        <thead>
                            <tr>
                                ${inputs.map(i => `<th style="color:var(--accent-primary);">${i.label}</th>`).join('')}
                                ${outputs.map(o => `<th style="color:var(--signal-high);">${o.label}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;

        for (let rowIdx = 0; rowIdx < totalRows; rowIdx++) {
            const rowInputs = {};
            const inputVals = [];
            let isCurrentState = true;

            for (let bitIdx = 0; bitIdx < numInputs; bitIdx++) {
                // MSB first: (numInputs - 1 - bitIdx)
                const bit = (rowIdx >> (numInputs - 1 - bitIdx)) & 1;
                rowInputs[inputs[bitIdx].id] = bit;
                inputVals.push(bit);

                if (liveInputValues[bitIdx] !== bit) {
                    isCurrentState = false;
                }
            }

            // Safe evaluation (preserves original circuit inputs internally)
            const evalRes = this.simulator.evaluateWithInputs(rowInputs);

            tableHtml += `<tr class="${isCurrentState ? 'current-state-row' : ''}">`;

            // Input columns
            for (const val of inputVals) {
                tableHtml += `<td><strong>${val}</strong></td>`;
            }

            // Output columns
            for (const outComp of outputs) {
                const outVal = evalRes.ok && evalRes.outputs ? evalRes.outputs[outComp.id] : null;
                const badgeClass = outVal === 1 ? 'badge-1' : (outVal === 0 ? 'badge-0' : 'badge-null');
                tableHtml += `<td><span class="signal-badge ${badgeClass}">${outVal !== null ? outVal : '?'}</span></td>`;
            }

            tableHtml += `</tr>`;
        }

        tableHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.container.innerHTML = tableHtml;
    }
}
