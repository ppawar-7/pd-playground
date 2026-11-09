/**
 * verilog_generator.js — Synthesizable Verilog HDL generation
 * 
 * Generates Verilog from the circuit graph. Produces valid module declarations,
 * wire/reg declarations, combinational assign statements, and sequential
 * always blocks for flip-flops.
 * 
 * ZERO DOM dependencies. Testable in Node.js.
 * 
 * @module VerilogGenerator
 */

import { COMPONENT_TYPES } from './circuit_graph.js';

export class VerilogGenerator {
    /**
     * @param {import('./circuit_graph.js').CircuitGraph} graph
     */
    constructor(graph) {
        this.graph = graph;
    }

    /**
     * Generate synthesizable Verilog for the current circuit.
     * @param {string} [moduleName='circuit'] - Top-level module name
     * @returns {{ ok: boolean, code?: string, error?: string }}
     */
    generate(moduleName = 'circuit') {
        // Validate circuit first
        const validation = this.graph.validateCircuit();
        if (!validation.valid) {
            return {
                ok: false,
                error: `Cannot generate Verilog: ${validation.errors.join('; ')}`,
                code: this._generateErrorComment(validation)
            };
        }

        const inputs = this.graph.getInputComponents();
        const outputs = this.graph.getOutputComponents();
        const clocks = this.graph.getClockComponents();
        const dffs = this.graph.getDFFComponents();

        if (inputs.length === 0 && outputs.length === 0 && clocks.length === 0) {
            return {
                ok: false,
                error: 'Circuit has no inputs or outputs',
                code: '// Empty circuit — add inputs and outputs to generate Verilog'
            };
        }

        // Build unique identifier registry to prevent duplicate port/signal names
        this.signalNames = new Map();
        const usedNames = new Set();
        const allComps = [...inputs, ...clocks, ...outputs, ...dffs];
        for (const comp of allComps) {
            let baseName = this._sanitizeName(comp.label) || comp.type.toLowerCase();
            const suffix = comp.id.split('_').pop();
            if (VERILOG_RESERVED.has(baseName)) {
                baseName = `${baseName}_${suffix}`;
            }
            let uniqueName = baseName;
            if (usedNames.has(uniqueName)) {
                uniqueName = `${baseName}_${suffix}`;
            }
            let counter = 2;
            while (usedNames.has(uniqueName)) {
                uniqueName = `${baseName}_${counter++}`;
            }
            usedNames.add(uniqueName);
            this.signalNames.set(comp.id, uniqueName);
        }

        const lines = [];

        // Module declaration
        const ports = this._buildPortList(inputs, outputs, clocks);
        lines.push(`module ${this._sanitizeName(moduleName)} (`);
        lines.push(ports.map((p, i) => `    ${p}${i < ports.length - 1 ? ',' : ''}`).join('\n'));
        lines.push(');');
        lines.push('');

        // Port declarations (synthesizable continuous assigns require wire outputs)
        for (const inp of inputs) {
            lines.push(`    input wire ${this._getSignalName(inp)};`);
        }
        for (const clk of clocks) {
            lines.push(`    input wire ${this._getSignalName(clk)};`);
        }
        for (const out of outputs) {
            lines.push(`    output wire ${this._getSignalName(out)};`);
        }

        // Internal wire declarations for intermediate gate outputs
        const internalWires = this._getInternalSignals(inputs, outputs, clocks, dffs);
        if (internalWires.length > 0) {
            lines.push('');
            for (const w of internalWires) {
                lines.push(`    wire ${w.name};`);
            }
        }

        // DFF register declarations
        if (dffs.length > 0) {
            lines.push('');
            for (const dff of dffs) {
                lines.push(`    reg ${this._getSignalName(dff)}_q;`);
            }
        }

        lines.push('');

        // Combinational assign statements
        const assigns = this._generateAssigns(inputs, outputs, clocks, dffs);
        for (const assign of assigns) {
            lines.push(`    ${assign}`);
        }

        // Sequential always blocks (grouped by connected clock)
        if (dffs.length > 0) {
            const dffsByClock = new Map();
            for (const dff of dffs) {
                const clkPin = dff.inputs[1];
                let clkName = null;
                if (clkPin && clkPin.connectedTo) {
                    const clkComp = this.graph.getComponent(clkPin.connectedTo.componentId);
                    if (clkComp) {
                        clkName = this._getSignalName(clkComp);
                    }
                }
                if (!clkName) {
                    clkName = clocks.length > 0 ? this._getSignalName(clocks[0]) : 'clk';
                }
                if (!dffsByClock.has(clkName)) {
                    dffsByClock.set(clkName, []);
                }
                dffsByClock.get(clkName).push(dff);
            }

            for (const [clkName, groupDffs] of dffsByClock) {
                lines.push('');
                lines.push(`    always @(posedge ${clkName}) begin`);
                for (const dff of groupDffs) {
                    const dExpr = this._buildExpression(dff.id, 'in0');
                    const qName = `${this._getSignalName(dff)}_q`;

                    if (dff.type === 'DFF') {
                        lines.push(`        ${qName} <= ${dExpr};`);
                    } else if (dff.type === 'DFFE') {
                        const enExpr = this._buildExpression(dff.id, 'in2');
                        lines.push(`        if (${enExpr}) begin`);
                        lines.push(`            ${qName} <= ${dExpr};`);
                        lines.push(`        end`);
                    } else if (dff.type === 'DFFSR') {
                        const rstExpr = this._buildExpression(dff.id, 'in2');
                        lines.push(`        if (${rstExpr}) begin`);
                        lines.push(`            ${qName} <= 1'b0;`);
                        lines.push(`        end else begin`);
                        lines.push(`            ${qName} <= ${dExpr};`);
                        lines.push(`        end`);
                    } else if (dff.type === 'DFFESR') {
                        const enExpr = this._buildExpression(dff.id, 'in2');
                        const rstExpr = this._buildExpression(dff.id, 'in3');
                        lines.push(`        if (${rstExpr}) begin`);
                        lines.push(`            ${qName} <= 1'b0;`);
                        lines.push(`        end else if (${enExpr}) begin`);
                        lines.push(`            ${qName} <= ${dExpr};`);
                        lines.push(`        end`);
                    }
                }
                lines.push('    end');
            }
        }

        lines.push('');
        lines.push('endmodule');

        const code = lines.join('\n');
        return { ok: true, code };
    }

