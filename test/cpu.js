/**
 * @author Jovan Cejovic <jovan.cejovic@gmail.com>
 */

import {describe, before, it} from 'mocha';
import chai from 'chai';

import {CPU} from "../src/cpu";
import {Z, N, H, C} from '../src/flags';

let assert = chai.assert;
describe('hooks', function () {
    before(function () {
        console.log("before");
    });
});

describe('CPU', function () {
    beforeEach(function () {
        let cpu = new CPU();
        cpu.reset();
        cpu._clock.M = 2;
        cpu._clock.T = 3;
        this.cpu = cpu;
    });
    describe('ADDrr', function () {
        it('Should sum the values from reg1 and reg2 and store it in reg1', function () {
            let cpu = this.cpu;
            cpu._reg.A = 0x01;
            cpu._reg.B = 0x02;
            cpu.ADDrrAB();
            assert(cpu._reg.A === 0x03);
        });
        it('Should increase machine cycles by 1 and clock periods by 4', function () {
            let cpu = this.cpu;
            cpu._reg.A = 0x01;
            cpu._reg.B = 0x02;
            cpu.ADDrrAB();
            assert(cpu._reg.M === 1);
            assert(cpu._reg.T === 4);
            assert(cpu._clock.M === 3);
            assert(cpu._clock.T === 7);
        });
        it('Should reset the subtract flag', function() {
            let cpu = this.cpu;
            cpu._reg.A = 0xff;
            cpu._reg.B = 0xff;
            cpu.ADDrrAB();
            assert(cpu._getFlag(N) === 0);
        });
        it('Should set the zero flag when result is zero', function() {
            let cpu = this.cpu;
            cpu._reg.A = 5;
            cpu._reg.B = -5;
            cpu.ADDrrAB();
            console.log(cpu._reg.A);
            console.log(cpu._reg.F);
            assert(cpu._getFlag(Z) === 1);
        });
        it('Should set the carry flag if the result is larger than 8 bits', function() {
            let cpu = this.cpu;
            cpu._reg.A = 0xff;
            cpu._reg.B = 0xff;
            cpu.ADDrrAB();
            assert(cpu._getFlag(C) === 1);
        });
        it('Should set the half-carry flag when there is a low nibble overflow', function() {
            let cpu = this.cpu;
            cpu._reg.A = 0xff;
            cpu._reg.B = 0xab;
            cpu.ADDrrAB();
            assert(cpu._getFlag(H) === 1);
        });
        it('Should use the carry flag when summing in adc variants, and reset it if there is no overflow', function() {
            let cpu = this.cpu;
            cpu._setFlag(C, true);
            cpu._reg.A = 0x01;
            cpu._reg.B = 0x01;
            cpu.ADCrrAB();
            assert(cpu._reg.A === 0x03);
            assert(cpu._getFlag(C) === 0);
        });
        it('Should use the carry flag when summing in adc variants, and set it again if there is overflow', function() {
            let cpu = this.cpu;
            cpu._setFlag(C, true);
            cpu._reg.A = 0xff;
            cpu._reg.B = 0x01;
            cpu.ADCrrAB();
            assert(cpu._reg.A === 1);
            assert(cpu._getFlag(C) === 1);
        });
    });
    describe('LDrr', function () {
        it('Should load content from src reg to dest reg', function () {
            let cpu = this.cpu;
            cpu.LDrrAB();
            assert(cpu._reg.A === cpu._reg.B);
        });
    });
});