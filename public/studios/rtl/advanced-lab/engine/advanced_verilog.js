/**
 * advanced_verilog.js — Synthesizable Verilog HDL Generator for Advanced RTL Lab
 * 
 * Part of PD Playground: Advanced RTL Lab
 * 
 * Generates synthesizable IEEE 1364-2001 Verilog code for:
 * - Half Adder & Full Adder
 * - Multi-bit Ripple-Carry Adder
 * - Educational ALU with status flags (Z, C, V, N)
 * - Multi-bit Register with Clock Enable and Synchronous Reset
 * - Multi-bit Up/Down/Modulo Counters
 * - Shift Registers (SISO, SIPO, PISO)
 * - Deterministic Finite State Machines (Moore & Mealy architectures)
 */

export class AdvancedVerilogGenerator {
    /**
     * Generate Verilog for Half Adder.
     */
    static generateHalfAdder(moduleName = 'half_adder') {
        return `// Synthesizable IEEE 1364-2001 Verilog: Half Adder
// Part of PD Playground Advanced RTL Lab
module ${moduleName} (
    input  wire a,
    input  wire b,
    output wire sum,
    output wire carry
);

    assign sum   = a ^ b;
    assign carry = a & b;

endmodule
`;
    }

    /**
     * Generate Verilog for Full Adder.
     */
    static generateFullAdder(moduleName = 'full_adder') {
        return `// Synthesizable IEEE 1364-2001 Verilog: Full Adder
// Part of PD Playground Advanced RTL Lab
module ${moduleName} (
    input  wire a,
    input  wire b,
    input  wire cin,
    output wire sum,
    output wire cout
);

    wire p = a ^ b;
    wire g = a & b;

    assign sum  = p ^ cin;
    assign cout = g | (p & cin);

endmodule
`;
    }

    /**
     * Generate Verilog for Parameterized Ripple-Carry Adder.
     */
    static generateRippleCarryAdder({ width = 4, moduleName = 'ripple_carry_adder' } = {}) {
        return `// Synthesizable IEEE 1364-2001 Verilog: Ripple-Carry Adder
// Part of PD Playground Advanced RTL Lab
module ${moduleName} #(
    parameter WIDTH = ${width}
) (
    input  wire [WIDTH-1:0] a,
    input  wire [WIDTH-1:0] b,
    input  wire             cin,
    output wire [WIDTH-1:0] sum,
    output wire             cout
);

    // Internal carry chain connecting cascaded 1-bit full adders
    wire [WIDTH:0] carry;
    assign carry[0] = cin;

    genvar i;
    generate
        for (i = 0; i < WIDTH; i = i + 1) begin : gen_fa
            assign sum[i]     = a[i] ^ b[i] ^ carry[i];
            assign carry[i+1] = (a[i] & b[i]) | (carry[i] & (a[i] ^ b[i]));
        end
    endgenerate

    assign cout = carry[WIDTH];

endmodule
`;
    }

    /**
     * Generate Verilog for Educational ALU with status flags.
     */
    static generateALU({ width = 4, moduleName = 'educational_alu' } = {}) {
        return `// Synthesizable IEEE 1364-2001 Verilog: Educational ALU
// Part of PD Playground Advanced RTL Lab
module ${moduleName} #(
    parameter WIDTH = ${width}
) (
    input  wire [WIDTH-1:0] a,
    input  wire [WIDTH-1:0] b,
    input  wire [3:0]       opcode,
    input  wire             cin,
    output reg  [WIDTH-1:0] result,
    output reg              flag_z,
    output reg              flag_c,
    output reg              flag_v,
    output wire             flag_n
);

    // Operation code definitions
    localparam OP_ADD   = 4'b0000;
    localparam OP_SUB   = 4'b0001;
    localparam OP_AND   = 4'b0010;
    localparam OP_OR    = 4'b0011;
    localparam OP_XOR   = 4'b0100;
    localparam OP_NOT   = 4'b0101;
    localparam OP_SHL   = 4'b0110;
    localparam OP_SHR   = 4'b0111;
    localparam OP_PASSA = 4'b1000;
    localparam OP_PASSB = 4'b1001;

    // Combinational evaluation
    always @(*) begin
        // Safe default assignments to prevent unintended latches
        result = {WIDTH{1'b0}};
        flag_c = 1'b0;
        flag_v = 1'b0;

        case (opcode)
            OP_ADD: begin
                {flag_c, result} = a + b + cin;
                // Signed 2's complement overflow: (a[msb] == b[msb]) && (result[msb] != a[msb])
                flag_v = (a[WIDTH-1] == b[WIDTH-1]) && (result[WIDTH-1] != a[WIDTH-1]);
            end

            OP_SUB: begin
                // Borrow is set if a < (b + cin)
                flag_c = (a < (b + cin));
                result = a - b - cin;
                // Signed overflow: (a[msb] != b[msb]) && (result[msb] != a[msb])
                flag_v = (a[WIDTH-1] != b[WIDTH-1]) && (result[WIDTH-1] != a[WIDTH-1]);
            end

            OP_AND: begin
                result = a & b;
            end

            OP_OR: begin
                result = a | b;
            end

            OP_XOR: begin
                result = a ^ b;
            end

            OP_NOT: begin
                result = ~a;
            end

            OP_SHL: begin
                result = {a[WIDTH-2:0], 1'b0};
                flag_c = a[WIDTH-1]; // Shifted out MSB
            end

            OP_SHR: begin
                result = {1'b0, a[WIDTH-1:1]};
                flag_c = a[0]; // Shifted out LSB
            end

            OP_PASSA: begin
                result = a;
            end

            OP_PASSB: begin
                result = b;
            end

            default: begin
                result = {WIDTH{1'b0}};
            end
        endcase

        // Zero flag: 1 if all bits of result are 0
        flag_z = (result == {WIDTH{1'b0}});
    end

    // Negative flag: 1 if MSB is set (2's complement signed negative)
    assign flag_n = result[WIDTH-1];

endmodule
`;
    }

