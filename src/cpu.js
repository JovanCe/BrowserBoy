/**
 * @author Jovan Cejovic <jovan.cejovic@gmail.com>
 */

import inlineMacro from './cpu.macro';
import {Z, N, H, C} from './flags';

export class CPU {
    constructor(memory) {
        this._memory = memory;
        this._reg = {
            // note that GameBoy's z80 CPU is little-endian
            A: 0, B: 0, D: 0, H: 0,
            F: 0, C: 0, L: 0,
            SP: 0, PC: 0,
            M: 0, T: 0 // last instruction machine cycles and clock periods
        };
        this._clock = {
            M: 0, // total machine cycles
            T: 0 // total clock periods
        };
        this._fmask = {
            C: 0x10, // carry
            H: 0x20, // half-carry
            N: 0x40, // subtract
            Z: 0x80 // zero
        };
    }

    _step(m, t) {
        if(!m) {
            m = 1;
        }
        if(!t) {
            t = m*4;
        }
        this._reg.M = m;
        this._reg.T  = t;
        this._clock.M += m;
        this._clock.T += t;
    }

    _setFlag(flag, value) {
        if(value) {
            this._reg.F |= this._fmask[flag];
            console.log(this._reg.F);
        }
        else {
            this._reg.F &= this._fmask[flag] ^ 0xff;
        }
    }

    _getFlag(flag) {
        let f = this._reg.F &= this._fmask[flag];
        return (f >> Math.log2(f));
    }

    reset() {
        this._reg.A = 0x01;
        this._reg.B = 0x00;
        this._reg.D = 0x00;
        this._reg.H = 0x01;
        this._reg.F = 0xb0;
        this._reg.C = 0x13;
        this._reg.L = 0x4d;
        this._reg.SP = 0xfffe;
        this._reg.PC = 0x0100;
        this._clock.M = 0;
        this._clock.T = 0;
    }

    _LDrr(reg1, reg2) {
        this._reg[reg1] = this._reg[reg2];
        this._clock.T += 1;
    }

    _ADDrr(reg1, reg2, useCarry) {
        let tmp = this._reg[reg1] + this._reg[reg2];
        let nibble = (this._reg[reg1] & 0xf) + (this._reg[reg2] & 0xf);
        if(useCarry) {
            tmp += this._getFlag(C);
            nibble += this._getFlag(C);
        }
        this._setFlag(N, false);
        this._setFlag(Z, (tmp & 0xff) === 0);
        this._setFlag(C, tmp > 0xff);
        this._setFlag(H, (nibble & 0x10) !== 0);
        this._reg[reg1] = tmp & 0xff;
        this._step();
    }

    LDrrAB = inlineMacro(this._LDrr, 'A', 'B');
    LDrrBC = inlineMacro(this._LDrr, 'B', 'C');
    ADDrrAA = inlineMacro(this._ADDrr, 'A', 'A', false);
    ADDrrAB = inlineMacro(this._ADDrr, 'A', 'B', false);
    ADDrrAC = inlineMacro(this._ADDrr, 'A', 'C', false);
    ADDrrAD = inlineMacro(this._ADDrr, 'A', 'D', false);
    ADDrrAE = inlineMacro(this._ADDrr, 'A', 'E', false);
    ADDrrAH = inlineMacro(this._ADDrr, 'A', 'H', false);
    ADDrrAL = inlineMacro(this._ADDrr, 'A', 'L', false);
    ADCrrAA = inlineMacro(this._ADDrr, 'A', 'A', true);
    ADCrrAB = inlineMacro(this._ADDrr, 'A', 'B', true);
    ADCrrAC = inlineMacro(this._ADDrr, 'A', 'C', true);
    ADCrrAD = inlineMacro(this._ADDrr, 'A', 'D', true);
    ADCrrAE = inlineMacro(this._ADDrr, 'A', 'E', true);
    ADCrrAH = inlineMacro(this._ADDrr, 'A', 'H', true);
    ADCrrAL = inlineMacro(this._ADDrr, 'A', 'L', true);

}