    /**
     * Generate procedural Verilog representation (using always @(*) and case/if-else).
     * Provides students with the behavioral procedural coding perspective.
     * @param {string} [moduleName='circuit']
     * @returns {{ ok: boolean, code?: string, error?: string }}
     */
    generateProcedural(moduleName = 'circuit') {
        const validation = this.graph.validateCircuit();
        if (!validation.valid) {
            return {
                ok: false,
                error: `Cannot generate Verilog: ${validation.errors.join('; ')}`,
                code: this._generateErrorComment(validation)
            };
        }

        const inputs = this.graph.getInputComponents();
        const outputs = this.graph.getOutputComponents();
        const clocks = this.graph.getClockComponents();
        const dffs = this.graph.getDFFComponents();

        if (inputs.length === 0 && outputs.length === 0 && clocks.length === 0) {
            return {
                ok: false,
                error: 'Circuit has no inputs or outputs',
                code: '// Empty circuit — add inputs and outputs to generate Verilog'
            };
        }

        this.signalNames = new Map();
        const usedNames = new Set();
        const allComps = [...inputs, ...clocks, ...outputs, ...dffs];
        for (const comp of allComps) {
            let baseName = this._sanitizeName(comp.label) || comp.type.toLowerCase();
            const suffix = comp.id.split('_').pop();
            if (VERILOG_RESERVED.has(baseName)) {
                baseName = `${baseName}_${suffix}`;
            }
            let uniqueName = baseName;
            if (usedNames.has(uniqueName)) {
                uniqueName = `${baseName}_${suffix}`;
            }
            let counter = 2;
            while (usedNames.has(uniqueName)) {
                uniqueName = `${baseName}_${counter++}`;
            }
            usedNames.add(uniqueName);
            this.signalNames.set(comp.id, uniqueName);
        }

        const lines = [];
        const ports = this._buildPortList(inputs, outputs, clocks);
        lines.push(`module ${this._sanitizeName(moduleName)} (`);
        lines.push(ports.map((p, i) => `    ${p}${i < ports.length - 1 ? ',' : ''}`).join('\n'));
        lines.push(');');
        lines.push('');

        for (const inp of inputs) {
            lines.push(`    input wire ${this._getSignalName(inp)};`);
        }
        for (const clk of clocks) {
            lines.push(`    input wire ${this._getSignalName(clk)};`);
        }
        for (const out of outputs) {
            lines.push(`    output reg ${this._getSignalName(out)};`);
        }

        if (dffs.length > 0) {
            lines.push('');
            for (const dff of dffs) {
                lines.push(`    reg ${this._getSignalName(dff)}_q;`);
            }
        }

        const combOutputs = outputs.filter(o => !this._isOutputDrivenByDFF(o));
        if (combOutputs.length > 0) {
            lines.push('');
            lines.push('    // Combinational procedural block (always @(*) with case / if-else)');
            lines.push('    always @(*) begin');
            for (const out of combOutputs) {
                const pin = out.inputs[0];
                if (!pin || !pin.connectedTo) continue;
                const srcComp = this.graph.getComponent(pin.connectedTo.componentId);
                if (!srcComp) continue;
                const outName = this._getSignalName(out);

                if (srcComp.type === 'MUX2') {
                    const selExpr = this._buildExpression(srcComp.id, 'in2');
                    const aExpr = this._buildExpression(srcComp.id, 'in0');
                    const bExpr = this._buildExpression(srcComp.id, 'in1');
                    lines.push(`        case (${selExpr})`);
                    lines.push(`            1'b0: ${outName} = ${aExpr};`);
                    lines.push(`            1'b1: ${outName} = ${bExpr};`);
                    lines.push(`            default: ${outName} = 1'bx;`);
                    lines.push(`        endcase`);
                } else {
                    const expr = this._buildExpressionFromOutput(srcComp);
                    lines.push(`        ${outName} = ${expr};`);
                }
            }
            lines.push('    end');
        }

        const dffOutputs = outputs.filter(o => this._isOutputDrivenByDFF(o));
        if (dffOutputs.length > 0) {
            lines.push('');
            lines.push('    always @(*) begin');
            for (const out of dffOutputs) {
                const pin = out.inputs[0];
                const srcComp = this.graph.getComponent(pin.connectedTo.componentId);
                const outName = this._getSignalName(out);
                lines.push(`        ${outName} = ${this._buildExpressionFromOutput(srcComp)};`);
            }
            lines.push('    end');
        }

        if (dffs.length > 0) {
            const dffsByClock = new Map();
            for (const dff of dffs) {
                const clkPin = dff.inputs[1];
                let clkName = null;
                if (clkPin && clkPin.connectedTo) {
                    const clkComp = this.graph.getComponent(clkPin.connectedTo.componentId);
                    if (clkComp) clkName = this._getSignalName(clkComp);
                }
                if (!clkName) clkName = clocks.length > 0 ? this._getSignalName(clocks[0]) : 'clk';
                if (!dffsByClock.has(clkName)) dffsByClock.set(clkName, []);
                dffsByClock.get(clkName).push(dff);
            }

            for (const [clkName, groupDffs] of dffsByClock) {
                lines.push('');
                lines.push(`    always @(posedge ${clkName}) begin`);
                for (const dff of groupDffs) {
                    const dExpr = this._buildExpression(dff.id, 'in0');
                    const qName = `${this._getSignalName(dff)}_q`;
                    if (dff.type === 'DFF') {
                        lines.push(`        ${qName} <= ${dExpr};`);
                    } else if (dff.type === 'DFFE') {
                        const enExpr = this._buildExpression(dff.id, 'in2');
                        lines.push(`        if (${enExpr}) begin`);
                        lines.push(`            ${qName} <= ${dExpr};`);
                        lines.push(`        end`);
                    } else if (dff.type === 'DFFSR') {
                        const rstExpr = this._buildExpression(dff.id, 'in2');
                        lines.push(`        if (${rstExpr}) begin`);
                        lines.push(`            ${qName} <= 1'b0;`);
                        lines.push(`        end else begin`);
                        lines.push(`            ${qName} <= ${dExpr};`);
                        lines.push(`        end`);
                    } else if (dff.type === 'DFFESR') {
                        const enExpr = this._buildExpression(dff.id, 'in2');
                        const rstExpr = this._buildExpression(dff.id, 'in3');
                        lines.push(`        if (${rstExpr}) begin`);
                        lines.push(`            ${qName} <= 1'b0;`);
                        lines.push(`        end else if (${enExpr}) begin`);
                        lines.push(`            ${qName} <= ${dExpr};`);
                        lines.push(`        end`);
                    }
                }
                lines.push('    end');
            }
        }

        lines.push('');
        lines.push('endmodule');
        return { ok: true, code: lines.join('\n') };
    }