    /**
     * Generate Verilog for Multi-Bit Register with Clock Enable and Synchronous Reset.
     */
    static generateRegister({ width = 4, moduleName = 'multi_bit_register', resetVal = 0 } = {}) {
        return `// Synthesizable IEEE 1364-2001 Verilog: Multi-Bit Register
// Part of PD Playground Advanced RTL Lab
module ${moduleName} #(
    parameter WIDTH = ${width},
    parameter RESET_VAL = ${resetVal}
) (
    input  wire             clk,
    input  wire             rst,
    input  wire             en,
    input  wire [WIDTH-1:0] d,
    output reg  [WIDTH-1:0] q
);

    // Sequential state register with synchronous active-high reset
    always @(posedge clk) begin
        if (rst) begin
            q <= RESET_VAL;
        end else if (en) begin
            q <= d;
        end
    end

endmodule
`;
    }

    /**
     * Generate Verilog for Modulo-N Counter with Terminal Count.
     */
    static generateCounter({ width = 4, maxCount = 15, moduleName = 'modulo_counter' } = {}) {
        return `// Synthesizable IEEE 1364-2001 Verilog: Modulo Counter with Terminal Count
// Part of PD Playground Advanced RTL Lab
module ${moduleName} #(
    parameter WIDTH = ${width},
    parameter MODULO = ${maxCount + 1}
) (
    input  wire             clk,
    input  wire             rst,
    input  wire             en,
    input  wire             up_down, // 1 = up, 0 = down
    output reg  [WIDTH-1:0] count,
    output wire             terminal_count
);

    always @(posedge clk) begin
        if (rst) begin
            count <= {WIDTH{1'b0}};
        end else if (en) begin
            if (up_down) begin
                if (count == MODULO - 1)
                    count <= {WIDTH{1'b0}};
                else
                    count <= count + 1'b1;
            end else begin
                if (count == {WIDTH{1'b0}})
                    count <= MODULO - 1;
                else
                    count <= count - 1'b1;
            end
        end
    end

    // Terminal count is asserted when counter reaches peak modulus
    assign terminal_count = (count == MODULO - 1);

endmodule
`;
    }

    /**
     * Generate Verilog for Shift Register (SISO / SIPO / PISO).
     */
    static generateShiftRegister({ width = 4, moduleName = 'shift_register' } = {}) {
        return `// Synthesizable IEEE 1364-2001 Verilog: Universal Shift Register
// Part of PD Playground Advanced RTL Lab
module ${moduleName} #(
    parameter WIDTH = ${width}
) (
    input  wire             clk,
    input  wire             rst,
    input  wire [1:0]       mode,     // 00=HOLD, 01=SHIFT_RIGHT, 10=SHIFT_LEFT, 11=PARALLEL_LOAD
    input  wire             sin_msb,  // Serial in from left (for shift right)
    input  wire             sin_lsb,  // Serial in from right (for shift left)
    input  wire [WIDTH-1:0] parallel_d,
    output reg  [WIDTH-1:0] parallel_q,
    output wire             sout_lsb, // Serial out (rightmost bit)
    output wire             sout_msb  // Serial out (leftmost bit)
);

    localparam MODE_HOLD  = 2'b00;
    localparam MODE_SHR   = 2'b01;
    localparam MODE_SHL   = 2'b10;
    localparam MODE_LOAD  = 2'b11;

    always @(posedge clk) begin
        if (rst) begin
            parallel_q <= {WIDTH{1'b0}};
        end else begin
            case (mode)
                MODE_HOLD: begin
                    parallel_q <= parallel_q;
                end
                MODE_SHR: begin
                    parallel_q <= {sin_msb, parallel_q[WIDTH-1:1]};
                end
                MODE_SHL: begin
                    parallel_q <= {parallel_q[WIDTH-2:0], sin_lsb};
                end
                MODE_LOAD: begin
                    parallel_q <= parallel_d;
                end
            endcase
        end
    end

    assign sout_lsb = parallel_q[0];
    assign sout_msb = parallel_q[WIDTH-1];

endmodule
`;
    }

