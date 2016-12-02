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
        this._stop = true;

        this._initInstructions();
        this._mapInstructions();
    };

    CPU.prototype._step = function(m, t) {
        if(!t) {
            t=m*4;
        }
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
        this._stop = true;
    };

    CPU.prototype._resetZeroFlag = function() {
        this._reg.F &= 0x70;
    };

    CPU.prototype._resetSubstractFlag = function() {
        this._reg.F &= 0xB0;
    };

    CPU.prototype._resetHalfCarryFlag = function() {
        this._reg.F &= 0xD0;
    };

    CPU.prototype._resetCarryFlag = function() {
        this._reg.F &= 0xE0;
    };

    CPU.prototype._setZeroFlag = function() {
        this._reg.F |= 0x80;
    };

    CPU.prototype._setSubstractFlag = function() {
        this._reg.F |= 0x40;
    };

    CPU.prototype._setHalfCarryFlag = function() {
        this._reg.F |= 0x20;
    };

    CPU.prototype._setCarryFlag = function() {
        this._reg.F |= 0x10;
    };

    CPU.prototype.dispatch = function() {
      while(!(this._halt || this._stop)) {
            var instruction = MM.readByte(this._reg.PC++);
            this._reg.PC &= 65536;
            this._insMap[instruction]();

      }
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
            this._setZeroFlag();
        }

        if(this._reg[reg1] > 255) {
            this._setCarryFlag();
        }
        this._reg[reg1] &= 255;

        this._step(1);
    };

    CPU.prototype.CP = function(reg1, reg2) {
        var r1 = this._reg[reg1];
        r1 -= reg2;
        this._reg.F |= 0x40;
        if(!(r1 & 255)) {
            this._setZeroFlag();
        }
        if(r1 < 0) {
            this._setCarryFlag();
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

    CPU.prototype.LDr = function(src, dest) {
        this._reg[dest] = this._reg[src];
        this._step(1);
    };

    CPU.prototype.LDrn = function(reg) {
        this._reg[reg] = MM.readByte(this._reg.PC++);
        this._step(2);
    };

    CPU.prototype.LDrn16 = function(reg1, reg2) {
        this._reg[reg1] = MM.readByte(this._reg.PC++);
        this._reg[reg2] = MM.readByte(this._reg.PC++);
        this._step(3);
    };

    CPU.prototype.LDr16n16 = function(reg) {
        this._reg[reg] = MM.readWord(this._reg.PC);
        this._reg.PC+=2;
        this._step(3);
    };

    CPU.prototype.LDrmm = function(src1, src2, dest, offset) {
        if(!offset) {
            offset = 0;
        }
        this._reg[dest] = MM.readByte((this._reg[src1] << 8) + this._reg[src2] + offset);
        this._step(1,8);
    };

    CPU.prototype.LDmmr = function(src, dest1, dest2, offset) {
        if(!offset) {
            offset = 0;
        }
        MM.writeByte((this._reg[dest1] << 8) + this._reg[dest2] + offset, this._reg[src]);
        this._step(1,8);
    };

    CPU.prototype.LDmn = function(dest1, dest2) {
        MM.writeByte((this._reg[dest1] << 8) + this._reg[dest2], MM.readByte(this._reg.PC++));
        this._step(2, 12);
    };

    CPU.prototype.LDa16r = function(reg) {
        MM.writeByte(MM.readWord(this._reg[PC]), this._reg[reg]);
        this._reg.PC += 2;
        this._step(3, 16);
    };

    CPU.prototype.LDa16r16 = function(reg) {
        MM.writeWord(MM.readWord(this._reg[PC]), this._reg[reg]);
        this._reg.PC += 2;
        this._step(3, 20);
    };

    CPU.prototype.LDra16 = function(reg) {
        this._reg[reg] = MM.readByte(MM.readWord(this._reg[PC]));
        this._reg.PC += 2;
        this._step(3, 16);
    };

    CPU.prototype.LDar = function(reg) {
        MM.writeByte(0xFF00 + MM.readByte(this._reg.PC++), this._reg[reg]);
        this._step(2, 12);
    };

    CPU.prototype.LDra = function(reg) {
        this._reg[reg] = MM.readByte(0xFF00 + MM.readByte(this._reg.PC++));
        this._step(2, 12);
    };

    CPU.prototype.LDmr = function(src, destAddr) {
        MM.writeByte(0xFF00 + this._reg[destAddr], this._reg[src]);
        this._step(2, 8);
    };

    CPU.prototype.LDrm = function(srcAddr, dest) {
        this._reg[dest] = MM.readByte(0xFF00 + this._reg[srcAddr]);
        this._step(2, 8);
    };

    CPU.prototype.LDr16rr = function(src1, src2, dest) {
        this._reg[dest] = (this._reg[src1] << 8) + this._reg[src2];
        this._step(1, 8);
    };

    CPU.prototype.LDrrr16n = function(src, dest1, dest2) {
        var offset = MM.readByte(this._reg.PC++);
        // the offset is signed, need to convert it from 2-complement representation
        if (offset > 127) {
            offset = -((~offset + 1) & 255);
        }
        var value = this._reg[src] + offset;
        this._reg[dest1] = (value >> 8) & 255;
        this._reg[dest2] = value & 255;

        // set flags
        this._reg.F = 0;
        if(value > 0xFFFF) {
            this._setCarryFlag();
        }
        else {
            this._resetCarryFlag();
        }
        if((this._reg.SP & 0xF)  + (offset & 0xF) > 0xF) {
            this._setHalfCarryFlag();
        }
        else {
            this._resetHalfCarryFlag();
        }

        this._step(2, 12);
    };

    CPU.prototype._initInstructions = function() {
        var _this = this;
        this._ins = {
            LDrrAA: this.LDr.curry(A, A).bind(_this),
            LDrrAB: this.LDr.curry(B, A).bind(_this),
            LDrrAC: this.LDr.curry(C, A).bind(_this),
            LDrrAD: this.LDr.curry(D, A).bind(_this),
            LDrrAE: this.LDr.curry(E, A).bind(_this),
            LDrrAH: this.LDr.curry(H, A).bind(_this),
            LDrrAL: this.LDr.curry(L, A).bind(_this),
            LDrrBA: this.LDr.curry(A, B).bind(_this),
            LDrrBB: this.LDr.curry(B, B).bind(_this),
            LDrrBC: this.LDr.curry(C, B).bind(_this),
            LDrrBD: this.LDr.curry(D, B).bind(_this),
            LDrrBE: this.LDr.curry(E, B).bind(_this),
            LDrrBH: this.LDr.curry(H, B).bind(_this),
            LDrrBL: this.LDr.curry(L, B).bind(_this),
            LDrrCA: this.LDr.curry(A, C).bind(_this),
            LDrrCB: this.LDr.curry(B, C).bind(_this),
            LDrrCC: this.LDr.curry(C, C).bind(_this),
            LDrrCD: this.LDr.curry(D, C).bind(_this),
            LDrrCE: this.LDr.curry(E, C).bind(_this),
            LDrrCH: this.LDr.curry(H, C).bind(_this),
            LDrrCL: this.LDr.curry(L, C).bind(_this),
            LDrrDA: this.LDr.curry(A, D).bind(_this),
            LDrrDB: this.LDr.curry(B, D).bind(_this),
            LDrrDC: this.LDr.curry(C, D).bind(_this),
            LDrrDD: this.LDr.curry(D, D).bind(_this),
            LDrrDE: this.LDr.curry(E, D).bind(_this),
            LDrrDH: this.LDr.curry(H, D).bind(_this),
            LDrrDL: this.LDr.curry(L, D).bind(_this),
            LDrrEA: this.LDr.curry(A, E).bind(_this),
            LDrrEB: this.LDr.curry(B, E).bind(_this),
            LDrrEC: this.LDr.curry(C, E).bind(_this),
            LDrrED: this.LDr.curry(D, E).bind(_this),
            LDrrEE: this.LDr.curry(E, E).bind(_this),
            LDrrEH: this.LDr.curry(H, E).bind(_this),
            LDrrEL: this.LDr.curry(L, E).bind(_this),
            LDrrHA: this.LDr.curry(A, H).bind(_this),
            LDrrHB: this.LDr.curry(B, H).bind(_this),
            LDrrHC: this.LDr.curry(C, H).bind(_this),
            LDrrHD: this.LDr.curry(D, H).bind(_this),
            LDrrHE: this.LDr.curry(E, H).bind(_this),
            LDrrHH: this.LDr.curry(H, H).bind(_this),
            LDrrHL: this.LDr.curry(L, H).bind(_this),
            LDrrLA: this.LDr.curry(A, L).bind(_this),
            LDrrLB: this.LDr.curry(B, L).bind(_this),
            LDrrLC: this.LDr.curry(C, L).bind(_this),
            LDrrLD: this.LDr.curry(D, L).bind(_this),
            LDrrLE: this.LDr.curry(E, L).bind(_this),
            LDrrLH: this.LDr.curry(H, L).bind(_this),
            LDrrLL: this.LDr.curry(L, L).bind(_this),

            LDnA: this.LDrn.curry(A).bind(_this),
            LDnB: this.LDrn.curry(B).bind(_this),
            LDnC: this.LDrn.curry(C).bind(_this),
            LDnD: this.LDrn.curry(D).bind(_this),
            LDnE: this.LDrn.curry(E).bind(_this),
            LDnH: this.LDrn.curry(H).bind(_this),
            LDnL: this.LDrn.curry(L).bind(_this),

            LDnnBC: this.LDrn16.curry(B, C).bind(_this),
            LDnnDE: this.LDrn16.curry(D, E).bind(_this),
            LDnnHL: this.LDrn16.curry(H, L).bind(_this),
            LDnnSP: this.LDr16n16.curry(SP).bind(_this),

            LDrmAHL: this.LDrmm.curry(H, L, A).bind(_this),
            LDrmAHLplus: this.LDrmm.curry(H, L, A, 1).bind(_this),
            LDrmAHLminus: this.LDrmm.curry(H, L, A, -1).bind(_this),
            LDrmBHL: this.LDrmm.curry(H, L, B).bind(_this),
            LDrmCHL: this.LDrmm.curry(H, L, C).bind(_this),
            LDrmDHL: this.LDrmm.curry(H, L, D).bind(_this),
            LDrmEHL: this.LDrmm.curry(H, L, E).bind(_this),
            LDrmHHL: this.LDrmm.curry(H, L, H).bind(_this),
            LDrmLHL: this.LDrmm.curry(H, L, L).bind(_this),
            LDrmABC: this.LDrmm.curry(B, C, A).bind(_this),
            LDrmADE: this.LDrmm.curry(D, E, A).bind(_this),

            LDmrHLA: this.LDmmr.curry(A, H, L).bind(_this),
            LDmrHLplusA: this.LDmmr.curry(A, H, L, 1).bind(_this),
            LDmrHLminusA: this.LDmmr.curry(A, H, L, -1).bind(_this),
            LDmrHLB: this.LDmmr.curry(B, H, L).bind(_this),
            LDmrHLC: this.LDmmr.curry(C, H, L).bind(_this),
            LDmrHLD: this.LDmmr.curry(D, H, L).bind(_this),
            LDmrHLE: this.LDmmr.curry(E, H, L).bind(_this),
            LDmrHLH: this.LDmmr.curry(H, H, L).bind(_this),
            LDmrHLL: this.LDmmr.curry(L, H, L).bind(_this),
            LDmrBCA: this.LDmmr.curry(A, B, C).bind(_this),
            LDmrDEA: this.LDmmr.curry(A, D, E).bind(_this),

            LDmnHL: this.LDmn.curry(H, L).bind(_this),

            LDarSP: this.LDa16r16.curry(SP).bind(_this),

            LDaarA: this.LDa16r.curry(A).bind(_this),

            LDraaA: this.LDra16.curry(A).bind(_this),

            LDarA: this.LDar.curry(A).bind(_this),

            LDraA: this.LDra.curry(A).bind(_this),

            LDmrCA: this.LDmr.curry(A, C).bind(_this),

            LDrmAC: this.LDrm.curry(C, A).bind(_this),

            LDSPHL: this.LDr16rr.curry(H, L, SP),

            LDHLSPn: this.LDrrr16n.curry(SP, H, L).bind(_this)

        }
    };

    CPU.prototype._mapInstructions = function() {
        // position of the instructions corresponds to its memory address
        this._insMap = {}
    };

    return new CPU();
});