    /**
     * Build the port list for the module declaration.
     * @private
     */
    _buildPortList(inputs, outputs, clocks) {
        const ports = [];
        for (const clk of clocks) {
            ports.push(this._getSignalName(clk));
        }
        for (const inp of inputs) {
            ports.push(this._getSignalName(inp));
        }
        for (const out of outputs) {
            ports.push(this._getSignalName(out));
        }
        return ports;
    }

    /**
     * Build a Boolean expression for an input pin by tracing backward.
     * @param {string} componentId
     * @param {string} pinLocalId - e.g. 'in0'
     * @returns {string} Verilog expression
     * @private
     */
    _buildExpression(componentId, pinLocalId) {
        const comp = this.graph.getComponent(componentId);
        if (!comp) return "1'bx";

        // Find the pin
        const pin = comp.inputs.find(p => p.id === `${componentId}.${pinLocalId}`);
        if (!pin || !pin.connectedTo) return "1'bx";

        // Get the source component
        const srcComp = this.graph.getComponent(pin.connectedTo.componentId);
        if (!srcComp) return "1'bx";

        return this._buildExpressionFromOutput(srcComp);
    }

    /**
     * Build a Boolean expression from a component's output, tracing backwards.
     * @param {object} comp - Source component
     * @returns {string} Verilog expression
     * @private
     */
    _buildExpressionFromOutput(comp) {
        if (comp.type === 'INPUT') {
            return this._getSignalName(comp);
        }

        if (comp.type === 'CLOCK') {
            return this._getSignalName(comp);
        }

        if (comp.type === 'DFF' || comp.type === 'DFFE' || comp.type === 'DFFSR' || comp.type === 'DFFESR') {
            return `${this._getSignalName(comp)}_q`;
        }

        // Get input expressions for this gate
        const inputExprs = comp.inputs.map((pin, idx) => {
            if (!pin.connectedTo) return "1'bx";
            const srcComp = this.graph.getComponent(pin.connectedTo.componentId);
            if (!srcComp) return "1'bx";
            return this._buildExpressionFromOutput(srcComp);
        });

        switch (comp.type) {
            case 'AND':
                return `(${inputExprs[0]} & ${inputExprs[1]})`;
            case 'OR':
                return `(${inputExprs[0]} | ${inputExprs[1]})`;
            case 'NOT':
                return `(~${inputExprs[0]})`;
            case 'NAND':
                return `(~(${inputExprs[0]} & ${inputExprs[1]}))`;
            case 'NOR':
                return `(~(${inputExprs[0]} | ${inputExprs[1]}))`;
            case 'XOR':
                return `(${inputExprs[0]} ^ ${inputExprs[1]})`;
            case 'XNOR':
                return `(~(${inputExprs[0]} ^ ${inputExprs[1]}))`;
            case 'MUX2':
                return `(${inputExprs[2]} ? ${inputExprs[1]} : ${inputExprs[0]})`;
            default:
                return "1'bx";
        }
    }