    /**
     * Generate Synthesizable Verilog for Finite State Machine (2-Process Architecture).
     * @param {Object} fsm - FSM model specification
     */
    static generateFSM(fsm, moduleName = 'fsm_controller') {
        const states = fsm.states || ['IDLE'];
        const stateWidth = Math.max(1, Math.ceil(Math.log2(states.length)));
        const resetState = fsm.resetState || states[0];
        const inputs = fsm.inputs || [{ name: 'in_bit', width: 1 }];
        const outputs = fsm.outputs || [{ name: 'out_bit', width: 1 }];

        // State parameters
        const stateParams = states.map((s, idx) => {
            return `    localparam STATE_${s} = ${stateWidth}'d${idx};`;
        }).join('\n');

        // Inputs declarations
        const inPorts = inputs.map(i => {
            const w = i.width > 1 ? `[${i.width-1}:0] ` : '';
            return `    input  wire ${w}${i.name},`;
        }).join('\n');

        // Output declarations
        const outPorts = outputs.map((o, idx) => {
            const w = o.width > 1 ? `[${o.width-1}:0] ` : '';
            const comma = idx === outputs.length - 1 ? '' : ',';
            return `    output reg  ${w}${o.name}${comma}`;
        }).join('\n');

        // Transitions logic
        const transitionCases = states.map(s => {
            const transitions = (fsm.transitions || []).filter(t => t.from === s);
            if (transitions.length === 0) {
                return `            STATE_${s}: begin\n                next_state = STATE_${s};\n            end`;
            }

            const ifBlocks = transitions.map((t, idx) => {
                const prefix = idx === 0 ? 'if' : 'else if';
                const cond = t.condition && t.condition !== '1' ? t.condition : '1\'b1';
                return `                ${prefix} (${cond}) begin\n                    next_state = STATE_${t.to};\n                end`;
            }).join('\n');

            return `            STATE_${s}: begin\n${ifBlocks}\n                else begin\n                    next_state = STATE_${s};\n                end\n            end`;
        }).join('\n');

        // Moore / Mealy output logic
        const outputCases = states.map(s => {
            const moore = (fsm.mooreOutputs && fsm.mooreOutputs[s]) || {};
            const assigns = outputs.map(o => {
                const val = moore[o.name] !== undefined ? moore[o.name] : 0;
                return `                ${o.name} = ${o.width > 1 ? `${o.width}'d${val}` : `1'b${val ? 1 : 0}`};`;
            }).join('\n');
            return `            STATE_${s}: begin\n${assigns}\n            end`;
        }).join('\n');

        return `// Synthesizable IEEE 1364-2001 Verilog: Finite State Machine (2-Process Architecture)
// Part of PD Playground Advanced RTL Lab
module ${moduleName} (
    input  wire clk,
    input  wire rst,
${inPorts}
${outPorts}
);

    // State Encodings
${stateParams}

    reg [${stateWidth-1}:0] current_state;
    reg [${stateWidth-1}:0] next_state;

    // Process 1: Sequential state register
    always @(posedge clk) begin
        if (rst) begin
            current_state <= STATE_${resetState};
        end else begin
            current_state <= next_state;
        end
    end

    // Process 2: Combinational next-state and output logic
    always @(*) begin
        // Safe defaults prevent latch inference
        next_state = current_state;

        case (current_state)
${transitionCases}
            default: begin
                next_state = STATE_${resetState};
            end
        endcase
    end

    // Process 3: Registered or combinational output decoding
    always @(*) begin
        case (current_state)
${outputCases}
            default: begin
${outputs.map(o => `                ${o.name} = ${o.width > 1 ? `${o.width}'d0` : "1'b0"};`).join('\n')}
            end
        endcase
    end

endmodule
`;
    }
}
