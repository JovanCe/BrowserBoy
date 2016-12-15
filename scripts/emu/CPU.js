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
    var ZERO = "ZERO";
    var SUBTRACT = "SUBTRACT";
    var HALF_CARRY = "HALF_CARRY";
    var CARRY = "CARRY";

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
        this._flags = {
            ZERO: 0x80,
            SUBTRACT: 0x40,
            HALF_CARRY: 0x20,
            CARRY: 0x10
        };

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
        this._reg.SP = 0xFFFE;
        this._clock.M = 0;
        this._clock.T = 0;
        this._halt = false;
        this._stop = true;
    };

    CPU.prototype._getFlag = function(flag) {
        return (this._reg.F & this._flags[flag]) > 0 ? 1:0;
    };
    CPU.prototype._setFlag = function(flag, value) {
        if(value) {
            this._reg.F |= this._flags[flag];
        }
        else {
            this._reg.F &= this._flags[flag] ^ 0xFF;
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
              this._instructions[instruction].call(this, instruction);
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

    CPU.prototype._PUSHrr = function(reg1, reg2) {
        this._reg.SP--;
        MM.writeByte(this._reg.SP--, this._reg[reg1]);
        MM.writeByte(this._reg.SP, this._reg[reg2]);
        this._step(1, 16);
    };

    CPU.prototype._PUSHr16 = function(reg) {
        this._reg.SP -= 2;
        MM.writeWord(this._reg.SP, this._reg[reg]);

        // there's no step intentionally. This is a helper function used in jump instructions and the like.
    };

    CPU.prototype._POPrr = function(reg1, reg2) {
        this._reg[reg2] = MM.readByte(this._reg.SP++);
        this._reg[reg1] = MM.readByte(this._reg.SP++);
        this._step(1, 12);
    };

    CPU.prototype._POPr16 = function(reg) {
        this._reg[reg] = MM.readWord(this._reg.SP);
        this._reg.SP += 2;

        // there's no step intentionally. This is a helper function used in jump instructions and the like.
    };

    CPU.prototype._LDr = function(src, dest) {
        this._reg[dest] = this._reg[src];
        this._step(1);
    };

    CPU.prototype._LDrn = function(reg) {
        this._reg[reg] = MM.readByte(this._reg.PC++);
        this._step(2);
    };

    CPU.prototype._LDrn16 = function(reg1, reg2) {
        this._reg[reg1] = MM.readByte(this._reg.PC++);
        this._reg[reg2] = MM.readByte(this._reg.PC++);
        this._step(3);
    };

    CPU.prototype._LDr16n16 = function(reg) {
        this._reg[reg] = MM.readWord(this._reg.PC);
        this._reg.PC+=2;
        this._step(3);
    };

    CPU.prototype._LDrmm = function(src1, src2, dest, offset) {
        if(!offset) {
            offset = 0;
        }
        this._reg[dest] = MM.readByte((this._reg[src1] << 8) + this._reg[src2] + offset);
        this._step(1,8);
    };

    CPU.prototype._LDmmr = function(src, dest1, dest2, offset) {
        if(!offset) {
            offset = 0;
        }
        MM.writeByte((this._reg[dest1] << 8) + this._reg[dest2] + offset, this._reg[src]);
        this._step(1,8);
    };

    CPU.prototype._LDmn = function(dest1, dest2) {
        MM.writeByte((this._reg[dest1] << 8) + this._reg[dest2], MM.readByte(this._reg.PC++));
        this._step(2, 12);
    };

    CPU.prototype._LDa16r = function(reg) {
        MM.writeByte(MM.readWord(this._reg[PC]), this._reg[reg]);
        this._reg.PC += 2;
        this._step(3, 16);
    };

    CPU.prototype._LDa16r16 = function(reg) {
        MM.writeWord(MM.readWord(this._reg[PC]), this._reg[reg]);
        this._reg.PC += 2;
        this._step(3, 20);
    };

    CPU.prototype._LDra16 = function(reg) {
        this._reg[reg] = MM.readByte(MM.readWord(this._reg[PC]));
        this._reg.PC += 2;
        this._step(3, 16);
    };

    CPU.prototype._LDar = function(reg) {
        MM.writeByte(0xFF00 + MM.readByte(this._reg.PC++), this._reg[reg]);
        this._step(2, 12);
    };

    CPU.prototype._LDra = function(reg) {
        this._reg[reg] = MM.readByte(0xFF00 + MM.readByte(this._reg.PC++));
        this._step(2, 12);
    };

    CPU.prototype._LDmr = function(src, destAddr) {
        MM.writeByte(0xFF00 + this._reg[destAddr], this._reg[src]);
        this._step(2, 8);
    };

    CPU.prototype._LDrm = function(srcAddr, dest) {
        this._reg[dest] = MM.readByte(0xFF00 + this._reg[srcAddr]);
        this._step(2, 8);
    };

    CPU.prototype._LDr16rr = function(src1, src2, dest) {
        this._reg[dest] = (this._reg[src1] << 8) + this._reg[src2];
        this._step(1, 8);
    };

    CPU.prototype._LDrrr16n = function(src, dest1, dest2) {
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
        this._setFlag(CARRY, value > 0xFFFF);
        this._setFlag(HALF_CARRY, (this._reg.SP & 0xF)  + (offset & 0xF) > 0xF);

        this._step(2, 12);
    };

    CPU.prototype._performADD = function(val1, val2, useCarry, word) {
        var result = val1 + val2;
        var halfCarryTest = (val1 & 0xF) + (val2 & 0xF);
        if(useCarry) {
            var carry = this._getFlag(CARRY);
            result += carry;
            halfCarryTest += carry & 0xF;
        }
        this._reg.F = 0;
        this._setFlag(ZERO, result == 0);
        this._setFlag(SUBTRACT, false);
        this._setFlag(HALF_CARRY, halfCarryTest > 0xF);
        this._setFlag(CARRY, result > 0xFF);
        if(!word) {
            result &= 0xFF;
        }
        return result;
    };

    CPU.prototype._ADDrr = function(reg1, reg2, useCarry) {
        this._reg[reg1] = this._performADD(this._reg[reg1], this._reg[reg2], useCarry);
        this._step(1);
    };

    CPU.prototype._ADDrmm = function(src1, src2, dest, useCarry) {
        var toAdd = MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        this._reg[dest] = this._performADD(this._reg[dest], toAdd, useCarry);
        this._step(1, 8);
    };

    CPU.prototype._ADDrrrr = function(dest1, dest2, src1, src2) {
        var toAdd;
        if(src2) {
            toAdd = (this._reg[src1] << 8) + this._reg[src2];
        }
        else {
            toAdd = this._reg[src1];
        }
        var zero = this._getFlag(ZERO);
        var result = this._performADD((this._reg[dest1] << 8) + this._reg[dest2], toAdd, false, true);
        this._setFlag(ZERO, zero == 0);
        this._reg[dest1] = (result >> 8) & 0xFF;
        this._reg[dest2] = result & 0xFF;
        this._step(1, 8);
    };

    CPU.prototype._ADDrn = function(reg, useCarry) {
        var toAdd = MM.readByte(this._reg.PC++);
        this._reg.A = this._performADD(this._reg.A, toAdd, useCarry);
        this._step(2);
    };

    CPU.prototype._ADDr16n = function(reg) {
        var offset = MM.readByte(this._reg.PC++);
        // the offset is signed, need to convert it from 2-complement representation
        if (offset > 127) {
            offset = -((~offset + 1) & 255);
        }
        var value = this._reg[reg] + offset;

        // set flags
        this._reg.F = 0;
        this._setFlag(CARRY, value > 0xFFFF);
        this._setFlag(HALF_CARRY, (this._reg[reg] & 0xF)  + (offset & 0xF) > 0xF);
        this._reg[reg] = value;
        this._step(2, 16);
    };

    CPU.prototype._performSUB = function(val1, val2, useCarry) {
        var result = val1 - val2;
        var halfCarryTest = (val1 & 0xF) - (val2 & 0xF);
        if(useCarry) {
            var carry = this._getFlag(CARRY);
            result -= carry;
            halfCarryTest -= carry & 0xF;
        }
        this._reg.F = 0;
        this._setFlag(ZERO, result == 0);
        this._setFlag(SUBTRACT, true);
        this._setFlag(HALF_CARRY, halfCarryTest < 0);
        this._setFlag(CARRY, result < 0);

        return result & 0xFF;
    };

    CPU.prototype._SUBrr = function(reg, useCarry) {
        this._reg.A = this._performSUB(this._reg.A, this._reg[reg], useCarry);
        this._step(1);
    };

    CPU.prototype._SUBrmm = function(src1, src2, useCarry) {
        var toSubtract = MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        this._reg.A = this._performSUB(this._reg.A, toSubtract, useCarry);
        this._step(1, 8);
    };

    CPU.prototype._SUBrn = function(useCarry) {
        var toSubtract = MM.readByte(this._reg.PC++);
        this._reg.A = this._performSUB(this._reg.A, toSubtract, useCarry);
        this._step(2);
    };

    CPU.prototype._performAND = function(val1, val2) {
        var result = val1 & val2;
        this._reg.F = 0;
        this._setFlag(ZERO, result == 0);
        this._setFlag(SUBTRACT, false);
        this._setFlag(HALF_CARRY, true);
        this._setFlag(CARRY, false);
        return result;
    };

    CPU.prototype._ANDrr = function(reg) {
        this._reg.A = this._performAND(this._reg.A, this._reg[reg]);
        this._step(1);
    };

    CPU.prototype._ANDrmm = function(src1, src2) {
        this._reg.A = this._performAND(this._reg.A, MM.readByte((this._reg[src1] << 8) + this._reg[src2]));
        this._step(1, 8);
    };

    CPU.prototype._ANDrn = function() {
        this._reg.A = this._performAND(this._reg.A, MM.readByte(this._reg.PC++));
        this._step(2);
    };

    CPU.prototype._performXOR = function(val1, val2) {
        var result = val1 ^ val2;
        this._reg.F = 0;
        this._setFlag(ZERO, result == 0);
        this._setFlag(SUBTRACT, false);
        this._setFlag(HALF_CARRY, false);
        this._setFlag(CARRY, false);
        return result;
    };

    CPU.prototype._XORrr = function(reg) {
        this._reg.A = this._performXOR(this._reg.A, this._reg[reg]);
        this._step(1);
    };

    CPU.prototype._XORrmm = function(src1, src2) {
        this._reg.A = this._performXOR(this._reg.A, MM.readByte((this._reg[src1] << 8) + this._reg[src2]));
        this._step(1, 8);
    };

    CPU.prototype._XORrn = function() {
        this._reg.A = this._performXOR(this._reg.A, MM.readByte(this._reg.PC++));
        this._step(2);
    };

    CPU.prototype._performOR = function(val1, val2) {
        var result = val1 | val2;
        this._reg.F = 0;
        this._setFlag(ZERO, this._reg.A == 0);
        this._setFlag(SUBTRACT, false);
        this._setFlag(HALF_CARRY, false);
        this._setFlag(CARRY, false);
        return result;
    };

    CPU.prototype._ORrr = function(reg) {
        this._reg.A = this._performOR(this._reg.A, this._reg[reg]);
        this._step(1);
    };

    CPU.prototype._ORrmm = function(src1, src2) {
        this._reg.A = this._performOR(this._reg.A, MM.readByte((this._reg[src1] << 8) + this._reg[src2]));
        this._step(1, 8);
    };

    CPU.prototype._ORrn = function() {
        this._reg.A = this._performOR(this._reg.A, MM.readByte(this._reg.PC++));
        this._step(2);
    };

    CPU.prototype._CPrr = function(reg) {
        this._performSUB(this._reg.A, this._reg[reg]);
        this._step(1);
    };

    CPU.prototype._CPrmm = function(src1, src2) {
        var toCompare = MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        this._performSUB(this._reg.A, toCompare);
        this._step(1, 8);
    };

    CPU.prototype._CPrn = function() {
        var toCompare = MM.readByte(this._reg.PC++);
        this._performSUB(this._reg.A, toCompare);
        this._step(2);
    };

    CPU.prototype._INCr = function(reg) {
        this._reg[reg]++;
        this._reg[reg] &= 0xFF;
        this._setFlag(ZERO, this._reg[reg] == 0);
        this._setFlag(SUBTRACT, false);
        this._setFlag(HALF_CARRY, (this._reg[reg] & 0xF) + (1 & 0xF) > 0xF);
        this._step(1);
    };
    CPU.prototype._INCmm = function(src1, src2) {
        var value = MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        value++;
        value &= 0xFF;
        MM.writeByte((this._reg[src1] << 8) + this._reg[src2], value);
        this._setFlag(ZERO, value == 0);
        this._setFlag(SUBTRACT, false);
        this._setFlag(HALF_CARRY, (value & 0xF) + (1 & 0xF) > 0xF);
        this._step(1, 12);
    };
    CPU.prototype._INCrr = function(reg1, reg2) {
        this._reg[reg1]++;
        this._reg[reg1] &= 0xFF;
        if(reg2 && this._reg[reg1] == 0) {
            this._reg[reg2]++;
            this._reg[reg2] &= 0xFF;
        }
        this._step(1, 8);
    };
    CPU.prototype._DECr = function(reg) {
        this._reg[reg]--;
        this._reg[reg] &= 0xFF;
        this._setFlag(ZERO, this._reg[reg] == 0);
        this._setFlag(SUBTRACT, true);
        this._setFlag(HALF_CARRY, (this._reg[reg] & 0xF) - (1 & 0xF) < 0);
        this._step(1);
    };
    CPU.prototype._DECmm = function(src1, src2) {
        var value = MM.readByte((this._reg[src1] << 8) + this._reg[src2]);
        value--;
        value &= 0xFF;
        MM.writeByte((this._reg[src1] << 8) + this._reg[src2], value);
        this._setFlag(ZERO, value == 0);
        this._setFlag(SUBTRACT, true);
        this._setFlag(HALF_CARRY, (value & 0xF) - (1 & 0xF) < 0);
        this._step(1, 12);
    };
    CPU.prototype._DECrr = function(reg1, reg2) {
        this._reg[reg1]--;
        this._reg[reg1] &= 0xFF;
        if(reg2 && this._reg[reg1] == 0xFF) {
            this._reg[reg2]--;
            this._reg[reg2] &= 0xFF;
        }
        this._step(1, 8);
    };

    CPU.prototype._RST = function(address) {
        this._PUSHr16(PC);
        this._reg.PC = address;
        this._step(1, 16);
    };

    CPU.prototype._JPnn = function(flag, invert) {
        var test = invert ? 0 : 1;
        if(flag !== undefined) {
            if(!(this._getFlag(flag) == test)) {
                this._reg.PC += 2;
                this._step(3);
                return
            }
        }
        this._reg.PC = MM.readWord(this._reg.PC);
        this._step(3, 16);
    };

    CPU.prototype._JPmm = function(reg1, reg2) {
        this._reg.PC = (this._reg[reg1] << 8) + this._reg[reg2];
        this._step(1);
    };

    // concrete instructions
    CPU.prototype.LDrrAA =  CPU.prototype._LDr.curry(A, A);
    CPU.prototype.LDrrAB =  CPU.prototype._LDr.curry(B, A);
    CPU.prototype.LDrrAC =  CPU.prototype._LDr.curry(C, A);
    CPU.prototype.LDrrAD =  CPU.prototype._LDr.curry(D, A);
    CPU.prototype.LDrrAE =  CPU.prototype._LDr.curry(E, A);
    CPU.prototype.LDrrAH =  CPU.prototype._LDr.curry(H, A);
    CPU.prototype.LDrrAL =  CPU.prototype._LDr.curry(L, A);
    CPU.prototype.LDrrBA =  CPU.prototype._LDr.curry(A, B);
    CPU.prototype.LDrrBB =  CPU.prototype._LDr.curry(B, B);
    CPU.prototype.LDrrBC =  CPU.prototype._LDr.curry(C, B);
    CPU.prototype.LDrrBD =  CPU.prototype._LDr.curry(D, B);
    CPU.prototype.LDrrBE =  CPU.prototype._LDr.curry(E, B);
    CPU.prototype.LDrrBH =  CPU.prototype._LDr.curry(H, B);
    CPU.prototype.LDrrBL =  CPU.prototype._LDr.curry(L, B);
    CPU.prototype.LDrrCA =  CPU.prototype._LDr.curry(A, C);
    CPU.prototype.LDrrCB =  CPU.prototype._LDr.curry(B, C);
    CPU.prototype.LDrrCC =  CPU.prototype._LDr.curry(C, C);
    CPU.prototype.LDrrCD =  CPU.prototype._LDr.curry(D, C);
    CPU.prototype.LDrrCE =  CPU.prototype._LDr.curry(E, C);
    CPU.prototype.LDrrCH =  CPU.prototype._LDr.curry(H, C);
    CPU.prototype.LDrrCL =  CPU.prototype._LDr.curry(L, C);
    CPU.prototype.LDrrDA =  CPU.prototype._LDr.curry(A, D);
    CPU.prototype.LDrrDB =  CPU.prototype._LDr.curry(B, D);
    CPU.prototype.LDrrDC =  CPU.prototype._LDr.curry(C, D);
    CPU.prototype.LDrrDD =  CPU.prototype._LDr.curry(D, D);
    CPU.prototype.LDrrDE =  CPU.prototype._LDr.curry(E, D);
    CPU.prototype.LDrrDH =  CPU.prototype._LDr.curry(H, D);
    CPU.prototype.LDrrDL =  CPU.prototype._LDr.curry(L, D);
    CPU.prototype.LDrrEA =  CPU.prototype._LDr.curry(A, E);
    CPU.prototype.LDrrEB =  CPU.prototype._LDr.curry(B, E);
    CPU.prototype.LDrrEC =  CPU.prototype._LDr.curry(C, E);
    CPU.prototype.LDrrED =  CPU.prototype._LDr.curry(D, E);
    CPU.prototype.LDrrEE =  CPU.prototype._LDr.curry(E, E);
    CPU.prototype.LDrrEH =  CPU.prototype._LDr.curry(H, E);
    CPU.prototype.LDrrEL =  CPU.prototype._LDr.curry(L, E);
    CPU.prototype.LDrrHA =  CPU.prototype._LDr.curry(A, H);
    CPU.prototype.LDrrHB =  CPU.prototype._LDr.curry(B, H);
    CPU.prototype.LDrrHC =  CPU.prototype._LDr.curry(C, H);
    CPU.prototype.LDrrHD =  CPU.prototype._LDr.curry(D, H);
    CPU.prototype.LDrrHE =  CPU.prototype._LDr.curry(E, H);
    CPU.prototype.LDrrHH =  CPU.prototype._LDr.curry(H, H);
    CPU.prototype.LDrrHL =  CPU.prototype._LDr.curry(L, H);
    CPU.prototype.LDrrLA =  CPU.prototype._LDr.curry(A, L);
    CPU.prototype.LDrrLB =  CPU.prototype._LDr.curry(B, L);
    CPU.prototype.LDrrLC =  CPU.prototype._LDr.curry(C, L);
    CPU.prototype.LDrrLD =  CPU.prototype._LDr.curry(D, L);
    CPU.prototype.LDrrLE =  CPU.prototype._LDr.curry(E, L);
    CPU.prototype.LDrrLH =  CPU.prototype._LDr.curry(H, L);
    CPU.prototype.LDrrLL =  CPU.prototype._LDr.curry(L, L);

    CPU.prototype.LDnA =  CPU.prototype._LDrn.curry(A);
    CPU.prototype.LDnB =  CPU.prototype._LDrn.curry(B);
    CPU.prototype.LDnC =  CPU.prototype._LDrn.curry(C);
    CPU.prototype.LDnD =  CPU.prototype._LDrn.curry(D);
    CPU.prototype.LDnE =  CPU.prototype._LDrn.curry(E);
    CPU.prototype.LDnH =  CPU.prototype._LDrn.curry(H);
    CPU.prototype.LDnL =  CPU.prototype._LDrn.curry(L);

    CPU.prototype.LDnnBC =  CPU.prototype._LDrn16.curry(B, C);
    CPU.prototype.LDnnDE =  CPU.prototype._LDrn16.curry(D, E);
    CPU.prototype.LDnnHL =  CPU.prototype._LDrn16.curry(H, L);
    CPU.prototype.LDnnSP =  CPU.prototype._LDr16n16.curry(SP);

    CPU.prototype.LDrmAHL =  CPU.prototype._LDrmm.curry(H, L, A);
    CPU.prototype.LDrmAHLplus =  CPU.prototype._LDrmm.curry(H, L, A, 1);
    CPU.prototype.LDrmAHLminus =  CPU.prototype._LDrmm.curry(H, L, A, -1);
    CPU.prototype.LDrmBHL =  CPU.prototype._LDrmm.curry(H, L, B);
    CPU.prototype.LDrmCHL =  CPU.prototype._LDrmm.curry(H, L, C);
    CPU.prototype.LDrmDHL =  CPU.prototype._LDrmm.curry(H, L, D);
    CPU.prototype.LDrmEHL =  CPU.prototype._LDrmm.curry(H, L, E);
    CPU.prototype.LDrmHHL =  CPU.prototype._LDrmm.curry(H, L, H);
    CPU.prototype.LDrmLHL =  CPU.prototype._LDrmm.curry(H, L, L);
    CPU.prototype.LDrmABC =  CPU.prototype._LDrmm.curry(B, C, A);
    CPU.prototype.LDrmADE =  CPU.prototype._LDrmm.curry(D, E, A);

    CPU.prototype.LDmrHLA =  CPU.prototype._LDmmr.curry(A, H, L);
    CPU.prototype.LDmrHLplusA =  CPU.prototype._LDmmr.curry(A, H, L, 1);
    CPU.prototype.LDmrHLminusA =  CPU.prototype._LDmmr.curry(A, H, L, -1);
    CPU.prototype.LDmrHLB =  CPU.prototype._LDmmr.curry(B, H, L);
    CPU.prototype.LDmrHLC =  CPU.prototype._LDmmr.curry(C, H, L);
    CPU.prototype.LDmrHLD =  CPU.prototype._LDmmr.curry(D, H, L);
    CPU.prototype.LDmrHLE =  CPU.prototype._LDmmr.curry(E, H, L);
    CPU.prototype.LDmrHLH =  CPU.prototype._LDmmr.curry(H, H, L);
    CPU.prototype.LDmrHLL =  CPU.prototype._LDmmr.curry(L, H, L);
    CPU.prototype.LDmrBCA =  CPU.prototype._LDmmr.curry(A, B, C);
    CPU.prototype.LDmrDEA =  CPU.prototype._LDmmr.curry(A, D, E);

    CPU.prototype.LDmnHL =  CPU.prototype._LDmn.curry(H, L);

    CPU.prototype.LDarSP =  CPU.prototype._LDa16r16.curry(SP);

    CPU.prototype.LDaarA =  CPU.prototype._LDa16r.curry(A);

    CPU.prototype.LDraaA =  CPU.prototype._LDra16.curry(A);

    CPU.prototype.LDarA =  CPU.prototype._LDar.curry(A);

    CPU.prototype.LDraA =  CPU.prototype._LDra.curry(A);

    CPU.prototype.LDmrCA =  CPU.prototype._LDmr.curry(A, C);

    CPU.prototype.LDrmAC =  CPU.prototype._LDrm.curry(C, A);

    CPU.prototype.LDSPHL =  CPU.prototype._LDr16rr.curry(H, L, SP);

    CPU.prototype.LDHLSPn =  CPU.prototype._LDrrr16n.curry(SP, H, L);

    CPU.prototype.PUSHBC =  CPU.prototype._PUSHrr.curry(B, C);
    CPU.prototype.PUSHDE =  CPU.prototype._PUSHrr.curry(D, E);
    CPU.prototype.PUSHHL =  CPU.prototype._PUSHrr.curry(H, L);
    CPU.prototype.PUSHAF =  CPU.prototype._PUSHrr.curry(A, F);

    CPU.prototype.POPBC =  CPU.prototype._POPrr.curry(B, C);
    CPU.prototype.POPDE =  CPU.prototype._POPrr.curry(D, E);
    CPU.prototype.POPHL =  CPU.prototype._POPrr.curry(H, L);
    CPU.prototype.POPAF =  CPU.prototype._POPrr.curry(A, F);

    CPU.prototype.ADDrrAA =  CPU.prototype._ADDrr.curry(A, A);
    CPU.prototype.ADDrrAB =  CPU.prototype._ADDrr.curry(A, B);
    CPU.prototype.ADDrrAC =  CPU.prototype._ADDrr.curry(A, C);
    CPU.prototype.ADDrrAD =  CPU.prototype._ADDrr.curry(A, D);
    CPU.prototype.ADDrrAE =  CPU.prototype._ADDrr.curry(A, E);
    CPU.prototype.ADDrrAH =  CPU.prototype._ADDrr.curry(A, H);
    CPU.prototype.ADDrrAL =  CPU.prototype._ADDrr.curry(A, L);
    CPU.prototype.ADDrmAHL =  CPU.prototype._ADDrmm.curry(H, L, A);
    CPU.prototype.ADDrnA = CPU.prototype._ADDrn.curry(A);

    CPU.prototype.ADCrrAA =  CPU.prototype._ADDrr.curry(A, A, true);
    CPU.prototype.ADCrrAB =  CPU.prototype._ADDrr.curry(A, B, true);
    CPU.prototype.ADCrrAC =  CPU.prototype._ADDrr.curry(A, C, true);
    CPU.prototype.ADCrrAD =  CPU.prototype._ADDrr.curry(A, D, true);
    CPU.prototype.ADCrrAE =  CPU.prototype._ADDrr.curry(A, E, true);
    CPU.prototype.ADCrrAH =  CPU.prototype._ADDrr.curry(A, H, true);
    CPU.prototype.ADCrrAL =  CPU.prototype._ADDrr.curry(A, L, true);
    CPU.prototype.ADCrmAHL =  CPU.prototype._ADDrmm.curry(H, L, A, true);
    CPU.prototype.ADCrnA = CPU.prototype._ADDrn.curry(A, true);

    CPU.prototype.ADDrrHLBC =  CPU.prototype._ADDrrrr.curry(H, L, B, C);
    CPU.prototype.ADDrrHLDE =  CPU.prototype._ADDrrrr.curry(H, L, D, E);
    CPU.prototype.ADDrrHLHL =  CPU.prototype._ADDrrrr.curry(H, L, H, L);
    CPU.prototype.ADDrrHLSP =  CPU.prototype._ADDrrrr.curry(H, L, SP);

    CPU.prototype.ADDSPn = CPU.prototype._ADDr16n.curry(SP);

    CPU.prototype.SUBrrA =  CPU.prototype._SUBrr.curry(A);
    CPU.prototype.SUBrrB =  CPU.prototype._SUBrr.curry(B);
    CPU.prototype.SUBrrC =  CPU.prototype._SUBrr.curry(C);
    CPU.prototype.SUBrrD =  CPU.prototype._SUBrr.curry(D);
    CPU.prototype.SUBrrE =  CPU.prototype._SUBrr.curry(E);
    CPU.prototype.SUBrrH =  CPU.prototype._SUBrr.curry(H);
    CPU.prototype.SUBrrL =  CPU.prototype._SUBrr.curry(L);
    CPU.prototype.SUBrmHL =  CPU.prototype._SUBrmm.curry(H, L);
    CPU.prototype.SUBrnA = CPU.prototype._SUBrn;

    CPU.prototype.SBCrrA =  CPU.prototype._SUBrr.curry(A, true);
    CPU.prototype.SBCrrB =  CPU.prototype._SUBrr.curry(B, true);
    CPU.prototype.SBCrrC =  CPU.prototype._SUBrr.curry(C, true);
    CPU.prototype.SBCrrD =  CPU.prototype._SUBrr.curry(D, true);
    CPU.prototype.SBCrrE =  CPU.prototype._SUBrr.curry(E, true);
    CPU.prototype.SBCrrH =  CPU.prototype._SUBrr.curry(H, true);
    CPU.prototype.SBCrrL =  CPU.prototype._SUBrr.curry(L, true);
    CPU.prototype.SBCrmHL =  CPU.prototype._SUBrmm.curry(H, L, true);
    CPU.prototype.SBCrnA = CPU.prototype._SUBrn.curry(true);

    CPU.prototype.ANDrrA =  CPU.prototype._ANDrr.curry(A);
    CPU.prototype.ANDrrB =  CPU.prototype._ANDrr.curry(B);
    CPU.prototype.ANDrrC =  CPU.prototype._ANDrr.curry(C);
    CPU.prototype.ANDrrD =  CPU.prototype._ANDrr.curry(D);
    CPU.prototype.ANDrrE =  CPU.prototype._ANDrr.curry(E);
    CPU.prototype.ANDrrH =  CPU.prototype._ANDrr.curry(H);
    CPU.prototype.ANDrrL =  CPU.prototype._ANDrr.curry(L);
    CPU.prototype.ANDrmHL =  CPU.prototype._ANDrmm.curry(H, L);
    CPU.prototype.ANDrnA = CPU.prototype._ANDrn;

    CPU.prototype.ORrrA =  CPU.prototype._ORrr.curry(A);
    CPU.prototype.ORrrB =  CPU.prototype._ORrr.curry(B);
    CPU.prototype.ORrrC =  CPU.prototype._ORrr.curry(C);
    CPU.prototype.ORrrD =  CPU.prototype._ORrr.curry(D);
    CPU.prototype.ORrrE =  CPU.prototype._ORrr.curry(E);
    CPU.prototype.ORrrH =  CPU.prototype._ORrr.curry(H);
    CPU.prototype.ORrrL =  CPU.prototype._ORrr.curry(L);
    CPU.prototype.ORrmHL =  CPU.prototype._ORrmm.curry(H, L);
    CPU.prototype.ORrnA = CPU.prototype._ORrn;

    CPU.prototype.CPrrA =  CPU.prototype._CPrr.curry(A);
    CPU.prototype.CPrrB =  CPU.prototype._CPrr.curry(B);
    CPU.prototype.CPrrC =  CPU.prototype._CPrr.curry(C);
    CPU.prototype.CPrrD =  CPU.prototype._CPrr.curry(D);
    CPU.prototype.CPrrE =  CPU.prototype._CPrr.curry(E);
    CPU.prototype.CPrrH =  CPU.prototype._CPrr.curry(H);
    CPU.prototype.CPrrL =  CPU.prototype._CPrr.curry(L);
    CPU.prototype.CPrmHL =  CPU.prototype._CPrmm.curry(H, L);
    CPU.prototype.CPrnA = CPU.prototype._CPrn;

    CPU.prototype.XORrrA =  CPU.prototype._XORrr.curry(A);
    CPU.prototype.XORrrB =  CPU.prototype._XORrr.curry(B);
    CPU.prototype.XORrrC =  CPU.prototype._XORrr.curry(C);
    CPU.prototype.XORrrD =  CPU.prototype._XORrr.curry(D);
    CPU.prototype.XORrrE =  CPU.prototype._XORrr.curry(E);
    CPU.prototype.XORrrH =  CPU.prototype._XORrr.curry(H);
    CPU.prototype.XORrrL =  CPU.prototype._XORrr.curry(L);
    CPU.prototype.XORrmHL =  CPU.prototype._XORrmm.curry(H, L);
    CPU.prototype.XORrnA = CPU.prototype._XORrn;

    CPU.prototype.INCrrBC =  CPU.prototype._INCrr.curry(C, B);
    CPU.prototype.INCrrDE =  CPU.prototype._INCrr.curry(E, D);
    CPU.prototype.INCrrHL =  CPU.prototype._INCrr.curry(L, H);
    CPU.prototype.INCrrSP =  CPU.prototype._INCrr.curry(SP);

    CPU.prototype.INCrA =  CPU.prototype._INCr.curry(A);
    CPU.prototype.INCrB =  CPU.prototype._INCr.curry(B);
    CPU.prototype.INCrC =  CPU.prototype._INCr.curry(C);
    CPU.prototype.INCrD =  CPU.prototype._INCr.curry(D);
    CPU.prototype.INCrE =  CPU.prototype._INCr.curry(E);
    CPU.prototype.INCrH =  CPU.prototype._INCr.curry(H);
    CPU.prototype.INCrL =  CPU.prototype._INCr.curry(L);
    CPU.prototype.INCmHL =  CPU.prototype._INCmm.curry(H, L);

    CPU.prototype.DECrrBC =  CPU.prototype._DECrr.curry(C, B);
    CPU.prototype.DECrrDE =  CPU.prototype._DECrr.curry(E, D);
    CPU.prototype.DECrrHL =  CPU.prototype._DECrr.curry(L, H);
    CPU.prototype.DECrrSP =  CPU.prototype._DECrr.curry(SP);

    CPU.prototype.DECrA =  CPU.prototype._DECr.curry(A);
    CPU.prototype.DECrB =  CPU.prototype._DECr.curry(B);
    CPU.prototype.DECrC =  CPU.prototype._DECr.curry(C);
    CPU.prototype.DECrD =  CPU.prototype._DECr.curry(D);
    CPU.prototype.DECrE =  CPU.prototype._DECr.curry(E);
    CPU.prototype.DECrH =  CPU.prototype._DECr.curry(H);
    CPU.prototype.DECrL =  CPU.prototype._DECr.curry(L);
    CPU.prototype.DECmHL =  CPU.prototype._DECmm.curry(H, L);

    CPU.prototype.RST00 = CPU.prototype._RST.curry(0);
    CPU.prototype.RST08 = CPU.prototype._RST.curry(0x8);
    CPU.prototype.RST10 = CPU.prototype._RST.curry(0x10);
    CPU.prototype.RST18 = CPU.prototype._RST.curry(0x18);
    CPU.prototype.RST20 = CPU.prototype._RST.curry(0x20);
    CPU.prototype.RST28 = CPU.prototype._RST.curry(0x28);
    CPU.prototype.RST30 = CPU.prototype._RST.curry(0x30);
    CPU.prototype.RST38 = CPU.prototype._RST.curry(0x38);

    CPU.prototype.JPnn = CPU.prototype._JPnn.curry();
    CPU.prototype.JPZnn = CPU.prototype._JPnn.curry(ZERO, false);
    CPU.prototype.JPNZnn = CPU.prototype._JPnn.curry(ZERO, true);
    CPU.prototype.JPCnn = CPU.prototype._JPnn.curry(CARRY, false);
    CPU.prototype.JPNCnn = CPU.prototype._JPnn.curry(CARRY, true);
    CPU.prototype.JPmHL = CPU.prototype._JPmm.curry(H, L);

    CPU.prototype._NI = function(position) {
        console.log("Unimplemented instruction called: " + position.toString(16));
    };

    CPU.prototype._EMPTY = function(position) {
        console.log("Unmapped instruction called: " + position.toString(16));
    };

    CPU.prototype._instructions = [
        // position of the instructions corresponds to its memory address
        CPU.prototype.NOP, CPU.prototype.LDnnBC, CPU.prototype.LDmrBCA, CPU.prototype.INCrrBC,
        CPU.prototype.INCrB, CPU.prototype.DECrB, CPU.prototype.LDnB, CPU.prototype._NI,
        CPU.prototype.LDarSP, CPU.prototype.ADDrrHLBC, CPU.prototype.LDrmABC, CPU.prototype.DECrrBC,
        CPU.prototype.INCrC, CPU.prototype.DECrC, CPU.prototype.LDnC, CPU.prototype._NI,

        CPU.prototype._NI, CPU.prototype.LDnnDE, CPU.prototype.LDmrDEA, CPU.prototype.INCrrDE,
        CPU.prototype.INCrD, CPU.prototype.DECrD, CPU.prototype.LDnD, CPU.prototype._NI,
        CPU.prototype._NI, CPU.prototype.ADDrrHLDE, CPU.prototype.LDrmADE, CPU.prototype.DECrrDE,
        CPU.prototype.INCrE, CPU.prototype.DECrE, CPU.prototype.LDnE, CPU.prototype._NI,

        CPU.prototype._NI, CPU.prototype.LDnnHL, CPU.prototype.LDmrHLplusA, CPU.prototype.INCrrHL,
        CPU.prototype.INCrH, CPU.prototype.DECrH, CPU.prototype.LDnH, CPU.prototype._NI,
        CPU.prototype._NI, CPU.prototype.ADDrrHLHL, CPU.prototype.LDrmAHLplus, CPU.prototype.DECrrHL,
        CPU.prototype.INCrL, CPU.prototype.DECrL, CPU.prototype.LDnL, CPU.prototype._NI,

        CPU.prototype._NI, CPU.prototype.LDnnSP, CPU.prototype.LDmrHLminusA, CPU.prototype.INCrrSP,
        CPU.prototype.INCmHL, CPU.prototype.DECmHL, CPU.prototype.LDmnHL, CPU.prototype._NI,
        CPU.prototype._NI, CPU.prototype.ADDrrHLSP, CPU.prototype.LDrmAHLminus, CPU.prototype.DECrrSP,
        CPU.prototype.INCrA, CPU.prototype.DECrA, CPU.prototype.LDnA, CPU.prototype._NI,

        CPU.prototype.LDrrBB, CPU.prototype.LDrrBC, CPU.prototype.LDrrBD, CPU.prototype.LDrrBE,
        CPU.prototype.LDrrBH, CPU.prototype.LDrrBL, CPU.prototype.LDrmBHL, CPU.prototype.LDrrBA,
        CPU.prototype.LDrrCB, CPU.prototype.LDrrCC, CPU.prototype.LDrrCD, CPU.prototype.LDrrCE,
        CPU.prototype.LDrrCH, CPU.prototype.LDrrCL, CPU.prototype.LDrmCHL, CPU.prototype.LDrrCA,

        CPU.prototype.LDrrDB, CPU.prototype.LDrrDC, CPU.prototype.LDrrDD, CPU.prototype.LDrrDE,
        CPU.prototype.LDrrDH, CPU.prototype.LDrrDL, CPU.prototype.LDrmDHL, CPU.prototype.LDrrDA,
        CPU.prototype.LDrrEB, CPU.prototype.LDrrEC, CPU.prototype.LDrrED, CPU.prototype.LDrrEE,
        CPU.prototype.LDrrEH, CPU.prototype.LDrrEL, CPU.prototype.LDrmEHL, CPU.prototype.LDrrEA,

        CPU.prototype.LDrrHB, CPU.prototype.LDrrHC, CPU.prototype.LDrrHD, CPU.prototype.LDrrHE,
        CPU.prototype.LDrrHH, CPU.prototype.LDrrHL, CPU.prototype.LDrmHHL, CPU.prototype.LDrrHA,
        CPU.prototype.LDrrLB, CPU.prototype.LDrrLC, CPU.prototype.LDrrLD, CPU.prototype.LDrrLE,
        CPU.prototype.LDrrLH, CPU.prototype.LDrrLL, CPU.prototype.LDrmLHL, CPU.prototype.LDrrLA,

        CPU.prototype.LDmrHLB, CPU.prototype.LDmrHLC, CPU.prototype.LDmrHLD, CPU.prototype.LDmrHLE,
        CPU.prototype.LDmrHLH, CPU.prototype.LDmrHLL, CPU.prototype.HALT, CPU.prototype.LDmrHLA,
        CPU.prototype.LDrrAB, CPU.prototype.LDrrAC, CPU.prototype.LDrrAD, CPU.prototype.LDrrAE,
        CPU.prototype.LDrrAH, CPU.prototype.LDrrAL, CPU.prototype.LDrmAHL, CPU.prototype.LDrrAA,

        CPU.prototype.ADDrrAB, CPU.prototype.ADDrrAC, CPU.prototype.ADDrrAD, CPU.prototype.ADDrrAE,
        CPU.prototype.ADDrrAH, CPU.prototype.ADDrrAL, CPU.prototype.ADDrmAHL, CPU.prototype.ADDrrAA,
        CPU.prototype.ADCrrAB, CPU.prototype.ADCrrAC, CPU.prototype.ADCrrAD, CPU.prototype.ADCrrAE,
        CPU.prototype.ADCrrAH, CPU.prototype.ADCrrAL, CPU.prototype.ADCrmAHL, CPU.prototype.ADCrrAA,

        CPU.prototype.SUBrrB, CPU.prototype.SUBrrC, CPU.prototype.SUBrrD, CPU.prototype.SUBrrE,
        CPU.prototype.SUBrrH, CPU.prototype.SUBrrL, CPU.prototype.SUBrmHL, CPU.prototype.SUBrrA,
        CPU.prototype.SBCrrB, CPU.prototype.SBCrrC, CPU.prototype.SBCrrD, CPU.prototype.SBCrrE,
        CPU.prototype.SBCrrH, CPU.prototype.SBCrrL, CPU.prototype.SBCrmHL, CPU.prototype.SBCrrA,

        CPU.prototype.ANDrrB, CPU.prototype.ANDrrC, CPU.prototype.ANDrrD, CPU.prototype.ANDrrE,
        CPU.prototype.ANDrrH, CPU.prototype.ANDrrL, CPU.prototype.ANDrmHL, CPU.prototype.ANDrrA,
        CPU.prototype.XORrrB, CPU.prototype.XORrrC, CPU.prototype.XORrrD, CPU.prototype.XORrrE,
        CPU.prototype.XORrrH, CPU.prototype.XORrrL, CPU.prototype.XORrmHL, CPU.prototype.XORrrA,

        CPU.prototype.ORrrB, CPU.prototype.ORrrC, CPU.prototype.ORrrD, CPU.prototype.ORrrE,
        CPU.prototype.ORrrH, CPU.prototype.ORrrL, CPU.prototype.ORrmHL, CPU.prototype.ORrrA,
        CPU.prototype.CPrrB, CPU.prototype.CPrrC, CPU.prototype.CPrrD, CPU.prototype.CPrrE,
        CPU.prototype.CPrrH, CPU.prototype.CPrrL, CPU.prototype.CPrmHL, CPU.prototype.CPrrA,

        CPU.prototype._NI, CPU.prototype.POPBC, CPU.prototype.JPNZnn, CPU.prototype.JPnn,
        CPU.prototype._NI, CPU.prototype.PUSHBC, CPU.prototype.ADDrnA, CPU.prototype.RST00,
        CPU.prototype._NI, CPU.prototype._NI, CPU.prototype.JPZnn, CPU.prototype._NI,
        CPU.prototype._NI, CPU.prototype._NI, CPU.prototype.ADCrnA, CPU.prototype.RST08,

        CPU.prototype._NI, CPU.prototype.POPDE, CPU.prototype.JPNCnn, CPU.prototype._EMPTY,
        CPU.prototype._NI, CPU.prototype.PUSHDE, CPU.prototype.SUBrnA, CPU.prototype.RST10,
        CPU.prototype._NI, CPU.prototype._NI, CPU.prototype.JPCnn, CPU.prototype._EMPTY,
        CPU.prototype._NI, CPU.prototype._EMPTY, CPU.prototype.SBCrnA, CPU.prototype.RST18,

        CPU.prototype.LDarA, CPU.prototype.POPHL, CPU.prototype.LDmrCA, CPU.prototype._EMPTY,
        CPU.prototype._EMPTY, CPU.prototype.PUSHHL, CPU.prototype.ANDrnA, CPU.prototype.RST20,
        CPU.prototype.ADDSPn, CPU.prototype.JPmHL, CPU.prototype.LDaarA, CPU.prototype._EMPTY,
        CPU.prototype._EMPTY, CPU.prototype._EMPTY, CPU.prototype.XORrnA, CPU.prototype.RST28,

        CPU.prototype.LDraA, CPU.prototype.POPAF, CPU.prototype.LDrmAC, CPU.prototype._NI,
        CPU.prototype._NI, CPU.prototype.PUSHAF, CPU.prototype.ORrnA, CPU.prototype.RST30,
        CPU.prototype.LDHLSPn, CPU.prototype.LDSPHL, CPU.prototype.LDraaA, CPU.prototype._NI,
        CPU.prototype._EMPTY, CPU.prototype._EMPTY, CPU.prototype.CPrnA, CPU.prototype.RST38
    ];

    return new CPU();
});