    /**
     * Generate assign statements for combinational outputs.
     * @private
     */
    _generateAssigns(inputs, outputs, clocks, dffs) {
        const assigns = [];

        for (const out of outputs) {
            const pin = out.inputs[0];
            if (!pin.connectedTo) continue;

            const srcComp = this.graph.getComponent(pin.connectedTo.componentId);
            if (!srcComp) continue;

            const outName = this._getSignalName(out);

            if (this._isOutputDrivenByDFF(out)) {
                // DFF-driven outputs: assign from the Q register
                assigns.push(`assign ${outName} = ${this._buildExpressionFromOutput(srcComp)};`);
            } else {
                const expr = this._buildExpressionFromOutput(srcComp);
                assigns.push(`assign ${outName} = ${expr};`);
            }
        }

        return assigns;
    }

    /**
     * Find internal signals (gates not directly connected to I/O).
     * Since expressions are currently inlined directly into output assignments,
     * intermediate wire declarations are omitted to avoid unused net warnings.
     * @private
     */
    _getInternalSignals(inputs, outputs, clocks, dffs) {
        // Expressions are inlined directly into assign and always statements.
        // Return empty array to avoid generating unused wire declarations.
        return [];
    }

    /**
     * Check if an OUTPUT is directly or transitively driven by a DFF.
     * @private
     */
    _isOutputDrivenByDFF(outComp) {
        const pin = outComp.inputs[0];
        if (!pin || !pin.connectedTo) return false;
        const srcComp = this.graph.getComponent(pin.connectedTo.componentId);
        return srcComp && (srcComp.type === 'DFF' || srcComp.type === 'DFFE' || srcComp.type === 'DFFSR' || srcComp.type === 'DFFESR');
    }

