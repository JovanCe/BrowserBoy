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

    function CPU() {
        // registers
        this._reg = {
            A:0, B:0, C:0, D:0, E:0, H:0, L:0, F:0,    // 8-bit registers
            PC:0, SP:0,                                // 16-bit registers
            M:0, T:0
        };

        // machine cycle and cpu cycle counters
        this._clock= {
            M:0, T:0
        };

        this._halt = false;
        this._stop = true;
        
        // flag masks
        this._FLAG_ZERO = 0x80;
        this._FLAG_SUBTRACT = 0x40;
        this._FLAG_HALF_CARRY = 0x20;
        this._FLAG_CARRY = 0x10;

        // register event handlers
        events.register(events.ROMLoaded);
        events.addEventListener(events.ROMLoaded, function() {
            this.dispatch();
        }.bind(this));

        // show instruction names in debug
        if(config.debug) {
            _.map(_.keys(this._ins), function (key) {
                this._ins[key].toString = function () {
                    return key
                };
            }.bind(this));
        }
    }

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

    CPU.prototype._performADD = function(val1, val2, word) {
        var result = val1 + val2;
        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, result == 0);
        this._setFlag(this._FLAG_SUBTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, (val1 & 0xF)  + (val2 & 0xF) > 0xF);
        this._setFlag(this._FLAG_CARRY, result > 0xFF);
        if(!word) {
            result &= 0xFF;
        }
        return result;
    };

    CPU.prototype.ADDrr = function(reg1, reg2) {
        this._reg[reg1] = this._performADD(this._reg[reg1], this._reg[reg2]);
        this._step(1);
    };

    CPU.prototype.ADDrmm = function(src1, src2, dest) {
        var toAdd = MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        this._reg[dest] = this._performADD(this._reg[dest], toAdd);
        this._step(1, 8);
    };

    CPU.prototype.ADCrr = function(reg1, reg2) {
        var toAdd = this._reg[reg2] + this._getFlag(this._FLAG_CARRY);
        this._reg[reg1] = this._performADD(this._reg[reg1], toAdd);
        this._step(1);
    };

    CPU.prototype.ADCrmm = function(src1, src2, dest) {
        var toAdd = MM.readByte((this._reg[src1] << 8) + this._reg[src2]) + this._getFlag(this._FLAG_CARRY);
        this._reg[dest] = this._performADD(this._reg[dest], toAdd);
        this._step(1, 8);
    };
    CPU.prototype.ADDrrrr = function(dest1, dest2, src1, src2) {
        var toAdd;
        if(src2) {
            toAdd = this._reg[src1] << 8 + this._reg[src2];
        }
        else {
            toAdd = this._reg[src1];
        }
        var zero = this._getFlag(this._FLAG_ZERO);
        var result = this._performADD((this._reg[dest1] << 8) + this._reg[dest2], toAdd);
        this._setFlag(this._FLAG_ZERO, zero == 0);
        this._reg[dest1] = result >> 8;
        this._reg[dest2] = result & 0xFF;
        this._step(1, 8);
    };

    CPU.prototype._performSUB = function(val1, val2) {
        var result = val1 - val2;
        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, result == 0);
        this._setFlag(this._FLAG_SUBTRACT, true);
        this._setFlag(this._FLAG_HALF_CARRY, (val1 & 0xF) - (val2 & 0xF) < 0);
        this._setFlag(this._FLAG_CARRY, result < 0);

        return result & 0xFF;
    };

    CPU.prototype.SUBrr = function(reg) {
        this._reg.A = this._performSUB(this._reg.A, this._reg[reg]);
        this._step(1);
    };

    CPU.prototype.SUBrmm = function(src1, src2) {
        var toSubtract = MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        this._reg.A = this._performSUB(this._reg.A, toSubtract);
        this._step(1, 8);
    };

    CPU.prototype.SBCrr = function(reg) {
        var toSubstract = this._reg[reg] + this._getFlag(this._FLAG_CARRY);
        this._reg.A = this._performSUB(this._reg.A, toSubstract);

        this._step(1);
    };

    CPU.prototype.SBCrmm = function(src1, src2) {
        var toSubstract = MM.readByte((this._reg[src1] << 8) + this._reg[src2]) + this._getFlag(this._FLAG_CARRY);
        this._reg.A = this._performSUB(this._reg.A, toSubstract);

        this._step(1, 8);
    };

    CPU.prototype.ANDrr = function(reg) {
        this._reg.A &= this._reg[reg];
        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, this._reg.A == 0);
        this._setFlag(this._FLAG_SUBTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, true);
        this._setFlag(this._FLAG_CARRY, false);

        this._step(1);
    };

    CPU.prototype.ANDrmm = function(src1, src2) {
        this._reg.A &= MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, this._reg.A == 0);
        this._setFlag(this._FLAG_SUBTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, true);
        this._setFlag(this._FLAG_CARRY, false);

        this._step(1, 8);
    };

    CPU.prototype.XORrr = function(reg) {
        this._reg.A ^= this._reg[reg];
        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, this._reg.A == 0);
        this._setFlag(this._FLAG_SUBTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, false);
        this._setFlag(this._FLAG_CARRY, false);

        this._step(1);
    };

    CPU.prototype.XORrmm = function(src1, src2) {
        this._reg.A ^= MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, this._reg.A == 0);
        this._setFlag(this._FLAG_SUBTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, false);
        this._setFlag(this._FLAG_CARRY, false);

        this._step(1, 8);
    };

    CPU.prototype.ORrr = function(reg) {
        this._reg.A |= this._reg[reg];
        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, this._reg.A == 0);
        this._setFlag(this._FLAG_SUBTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, false);
        this._setFlag(this._FLAG_CARRY, false);

        this._step(1);
    };

    CPU.prototype.ORrmm = function(src1, src2) {
        this._reg.A |= MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        this._reg.F = 0;
        this._setFlag(this._FLAG_ZERO, this._reg.A == 0);
        this._setFlag(this._FLAG_SUBTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, false);
        this._setFlag(this._FLAG_CARRY, false);

        this._step(1, 8);
    };

    CPU.prototype.CPrr = function(reg) {
        this._performSUB(this._reg.A, this._reg[reg]);
        this._step(1);
    };

    CPU.prototype.CPrmm = function(src1, src2) {
        var toCompare = MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        this._performSUB(this._reg.A, toCompare);
        this._step(1, 8);
    };

    CPU.prototype.INCr = function(reg) {
        this._reg[reg]++;
        this._reg[reg] &= 0xFF;
        this._setFlag(this._FLAG_ZERO, this._reg[reg] == 0);
        this._setFlag(this._FLAG_SUBTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, (this._reg[reg] & 0xF) + (1 & 0xF) > 0xF);
        this._step(1);
    };
    CPU.prototype.INCmm = function(src1, src2) {
        var value = MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        value++;
        value &= 0xFF;
        MM.writeByte((this._reg[src1] << 8) + this._reg[src2], value);
        this._setFlag(this._FLAG_ZERO, value == 0);
        this._setFlag(this._FLAG_SUBTRACT, false);
        this._setFlag(this._FLAG_HALF_CARRY, (value & 0xF) + (1 & 0xF) > 0xF);
        this._step(1, 12);
    };
    CPU.prototype.INCrr = function(reg1, reg2) {
        this._reg[reg1]++;
        this._reg[reg1] &= 0xFF;
        if(reg2 && this._reg[reg1] == 0) {
            this._reg[reg2]++;
            this._reg[reg2] &= 0xFF;
        }
        this._step(1, 8);
    };
    CPU.prototype.DECr = function(reg) {
        this._reg[reg]--;
        this._reg[reg] &= 0xFF;
        this._setFlag(this._FLAG_ZERO, this._reg[reg] == 0);
        this._setFlag(this._FLAG_SUBTRACT, true);
        this._setFlag(this._FLAG_HALF_CARRY, (this._reg[reg] & 0xF) - (1 & 0xF) < 0);
        this._step(1);
    };
    CPU.prototype.DECmm = function(src1, src2) {
        var value = MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        value--;
        value &= 0xFF;
        MM.writeByte((this._reg[src1] << 8) + this._reg[src2], value);
        this._setFlag(this._FLAG_ZERO, value == 0);
        this._setFlag(this._FLAG_SUBTRACT, true);
        this._setFlag(this._FLAG_HALF_CARRY, (value & 0xF) - (1 & 0xF) < 0);
        this._step(1, 12);
    };
    CPU.prototype.DECrr = function(reg1, reg2) {
        this._reg[reg1]--;
        this._reg[reg1] &= 0xFF;
        if(reg2 && this._reg[reg1] == 0xFF) {
            this._reg[reg2]--;
            this._reg[reg2] &= 0xFF;
        }
        this._step(1, 8);
    };
    var _this = CPU.prototype;
    CPU.prototype._ins = {
        LDrrAA: _this.LDr.curry(A, A),
        LDrrAB: _this.LDr.curry(B, A),
        LDrrAC: _this.LDr.curry(C, A),
        LDrrAD: _this.LDr.curry(D, A),
        LDrrAE: _this.LDr.curry(E, A),
        LDrrAH: _this.LDr.curry(H, A),
        LDrrAL: _this.LDr.curry(L, A),
        LDrrBA: _this.LDr.curry(A, B),
        LDrrBB: _this.LDr.curry(B, B),
        LDrrBC: _this.LDr.curry(C, B),
        LDrrBD: _this.LDr.curry(D, B),
        LDrrBE: _this.LDr.curry(E, B),
        LDrrBH: _this.LDr.curry(H, B),
        LDrrBL: _this.LDr.curry(L, B),
        LDrrCA: _this.LDr.curry(A, C),
        LDrrCB: _this.LDr.curry(B, C),
        LDrrCC: _this.LDr.curry(C, C),
        LDrrCD: _this.LDr.curry(D, C),
        LDrrCE: _this.LDr.curry(E, C),
        LDrrCH: _this.LDr.curry(H, C),
        LDrrCL: _this.LDr.curry(L, C),
        LDrrDA: _this.LDr.curry(A, D),
        LDrrDB: _this.LDr.curry(B, D),
        LDrrDC: _this.LDr.curry(C, D),
        LDrrDD: _this.LDr.curry(D, D),
        LDrrDE: _this.LDr.curry(E, D),
        LDrrDH: _this.LDr.curry(H, D),
        LDrrDL: _this.LDr.curry(L, D),
        LDrrEA: _this.LDr.curry(A, E),
        LDrrEB: _this.LDr.curry(B, E),
        LDrrEC: _this.LDr.curry(C, E),
        LDrrED: _this.LDr.curry(D, E),
        LDrrEE: _this.LDr.curry(E, E),
        LDrrEH: _this.LDr.curry(H, E),
        LDrrEL: _this.LDr.curry(L, E),
        LDrrHA: _this.LDr.curry(A, H),
        LDrrHB: _this.LDr.curry(B, H),
        LDrrHC: _this.LDr.curry(C, H),
        LDrrHD: _this.LDr.curry(D, H),
        LDrrHE: _this.LDr.curry(E, H),
        LDrrHH: _this.LDr.curry(H, H),
        LDrrHL: _this.LDr.curry(L, H),
        LDrrLA: _this.LDr.curry(A, L),
        LDrrLB: _this.LDr.curry(B, L),
        LDrrLC: _this.LDr.curry(C, L),
        LDrrLD: _this.LDr.curry(D, L),
        LDrrLE: _this.LDr.curry(E, L),
        LDrrLH: _this.LDr.curry(H, L),
        LDrrLL: _this.LDr.curry(L, L),

        LDnA: _this.LDrn.curry(A),
        LDnB: _this.LDrn.curry(B),
        LDnC: _this.LDrn.curry(C),
        LDnD: _this.LDrn.curry(D),
        LDnE: _this.LDrn.curry(E),
        LDnH: _this.LDrn.curry(H),
        LDnL: _this.LDrn.curry(L),

        LDnnBC: _this.LDrn16.curry(B, C),
        LDnnDE: _this.LDrn16.curry(D, E),
        LDnnHL: _this.LDrn16.curry(H, L),
        LDnnSP: _this.LDr16n16.curry(SP),

        LDrmAHL: _this.LDrmm.curry(H, L, A),
        LDrmAHLplus: _this.LDrmm.curry(H, L, A, 1),
        LDrmAHLminus: _this.LDrmm.curry(H, L, A, -1),
        LDrmBHL: _this.LDrmm.curry(H, L, B),
        LDrmCHL: _this.LDrmm.curry(H, L, C),
        LDrmDHL: _this.LDrmm.curry(H, L, D),
        LDrmEHL: _this.LDrmm.curry(H, L, E),
        LDrmHHL: _this.LDrmm.curry(H, L, H),
        LDrmLHL: _this.LDrmm.curry(H, L, L),
        LDrmABC: _this.LDrmm.curry(B, C, A),
        LDrmADE: _this.LDrmm.curry(D, E, A),

        LDmrHLA: _this.LDmmr.curry(A, H, L),
        LDmrHLplusA: _this.LDmmr.curry(A, H, L, 1),
        LDmrHLminusA: _this.LDmmr.curry(A, H, L, -1),
        LDmrHLB: _this.LDmmr.curry(B, H, L),
        LDmrHLC: _this.LDmmr.curry(C, H, L),
        LDmrHLD: _this.LDmmr.curry(D, H, L),
        LDmrHLE: _this.LDmmr.curry(E, H, L),
        LDmrHLH: _this.LDmmr.curry(H, H, L),
        LDmrHLL: _this.LDmmr.curry(L, H, L),
        LDmrBCA: _this.LDmmr.curry(A, B, C),
        LDmrDEA: _this.LDmmr.curry(A, D, E),

        LDmnHL: _this.LDmn.curry(H, L),

        LDarSP: _this.LDa16r16.curry(SP),

        LDaarA: _this.LDa16r.curry(A),

        LDraaA: _this.LDra16.curry(A),

        LDarA: _this.LDar.curry(A),

        LDraA: _this.LDra.curry(A),

        LDmrCA: _this.LDmr.curry(A, C),

        LDrmAC: _this.LDrm.curry(C, A),

        LDSPHL: _this.LDr16rr.curry(H, L, SP),

        LDHLSPn: _this.LDrrr16n.curry(SP, H, L),

        PUSHBC: _this.PUSHrr.curry(B, C),
        PUSHDE: _this.PUSHrr.curry(D, E),
        PUSHHL: _this.PUSHrr.curry(H, L),
        PUSHAF: _this.PUSHrr.curry(A, F),

        POPBC: _this.POPrr.curry(B, C),
        POPDE: _this.POPrr.curry(D, E),
        POPHL: _this.POPrr.curry(H, L),
        POPAF: _this.POPrr.curry(A, F),

        ADDrrAA: _this.ADDrr.curry(A, A),
        ADDrrAB: _this.ADDrr.curry(A, B),
        ADDrrAC: _this.ADDrr.curry(A, C),
        ADDrrAD: _this.ADDrr.curry(A, D),
        ADDrrAE: _this.ADDrr.curry(A, E),
        ADDrrAH: _this.ADDrr.curry(A, H),
        ADDrrAL: _this.ADDrr.curry(A, L),
        ADDrmAHL: _this.ADDrmm.curry(H, L, A),

        ADCrrAA: _this.ADCrr.curry(A, A),
        ADCrrAB: _this.ADCrr.curry(A, B),
        ADCrrAC: _this.ADCrr.curry(A, C),
        ADCrrAD: _this.ADCrr.curry(A, D),
        ADCrrAE: _this.ADCrr.curry(A, E),
        ADCrrAH: _this.ADCrr.curry(A, H),
        ADCrrAL: _this.ADCrr.curry(A, L),
        ADCrmAHL: _this.ADCrmm.curry(H, L, A),

        ADDrrHLBC: _this.ADDrrrr.curry(H, L, B, C),
        ADDrrHLDE: _this.ADDrrrr.curry(H, L, D, E),
        ADDrrHLHL: _this.ADDrrrr.curry(H, L, H, L),
        ADDrrHLSP: _this.ADDrrrr.curry(H, L, SP),

        SUBrrA: _this.SUBrr.curry(A),
        SUBrrB: _this.SUBrr.curry(B),
        SUBrrC: _this.SUBrr.curry(C),
        SUBrrD: _this.SUBrr.curry(D),
        SUBrrE: _this.SUBrr.curry(E),
        SUBrrH: _this.SUBrr.curry(H),
        SUBrrL: _this.SUBrr.curry(L),
        SUBrmHL: _this.SUBrmm.curry(H, L),

        SBCrrA: _this.SBCrr.curry(A),
        SBCrrB: _this.SBCrr.curry(B),
        SBCrrC: _this.SBCrr.curry(C),
        SBCrrD: _this.SBCrr.curry(D),
        SBCrrE: _this.SBCrr.curry(E),
        SBCrrH: _this.SBCrr.curry(H),
        SBCrrL: _this.SBCrr.curry(L),
        SBCrmHL: _this.SBCrmm.curry(H, L),

        ANDrrA: _this.ANDrr.curry(A),
        ANDrrB: _this.ANDrr.curry(B),
        ANDrrC: _this.ANDrr.curry(C),
        ANDrrD: _this.ANDrr.curry(D),
        ANDrrE: _this.ANDrr.curry(E),
        ANDrrH: _this.ANDrr.curry(H),
        ANDrrL: _this.ANDrr.curry(L),
        ANDrmHL: _this.ANDrmm.curry(H, L),

        ORrrA: _this.ORrr.curry(A),
        ORrrB: _this.ORrr.curry(B),
        ORrrC: _this.ORrr.curry(C),
        ORrrD: _this.ORrr.curry(D),
        ORrrE: _this.ORrr.curry(E),
        ORrrH: _this.ORrr.curry(H),
        ORrrL: _this.ORrr.curry(L),
        ORrmHL: _this.ORrmm.curry(H, L),

        CPrrA: _this.CPrr.curry(A),
        CPrrB: _this.CPrr.curry(B),
        CPrrC: _this.CPrr.curry(C),
        CPrrD: _this.CPrr.curry(D),
        CPrrE: _this.CPrr.curry(E),
        CPrrH: _this.CPrr.curry(H),
        CPrrL: _this.CPrr.curry(L),
        CPrmHL: _this.CPrmm.curry(H, L),

        XORrrA: _this.XORrr.curry(A),
        XORrrB: _this.XORrr.curry(B),
        XORrrC: _this.XORrr.curry(C),
        XORrrD: _this.XORrr.curry(D),
        XORrrE: _this.XORrr.curry(E),
        XORrrH: _this.XORrr.curry(H),
        XORrrL: _this.XORrr.curry(L),
        XORrmHL: _this.XORrmm.curry(H, L),

        INCrrBC: _this.INCrr.curry(C, B),
        INCrrDE: _this.INCrr.curry(E, D),
        INCrrHL: _this.INCrr.curry(L, H),
        INCrrSP: _this.INCrr.curry(SP),

        INCrA: _this.INCr.curry(A),
        INCrB: _this.INCr.curry(B),
        INCrC: _this.INCr.curry(C),
        INCrD: _this.INCr.curry(D),
        INCrE: _this.INCr.curry(E),
        INCrH: _this.INCr.curry(H),
        INCrL: _this.INCr.curry(L),
        INCmHL: _this.INCmm.curry(H, L),

        DECrrBC: _this.DECrr.curry(C, B),
        DECrrDE: _this.DECrr.curry(E, D),
        DECrrHL: _this.DECrr.curry(L, H),
        DECrrSP: _this.DECrr.curry(SP),

        DECrA: _this.DECr.curry(A),
        DECrB: _this.DECr.curry(B),
        DECrC: _this.DECr.curry(C),
        DECrD: _this.DECr.curry(D),
        DECrE: _this.DECr.curry(E),
        DECrH: _this.DECr.curry(H),
        DECrL: _this.DECr.curry(L),
        DECmHL: _this.DECmm.curry(H, L),

    };

    CPU.prototype.NI = function(position) {
        console.log("Unimplemented instruction called: " + position.toString(16));
    };

    CPU.prototype.EMPTY = function(position) {
        console.log("Unmapped instruction called: " + position.toString(16));
    };

    CPU.prototype._insMap = [
        // position of the instructions corresponds to its memory address
        _this.NOP, _this._ins.LDnnBC, _this._ins.LDmrBCA, _this._ins.INCrrBC,
        _this._ins.INCrB, _this._ins.DECrB, _this._ins.LDnB, _this.NI,
        _this._ins.LDarSP, _this.NI, _this._ins.LDrmABC, _this._ins.DECrrBC,
        _this._ins.INCrC, _this._ins.DECrC, _this._ins.LDnC, _this.NI,

        _this.NI, _this._ins.LDnnDE, _this._ins.LDmrDEA, _this._ins.INCrrDE,
        _this._ins.INCrD, _this._ins.DECrD, _this._ins.LDnD, _this.NI,
        _this.NI, _this.NI, _this._ins.LDrmADE, _this._ins.DECrrDE,
        _this._ins.INCrE, _this._ins.DECrE, _this._ins.LDnE, _this.NI,

        _this.NI, _this._ins.LDnnHL, _this._ins.LDmrHLplusA, _this._ins.INCrrHL,
        _this._ins.INCrH, _this._ins.DECrH, _this._ins.LDnH, _this.NI,
        _this.NI, _this.NI, _this._ins.LDrmAHLplus, _this._ins.DECrrHL,
        _this._ins.INCrL, _this._ins.DECrL, _this._ins.LDnL, _this.NI,

        _this.NI, _this._ins.LDnnSP, _this._ins.LDmrHLminusA, _this._ins.INCrrSP,
        _this._ins.INCmHL, _this._ins.DECmHL, _this._ins.LDmnHL, _this.NI,
        _this.NI, _this.NI, _this._ins.LDrmAHLminus, _this._ins.DECrrSP,
        _this._ins.INCrA, _this._ins.DECrA, _this._ins.LDnA, _this.NI,

        _this._ins.LDrrBB, _this._ins.LDrrBC, _this._ins.LDrrBD, _this._ins.LDrrBE,
        _this._ins.LDrrBH, _this._ins.LDrrBL, _this._ins.LDrmBHL, _this._ins.LDrrBA,
        _this._ins.LDrrCB, _this._ins.LDrrCC, _this._ins.LDrrCD, _this._ins.LDrrCE,
        _this._ins.LDrrCH, _this._ins.LDrrCL, _this._ins.LDrmCHL, _this._ins.LDrrCA,

        _this._ins.LDrrDB, _this._ins.LDrrDC, _this._ins.LDrrDD, _this._ins.LDrrDE,
        _this._ins.LDrrDH, _this._ins.LDrrDL, _this._ins.LDrmDHL, _this._ins.LDrrDA,
        _this._ins.LDrrEB, _this._ins.LDrrEC, _this._ins.LDrrED, _this._ins.LDrrEE,
        _this._ins.LDrrEH, _this._ins.LDrrEL, _this._ins.LDrmEHL, _this._ins.LDrrEA,

        _this._ins.LDrrHB, _this._ins.LDrrHC, _this._ins.LDrrHD, _this._ins.LDrrHE,
        _this._ins.LDrrHH, _this._ins.LDrrHL, _this._ins.LDrmHHL, _this._ins.LDrrHA,
        _this._ins.LDrrLB, _this._ins.LDrrLC, _this._ins.LDrrLD, _this._ins.LDrrLE,
        _this._ins.LDrrLH, _this._ins.LDrrLL, _this._ins.LDrmLHL, _this._ins.LDrrLA,

        _this._ins.LDmrHLB, _this._ins.LDmrHLC, _this._ins.LDmrHLD, _this._ins.LDmrHLE,
        _this._ins.LDmrHLH, _this._ins.LDmrHLL, _this.HALT, _this._ins.LDmrHLA,
        _this._ins.LDrrAB, _this._ins.LDrrAC, _this._ins.LDrrAD, _this._ins.LDrrAE,
        _this._ins.LDrrAH, _this._ins.LDrrAL, _this._ins.LDrmAHL, _this._ins.LDrrAA,

        _this._ins.ADDrrAB, _this._ins.ADDrrAC, _this._ins.ADDrrAD, _this._ins.ADDrrAE,
        _this._ins.ADDrrAH, _this._ins.ADDrrAL, _this._ins.ADDrmAHL, _this._ins.ADDrrAA,
        _this._ins.ADCrrAB, _this._ins.ADCrrAC, _this._ins.ADCrrAD, _this._ins.ADCrrAE,
        _this._ins.ADCrrAH, _this._ins.ADCrrAL, _this._ins.ADCrmAHL, _this._ins.ADCrrAA,

        _this._ins.SUBrrB, _this._ins.SUBrrC, _this._ins.SUBrrD, _this._ins.SUBrrE,
        _this._ins.SUBrrH, _this._ins.SUBrrL, _this._ins.SUBrmHL, _this._ins.SUBrrA,
        _this._ins.SBCrrB, _this._ins.SBCrrC, _this._ins.SBCrrD, _this._ins.SBCrrE,
        _this._ins.SBCrrH, _this._ins.SBCrrL, _this._ins.SBCrmHL, _this._ins.SBCrrA,

        _this._ins.ANDrrB, _this._ins.ANDrrC, _this._ins.ANDrrD, _this._ins.ANDrrE,
        _this._ins.ANDrrH, _this._ins.ANDrrL, _this.ANDrmHL, _this._ins.ANDrrA,
        _this._ins.XORrrB, _this._ins.XORrrC, _this._ins.XORrrD, _this._ins.XORrrE,
        _this._ins.XORrrH, _this._ins.XORrrL, _this._ins.XORrmHL, _this._ins.XORrrA,

        _this._ins.ORrrB, _this._ins.ORrrC, _this._ins.ORrrD, _this._ins.ORrrE,
        _this._ins.ORrrH, _this._ins.ORrrL, _this._ins.ORrmHL, _this._ins.ORrrA,
        _this._ins.CPrrB, _this._ins.CPrrC, _this._ins.CPrrD, _this._ins.CPrrE,
        _this._ins.CPrrH, _this._ins.CPrrL, _this._ins.CPrmHL, _this._ins.CPrrA,

        _this.NI, _this._ins.POPBC, _this.NI, _this.NI,
        _this.NI, _this._ins.PUSHBC, _this.NI, _this.NI,
        _this.NI, _this.NI, _this.NI, _this.NI,
        _this.NI, _this.NI, _this.NI, _this.NI,

        _this.NI, _this._ins.POPDE, _this.NI, _this.EMPTY,
        _this.NI, _this._ins.PUSHDE, _this.NI, _this.NI,
        _this.NI, _this.NI, _this.NI, _this.EMPTY,
        _this.NI, _this.EMPTY, _this.NI, _this.NI,

        _this._ins.LDarA, _this._ins.POPHL, _this._ins.LDmrCA, _this.EMPTY,
        _this.EMPTY, _this._ins.PUSHHL, _this.NI, _this.NI,
        _this.NI, _this.NI, _this._ins.LDaarA, _this.EMPTY,
        _this.EMPTY, _this.EMPTY, _this.NI, _this.NI,

        _this._ins.LDraA, _this._ins.POPAF, _this._ins.LDrmAC, _this.NI,
        _this.EMPTY, _this._ins.PUSHAF, _this.NI, _this.NI,
        _this._ins.LDHLSPn, _this._ins.LDSPHL, _this._ins.LDraaA, _this.NI,
        _this.EMPTY, _this.EMPTY, _this.NI, _this.NI
    ];

    return new CPU();
});
