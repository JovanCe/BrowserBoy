/**
 * @author Jovan Cejovic <jovan.cejovic@gmail.com>
 */

import {describe, before, it} from 'mocha';
import chai from 'chai';

import {Memory} from "../src/memory";

let assert = chai.assert;

describe('Memory', function () {
    beforeEach(function () {
        let mem = new Memory();
        mem.reset();
        this.memory = mem;
    });
    describe('readByte', function () {
        it('Should return 0 when no writes have occurred', function () {
            let mem = this.memory;
            assert(mem.readByte(0xff) === 0);
        });
        it('Should return the byte previously written to an address', function () {
            let mem = this.memory;
            mem._memory[0xff] = 0x12;
            let byte = mem.readByte(0xff);
            assert(byte === 0x12);
        });
    });
    describe('writeByte', function () {
        it('Should write a byte to a specified address', function () {
            let mem = this.memory;
            mem.writeByte(0xff, 0x12);
            let byte = mem._memory[0xff];
            assert(byte === byte & 0xff, 'returned value is not 8 bits long');
            assert(byte === 0x12);
        });
    });
    describe('readWord', function () {
        it('Should return 0 when no writes have occurred', function () {
            let mem = this.memory;
            assert(mem.readWord(0xff) === 0);
        });
        it('Should return the word previously written to an address in little endian order', function () {
            let mem = this.memory;
            mem._memory[0xfe] = 0x12;
            mem._memory[0xff] = 0x11;
            let word = mem.readWord(0xfe);
            assert(word === (0x11 << 8) + 0x12);
        });
    });
    describe('writeWord', function () {
        it('Should write a word to a specified address in little endian order', function () {
            let mem = this.memory;
            mem.writeWord(0xfe, 0x1212);
            let word = (mem._memory[0xfe] << 8) + mem._memory[0xff];
            assert(word === word & 0xffff, 'returned value is not 16 bits long');
            assert(word === 0x1212);
        });
    });
});