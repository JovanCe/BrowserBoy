/**
 * Created by JovanCe on 11/8/15.
 */

define(["underscore"], function(_) {
    const A = "A";
    const B = "B";
    const C = "C";
    const D = "D";
    const E = "E";
    const H = "H";
    const L = "L";
    const F = "L";
    const PC = "PC";
    const SP = "SP";
    const M = "M";
    const T = "T";

    var CPU = function() {
        // registers
        this._reg = {
            A:0, B:0, C:0, D:0, E:0, H:0, L:0, F:0,    // 8-bit registers
            PC:0, SP:0,                                // 16-bit registers
            M:0, T:0
        };

        // machine cycle and cpu cycle counters (1 machine cycle = 4 cpu cycles)
        this._clock= {
            M:0, T:0
        };
    };

    CPU.prototype.increaseCycles = function(m, t) {
        this._reg.M = m;
        this._reg.T = t;
        this._clock.M += m;
        this._clock.T += t;
    };

    CPU.prototype.NOP = function() {
        this.increaseCycles(1, 4);
    };

    CPU.prototype.ADD = function(reg1, reg2) {
        this._reg[reg1] += this._reg[reg2];
        this._reg.F = 0;

        if(!(this._reg.A & 255)) {
            this._reg.F |= 0x80;
        }

        if(this._reg.A > 255) {
            this._reg.F |= 0x10;
        }
        this._reg.A &= 255;
        this._reg.M = 1;
        this._reg.T = 4;
    };

    return CPU;
});

