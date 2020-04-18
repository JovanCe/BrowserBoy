/**
 * @author Jovan Cejovic <jovan.cejovic@gmail.com>
 */

import {bios} from './bios';

/*
GameBoy Memory Areas
$FFFF	Interrupt Enable Flag
$FF80-$FFFE	Zero Page - 127 bytes
$FF00-$FF7F	Hardware I/O Registers
$FEA0-$FEFF	Unusable Memory
$FE00-$FE9F	OAM - Object Attribute Memory
$E000-$FDFF	Echo RAM - Reserved, Do Not Use
$D000-$DFFF	Internal RAM - Bank 1-7 (switchable - CGB only)
$C000-$CFFF	Internal RAM - Bank 0 (fixed)
$A000-$BFFF	Cartridge RAM (If Available)
$9C00-$9FFF	BG Map Data 2
$9800-$9BFF	BG Map Data 1
$8000-$97FF	Character RAM
$4000-$7FFF	Cartridge ROM - Switchable Banks 1-xx
$0150-$3FFF	Cartridge ROM - Bank 0 (fixed)
$0100-$014F	Cartridge Header Area
$0000-$00FF	Restart and Interrupt Vectors
 */

export class Memory {
    constructor() {
        this._memory = new Uint8Array(65536);
        this._biosLoaded = false;
    }

    reset() {
        this._memory.fill(0);
        this._biosLoaded = false;
    }

    loadBios() {
        this._memory.set(bios);
        this._biosLoaded = true;
    }

    readByte(address) {
        return this._memory[address];
    }

    writeByte(address, value) {
        // ensure the value is 8 bits long
        this._memory[address] = value & 0xff;
    }

    readWord(address) {
        return (this._memory[address + 1] << 8) + this._memory[address];
    }

    writeWord(address, value) {
        // ensure the value is 16 bits long
        this._memory[address] = value & 0xff;
        this._memory[address + 1] = (value >> 8) & 0xff;
    }

    loadRom() {

    }
}