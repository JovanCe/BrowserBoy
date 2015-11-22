/**
 * Created by JovanCe on 11/8/15.
 */

define(["underscore"], function(_) {
    var CPU = function() {
        this.A = "A";
        this.B = "B";
        this.C = "C";
        this.D = "D";
        this.E = "E";
        this.H = "H";
        this.L = "L";
        this.F = "F";
        this.PC = "PC";
        this.SP = "SP";
        this.M = "M";
        this.T = "T";

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

    CPU.prototype._increaseCycles = function(m) {
        var t = m*4;
        this._reg.M = m;
        this._reg.T = t;
        this._clock.M += m;
        this._clock.T += t;
    };

    CPU.prototype.NOP = function() {
        this._increaseCycles(1);
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

        this._increaseCycles(1);
    };

    CPU.prototype.CP = function(reg1, reg2) {
        var r1 = this._reg[reg1];
        r1 -= reg2;
        this._reg.F |= 0x40;
        if(!(r1 & 255)) this._reg.F |= 0x80;
        if(r1 < 0) this._reg.F |= 0x10;

        this._increaseCycles(1);
    };

    CPU.prototype.PUSH = function(reg) {

    };

    return CPU;
});
