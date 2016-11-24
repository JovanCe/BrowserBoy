/**
 * Created by JovanCe on 11/8/15.
 */

define(["lodash", "MemoryManager", "GPU"], function(_, MM, GPU) {
    var A = "A";
    var B = "B";
    var C = "C";
    var D = "D";
    var E = "E";
    var H = "H";
    var L = "L";
    var F = "F";
    var PC = "PC";
    var SP = "SP";
    var M = "M";
    var T = "T";

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

        this._halt = false;
        this._stop = false;

        this.initInstructions();
    };

    CPU.prototype._step = function(m) {
        var t = m*4;
        this._reg.M = m;
        this._reg.T = t;
        this._clock.M += m;
        this._clock.T += t;
        GPU._clock.T += t;
    };

    CPU.prototype.reset = function() {
        _.map(_.keys(this._reg), function(key){
            this._reg[key] = 0;
        }.bind(this));
        this._clock.M = 0;
        this._clock.T = 0;
        this._halt = false;
        this._stop = false;
    };

    CPU.prototype.dispatch = function() {
      //  while(true) {
            var op = MM.readByte(this._reg.PC++);
            this._reg.PC &= 65536;

      //  }
    };

    CPU.prototype.NOP = function() {
        this._step(1);
    };

    CPU.prototype.HALT = function() {
        this._halt = true;
        this._step(1);
    };

    CPU.prototype.ADD = function(reg1, reg2) {
        this._reg[reg1] += this._reg[reg2];
        this._reg.F = 0;

        if(!(this._reg[reg1] & 255)) {
            this._reg.F |= 0x80;
        }

        if(this._reg[reg1] > 255) {
            this._reg.F |= 0x10;
        }
        this._reg[reg1] &= 255;

        this._step(1);
    };

    CPU.prototype.CP = function(reg1, reg2) {
        var r1 = this._reg[reg1];
        r1 -= reg2;
        this._reg.F |= 0x40;
        if(!(r1 & 255)) {
            this._reg.F |= 0x80;
        }
        if(r1 < 0) {
            this._reg.F |= 0x10;
        }

        this._step(1);
    };

    CPU.prototype.PUSH = function(reg) {
        this._reg.SP--;
        MM.writeByte(this._reg.SP, this._reg[reg]);
        this._step(1);
    };

    CPU.prototype.POP = function(reg) {
        this._reg[reg] = MM.readByte(this._reg.SP);
        this._reg.SP++;
        this._step(1);
    };

    CPU.prototype.LD = function(reg) {
        // get the required address from the current instruction
        var address = MM.readWord(this._reg.PC);
        // increase PC by a word
        this._reg.PC += 2;
        // read concrete byte
        this._reg[reg] = MM.readByte(address);
        this._step(4);
    };

    CPU.prototype.LDr = function(src, dest) {
        this._reg[dest] = this._reg[src];
        this._step(1);
    };


    CPU.prototype.initInstructions = function() {
        var _this = this;
        this._ins = {
            LDrrAA: this.LDr.curry(A, A).bind(_this),
            LDrrAB: this.LDr.curry(A, B).bind(_this),
            LDrrAC: this.LDr.curry(A, C).bind(_this),
            LDrrAD: this.LDr.curry(A, D).bind(_this),
            LDrrAE: this.LDr.curry(A, E).bind(_this),
            LDrrAH: this.LDr.curry(A, H).bind(_this),
            LDrrAL: this.LDr.curry(A, L).bind(_this),
            LDrrBA: this.LDr.curry(B, A).bind(_this),
            LDrrBB: this.LDr.curry(B, B).bind(_this),
            LDrrBC: this.LDr.curry(B, C).bind(_this),
            LDrrBD: this.LDr.curry(B, D).bind(_this),
            LDrrBE: this.LDr.curry(B, E).bind(_this),
            LDrrBH: this.LDr.curry(B, H).bind(_this),
            LDrrBL: this.LDr.curry(B, L).bind(_this),
            LDrrCA: this.LDr.curry(C, A).bind(_this),
            LDrrCB: this.LDr.curry(C, B).bind(_this),
            LDrrCC: this.LDr.curry(C, C).bind(_this),
            LDrrCD: this.LDr.curry(C, D).bind(_this),
            LDrrCE: this.LDr.curry(C, E).bind(_this),
            LDrrCH: this.LDr.curry(C, H).bind(_this),
            LDrrCL: this.LDr.curry(C, L).bind(_this),
            LDrrDA: this.LDr.curry(D, A).bind(_this),
            LDrrDB: this.LDr.curry(D, B).bind(_this),
            LDrrDC: this.LDr.curry(D, C).bind(_this),
            LDrrDD: this.LDr.curry(D, D).bind(_this),
            LDrrDE: this.LDr.curry(D, E).bind(_this),
            LDrrDH: this.LDr.curry(D, H).bind(_this),
            LDrrDL: this.LDr.curry(D, L).bind(_this),
            LDrrEA: this.LDr.curry(E, A).bind(_this),
            LDrrEB: this.LDr.curry(E, B).bind(_this),
            LDrrEC: this.LDr.curry(E, C).bind(_this),
            LDrrED: this.LDr.curry(E, D).bind(_this),
            LDrrEE: this.LDr.curry(E, E).bind(_this),
            LDrrEH: this.LDr.curry(E, H).bind(_this),
            LDrrEL: this.LDr.curry(E, L).bind(_this),
            LDrrHA: this.LDr.curry(H, A).bind(_this),
            LDrrHB: this.LDr.curry(H, B).bind(_this),
            LDrrHC: this.LDr.curry(H, C).bind(_this),
            LDrrHD: this.LDr.curry(H, D).bind(_this),
            LDrrHE: this.LDr.curry(H, E).bind(_this),
            LDrrHH: this.LDr.curry(H, H).bind(_this),
            LDrrHL: this.LDr.curry(H, L).bind(_this),
            LDrrLA: this.LDr.curry(L, A).bind(_this),
            LDrrLB: this.LDr.curry(L, B).bind(_this),
            LDrrLC: this.LDr.curry(L, C).bind(_this),
            LDrrLD: this.LDr.curry(L, D).bind(_this),
            LDrrLE: this.LDr.curry(L, E).bind(_this),
            LDrrLH: this.LDr.curry(L, H).bind(_this),
            LDrrLL: this.LDr.curry(L, L).bind(_this)
        }
    };

    return new CPU();
});
