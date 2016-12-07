/**
 * Created by JovanCe on 11/8/15.
 */

define(["lodash", "config", "events", "MemoryManager", "GPU"], function(_, config, events, MM, GPU) {
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
        
        // flag masks
        this._FLAG_ZERO = 0x80;
        this._FLAG_SUBSTRACT = 0x40;
        this._FLAG_HALF_CARRY = 0x20;
        this._FLAG_CARRY = 0x10;

        this._initInstructions();
        this._mapInstructions();

        // register event handlers
        events.register(events.ROMLoaded);
        events.addEventListener(events.ROMLoaded, function() {
            this.dispatch();
        }.bind(this));
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

    CPU.prototype._getFlag = function(flag) {
        return (this._reg.F & flag) > 0 ? 1:0;
    };
    CPU.prototype._setFlag = function(flag, value) {
        if(value) {
            this._reg.F |= flag;
        }
        else {
            this._reg.F &= flag ^ 0xFF;
        }
    };

    CPU.prototype.dispatch = function() {
        // skip bios for now
        this._reg.PC = 0x100;
        this._reg.SP = 0xFFFE;
        this._stop = false;

      while(!(this._halt || this._stop)) {
          var instruction = MM.readByte(this._reg.PC++);
          this._reg.PC &= 65535;

          if(instruction > 0) {
              this._insMap[instruction].call(this, instruction);
          }

      }
    };

    CPU.prototype.NOP = function() {
        this._step(1);
    };

    CPU.prototype.HALT = function() {
        this._halt = true;
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

    CPU.prototype.PUSHrr = function(reg1, reg2) {
        this._reg.SP--;
        MM.writeByte(this._reg.SP--, this._reg[reg1]);
        MM.writeByte(this._reg.SP, this._reg[reg2]);
        this._step(1, 16);
    };

    CPU.prototype.POPrr = function(reg1, reg2) {
        this._reg[reg2] = MM.readByte(this._reg.SP++);
        this._reg[reg1] = MM.readByte(this._reg.SP++);
        this._step(1, 12);
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
        this._setFlag(this._FLAG_CARRY, value > 0xFFFF);
        this._setFlag(this._FLAG_HALF_CARRY, (this._reg.SP & 0xF)  + (offset & 0xF) > 0xF);

        this._step(2, 12);
    };

    CPU.prototype.ADDrr = function(reg1, reg2) {
        var result = this._reg[reg1] + this._reg[reg2];

        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, result == 0);
        this._setFlag(this._FLAG_SUBSTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, (this._reg[reg1] & 0xF)  + (this._reg[reg2] & 0xF) > 0xF);
        this._setFlag(this._FLAG_CARRY, result > 0xFF);

        this._reg[reg1] = result & 0xFF;

        this._step(1);
    };
    CPU.prototype.ADCrr = function(reg1, reg2) {
        var carry = this._getFlag(this._FLAG_CARRY);
        var result = this._reg[reg1] + this._reg[reg2] + carry;

        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, result == 0);
        this._setFlag(this._FLAG_SUBSTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, (this._reg[reg1] & 0xF)  + ((this._reg[reg2] + carry) & 0xF) > 0xF);
        this._setFlag(this._FLAG_CARRY, result > 0xFF);

        this._reg[reg1] = result & 0xFF;

        this._step(1);
    };

    CPU.prototype.ANDrr = function(reg) {
        this._reg.A &= this._reg[reg];
        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, this._reg.A == 0);
        this._setFlag(this._FLAG_SUBSTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, true);
        this._setFlag(this._FLAG_CARRY, false);

        this._step(1);
    };

    CPU.prototype.ORrr = function(reg) {
        this._reg.A |= this._reg[reg];
        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, this._reg.A == 0);
        this._setFlag(this._FLAG_SUBSTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, false);
        this._setFlag(this._FLAG_CARRY, false);

        this._step(1);
    };

    CPU.prototype.XORrr = function(reg) {
        this._reg.A ^= this._reg[reg];
        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, this._reg.A == 0);
        this._setFlag(this._FLAG_SUBSTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, false);
        this._setFlag(this._FLAG_CARRY, false);

        this._step(1);
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

            LDSPHL: this.LDr16rr.curry(H, L, SP).bind(_this),

            LDHLSPn: this.LDrrr16n.curry(SP, H, L).bind(_this),

            PUSHBC: this.PUSHrr.curry(B, C).bind(_this),
            PUSHDE: this.PUSHrr.curry(D, E).bind(_this),
            PUSHHL: this.PUSHrr.curry(H, L).bind(_this),
            PUSHAF: this.PUSHrr.curry(A, F).bind(_this),

            POPBC: this.POPrr.curry(B, C).bind(_this),
            POPDE: this.POPrr.curry(D, E).bind(_this),
            POPHL: this.POPrr.curry(H, L).bind(_this),
            POPAF: this.POPrr.curry(A, F).bind(_this),

            ADDrrAA: this.ADDrr.curry(A, A).bind(_this),
            ADDrrAB: this.ADDrr.curry(A, B).bind(_this),
            ADDrrAC: this.ADDrr.curry(A, C).bind(_this),
            ADDrrAD: this.ADDrr.curry(A, D).bind(_this),
            ADDrrAE: this.ADDrr.curry(A, E).bind(_this),
            ADDrrAH: this.ADDrr.curry(A, H).bind(_this),
            ADDrrAL: this.ADDrr.curry(A, L).bind(_this),

            ADCrrAA: this.ADCrr.curry(A, A).bind(_this),
            ADCrrAB: this.ADCrr.curry(A, B).bind(_this),
            ADCrrAC: this.ADCrr.curry(A, C).bind(_this),
            ADCrrAD: this.ADCrr.curry(A, D).bind(_this),
            ADCrrAE: this.ADCrr.curry(A, E).bind(_this),
            ADCrrAH: this.ADCrr.curry(A, H).bind(_this),
            ADCrrAL: this.ADCrr.curry(A, L).bind(_this),

            ANDrrA: this.ANDrr.curry(A).bind(_this),
            ANDrrB: this.ANDrr.curry(B).bind(_this),
            ANDrrC: this.ANDrr.curry(C).bind(_this),
            ANDrrD: this.ANDrr.curry(D).bind(_this),
            ANDrrE: this.ANDrr.curry(E).bind(_this),
            ANDrrH: this.ANDrr.curry(H).bind(_this),
            ANDrrL: this.ANDrr.curry(L).bind(_this),

            ORrrA: this.ORrr.curry(A).bind(_this),
            ORrrB: this.ORrr.curry(B).bind(_this),
            ORrrC: this.ORrr.curry(C).bind(_this),
            ORrrD: this.ORrr.curry(D).bind(_this),
            ORrrE: this.ORrr.curry(E).bind(_this),
            ORrrH: this.ORrr.curry(H).bind(_this),
            ORrrL: this.ORrr.curry(L).bind(_this),

            XORrrA: this.XORrr.curry(A).bind(_this),
            XORrrB: this.XORrr.curry(B).bind(_this),
            XORrrC: this.XORrr.curry(C).bind(_this),
            XORrrD: this.XORrr.curry(D).bind(_this),
            XORrrE: this.XORrr.curry(E).bind(_this),
            XORrrH: this.XORrr.curry(H).bind(_this),
            XORrrL: this.XORrr.curry(L).bind(_this)

        };
        if(config.debug) {
            _.map(_.keys(this._ins), function (key) {
                this._ins[key].toString = function () {
                    return key
                };
            }.bind(this));
        }
    };
    CPU.prototype.NI = function(position) {
        console.log("Unimplemented instruction called: " + position.toString(16));
    };

    CPU.prototype.EMPTY = function(position) {
        console.log("Unmapped instruction called: " + position.toString(16));
    };

    CPU.prototype._mapInstructions = function() {
        // position of the instructions corresponds to its memory address
        this._insMap = [
            this.NOP, this._ins.LDnnBC, this._ins.LDmrBCA, this.NI,
            this.NI, this.NI, this._ins.LDnB, this.NI,
            this._ins.LDarSP, this.NI, this._ins.LDrmABC, this.NI,
            this.NI, this.NI, this._ins.LDnC, this.NI,

            this.NI, this._ins.LDnnDE, this._ins.LDmrDEA, this.NI,
            this.NI, this.NI, this._ins.LDnD, this.NI,
            this.NI, this.NI, this._ins.LDrmADE, this.NI,
            this.NI, this.NI, this._ins.LDnE, this.NI,

            this.NI, this._ins.LDnnHL, this._ins.LDmrHLplusA, this.NI,
            this.NI, this.NI, this._ins.LDnH, this.NI,
            this.NI, this.NI, this._ins.LDrmAHLplus, this.NI,
            this.NI, this.NI, this._ins.LDnL, this.NI,

            this.NI, this._ins.LDnnSP, this._ins.LDmrHLminusA, this.NI,
            this.NI, this.NI, this._ins.LDmnHL, this.NI,
            this.NI, this.NI, this._ins.LDrmAHLminus, this.NI,
            this.NI, this.NI, this._ins.LDnA, this.NI,

            this._ins.LDrrBB, this._ins.LDrrBC, this._ins.LDrrBD, this._ins.LDrrBE,
            this._ins.LDrrBH, this._ins.LDrrBL, this._ins.LDrmBHL, this._ins.LDrrBA,
            this._ins.LDrrCB, this._ins.LDrrCC, this._ins.LDrrCD, this._ins.LDrrCE,
            this._ins.LDrrCH, this._ins.LDrrCL, this._ins.LDrmCHL, this._ins.LDrrCA,

            this._ins.LDrrDB, this._ins.LDrrDC, this._ins.LDrrDD, this._ins.LDrrDE,
            this._ins.LDrrDH, this._ins.LDrrDL, this._ins.LDrmDHL, this._ins.LDrrDA,
            this._ins.LDrrEB, this._ins.LDrrEC, this._ins.LDrrED, this._ins.LDrrEE,
            this._ins.LDrrEH, this._ins.LDrrEL, this._ins.LDrmEHL, this._ins.LDrrEA,

            this._ins.LDrrHB, this._ins.LDrrHC, this._ins.LDrrHD, this._ins.LDrrHE,
            this._ins.LDrrHH, this._ins.LDrrHL, this._ins.LDrmHHL, this._ins.LDrrHA,
            this._ins.LDrrLB, this._ins.LDrrLC, this._ins.LDrrLD, this._ins.LDrrLE,
            this._ins.LDrrLH, this._ins.LDrrLL, this._ins.LDrmLHL, this._ins.LDrrLA,

            this._ins.LDmrHLB, this._ins.LDmrHLC, this._ins.LDmrHLD, this._ins.LDmrHLE,
            this._ins.LDmrHLH, this._ins.LDmrHLL, this.HALT, this._ins.LDmrHLA,
            this._ins.LDrrAB, this._ins.LDrrAC, this._ins.LDrrAD, this._ins.LDrrAE,
            this._ins.LDrrAH, this._ins.LDrrAL, this._ins.LDrmAHL, this._ins.LDrrAA,

            this._ins.ADDrrAB, this._ins.ADDrrAC, this._ins.ADDrrAD, this._ins.ADDrrAE,
            this._ins.ADDrrAH, this._ins.ADDrrAL, this.NI, this._ins.ADDrrAA,
            this._ins.ADCrrAB, this._ins.ADCrrAC, this._ins.ADCrrAD, this._ins.ADCrrAE,
            this._ins.ADCrrAH, this._ins.ADCrrAL, this.NI, this._ins.ADCrrAA,

            this.NI, this.NI, this.NI, this.NI,
            this.NI, this.NI, this.NI, this.NI,
            this.NI, this.NI, this.NI, this.NI,
            this.NI, this.NI, this.NI, this.NI,

            this._ins.ANDrrB, this._ins.ANDrrC, this._ins.ANDrrD, this._ins.ANDrrE,
            this._ins.ANDrrH, this._ins.ANDrrL, this.NI, this._ins.ANDrrA,
            this._ins.XORrrB, this._ins.XORrrC, this._ins.XORrrD, this._ins.XORrrE,
            this._ins.XORrrH, this._ins.XORrrL, this.NI, this._ins.XORrrA,

            this._ins.ORrrB, this._ins.ORrrC, this._ins.ORrrD, this._ins.ORrrE,
            this._ins.ORrrH, this._ins.ORrrL, this.NI, this._ins.ORrrA,
            this.NI, this.NI, this.NI, this.NI,
            this.NI, this.NI, this.NI, this.NI,

            this.NI, this._ins.POPBC, this.NI, this.NI,
            this.NI, this._ins.PUSHBC, this.NI, this.NI,
            this.NI, this.NI, this.NI, this.NI,
            this.NI, this.NI, this.NI, this.NI,

            this.NI, this._ins.POPDE, this.NI, this.EMPTY,
            this.NI, this._ins.PUSHDE, this.NI, this.NI,
            this.NI, this.NI, this.NI, this.EMPTY,
            this.NI, this.EMPTY, this.NI, this.NI,

            this._ins.LDarA, this._ins.POPHL, this._ins.LDmrCA, this.EMPTY,
            this.EMPTY, this._ins.PUSHHL, this.NI, this.NI,
            this.NI, this.NI, this._ins.LDaarA, this.EMPTY,
            this.EMPTY, this.EMPTY, this.NI, this.NI,

            this._ins.LDraA, this._ins.POPAF, this._ins.LDrmAC, this.NI,
            this.EMPTY, this._ins.PUSHAF, this.NI, this.NI,
            this._ins.LDHLSPn, this._ins.LDSPHL, this._ins.LDraaA, this.NI,
            this.EMPTY, this.EMPTY, this.NI, this.NI
        ];
    };

    return new CPU();
});