    /**
     * Get a clean Verilog signal name for a component.
     * @param {object} comp
     * @returns {string}
     * @private
     */
    _getSignalName(comp) {
        if (this.signalNames && this.signalNames.has(comp.id)) {
            return this.signalNames.get(comp.id);
        }
        const sanitized = this._sanitizeName(comp.label);
        const suffix = comp.id.split('_').pop();
        const name = sanitized || comp.type.toLowerCase();
        if (VERILOG_RESERVED.has(name)) {
            return `${name}_${suffix}`;
        }
        return name;
    }

    /**
     * Sanitize a string for use as a Verilog identifier.
     * @param {string} name
     * @returns {string}
     * @private
     */
    _sanitizeName(name) {
        if (!name) return '';
        // Replace non-alphanumeric characters with underscores
        let clean = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
        // Collapse multiple underscores
        clean = clean.replace(/_+/g, '_').replace(/^_|_$/g, '');
        return clean.toLowerCase();
    }

    /**
     * Generate an error comment for invalid circuits.
     * @private
     */
    _generateErrorComment(validation) {
        const lines = ['// ⚠ Circuit has errors — cannot generate valid Verilog'];
        for (const err of validation.errors) {
            lines.push(`// ERROR: ${err}`);
        }
        for (const warn of validation.warnings) {
            lines.push(`// WARNING: ${warn}`);
        }
        return lines.join('\n');
    }
}

// Verilog reserved words to avoid as signal names
const VERILOG_RESERVED = new Set([
    'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg',
    'assign', 'always', 'begin', 'end', 'if', 'else', 'case', 'endcase',
    'for', 'while', 'integer', 'parameter', 'posedge', 'negedge',
    'initial', 'forever', 'function', 'endfunction', 'task', 'endtask',
    'and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor', 'buf',
    'supply0', 'supply1', 'tri', 'default', 'generate', 'endgenerate'
]);
