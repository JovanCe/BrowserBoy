/**
 * Created by JovanCe on 11/22/15.
 */


define(["lodash", "events"], function(_, events) {
    function MemoryManager() {
        // Flag indicating BIOS is mapped in
        // BIOS is unmapped with the first instruction above 0x00FF
        this._biosLoaded = false;
        // the entire GB memory
        this._memory = new Uint8Array(65536);
        // Memory region delimiters
        this._ie = 0xFFFF; // Interrupt Enable Flag
        this._zram = 0xFF80; // Zero Page - 127 bytes
        this._zram_end = 0xFFFE;
        this._io = 0xFF00; // Hardware I/O Registers
        this._io_end = 0xFF7F;
        this._oam = 0xFE00;	// OAM - Object Attribute Memory
        this._oam_end = 0xFE9F;
        this._echo_ram = 0xE000; // Echo RAM - Reserved, Do Not Use
        this._echo_ram_end = 0xFDFF;
        this._wram = 0xC000; //	Internal RAM - fixed and switchable banks
        this._wram_end = 0xDFFF;
        this._cram = 0xA000; //	Cartridge RAM (If Available)
        this._cram_end = 0xBFFF;
        // start video RAM
        this._bg_map2 = 0x9C00; // BG Map Data 2
        this._bg_map2_end = 0x9FFF;
        this._bg_map1 = 0x9800; // BG Map Data 1
        this._bg_map1_end = 0x9BFF;
        this._char_ram = 0x8000; //	Character RAM
        this._char_ram_end = 0x97FF; // end video RAM

        /* 4000-$7FFF	Cartridge ROM - Switchable Banks 1-xx
         $0150-$3FFF	Cartridge ROM - Bank 0 (fixed)
         $0100-$014F	Cartridge Header Area
         */
        this._rom = 0x0100;
        this._rom_end = 0x7FFF;
        this._ir_vector = 0x0000; // Restart and Interrupt Vectors
        this._ir_vector_end = 0x00FF;
        // Note: $FEA0-$FEFF is unusable Memory



        // this._bios = [];
        // this._rom = [];
        // this._wram = [];
        // this._io = [];
        // this._eram = [];
        // this._zram = [];
        // interrupt enable register
        this._ie = 0;
    }

    MemoryManager.prototype.reset = function() {
        this._biosLoaded = false;
        this._memory.fill(0);
    };

    MemoryManager.prototype.loadROM = function (file) {
        var reader = new FileReader();
        var rom;
        reader.onload = function(e) {
            rom = new Uint8Array(reader.result);
            // reset previous ROM memory
            this._memory.fill(0, this._rom, this._rom_end + 1);
            // copy ROM data to memory
            this._memory.set(rom, this._rom);
            // TODO: ROM size checks from cartridge header

            events.dispatch(events.ROMLoaded);

        }.bind(this);
        reader.readAsArrayBuffer(file);
    };

    MemoryManager.prototype.embedBios = function () {
        var bios_data = new Uint8Array([0x31, 0xFE, 0xFF, 0xAF, 0x21, 0xFF, 0x9F, 0x32, 0xCB, 0x7C, 0x20, 0xFB, 0x21, 0x26, 0xFF, 0x0E,
            0x11, 0x3E, 0x80, 0x32, 0xE2, 0x0C, 0x3E, 0xF3, 0xE2, 0x32, 0x3E, 0x77, 0x77, 0x3E, 0xFC, 0xE0,
            0x47, 0x11, 0x04, 0x01, 0x21, 0x10, 0x80, 0x1A, 0xCD, 0x95, 0x00, 0xCD, 0x96, 0x00, 0x13, 0x7B,
            0xFE, 0x34, 0x20, 0xF3, 0x11, 0xD8, 0x00, 0x06, 0x08, 0x1A, 0x13, 0x22, 0x23, 0x05, 0x20, 0xF9,
            0x3E, 0x19, 0xEA, 0x10, 0x99, 0x21, 0x2F, 0x99, 0x0E, 0x0C, 0x3D, 0x28, 0x08, 0x32, 0x0D, 0x20,
            0xF9, 0x2E, 0x0F, 0x18, 0xF3, 0x67, 0x3E, 0x64, 0x57, 0xE0, 0x42, 0x3E, 0x91, 0xE0, 0x40, 0x04,
            0x1E, 0x02, 0x0E, 0x0C, 0xF0, 0x44, 0xFE, 0x90, 0x20, 0xFA, 0x0D, 0x20, 0xF7, 0x1D, 0x20, 0xF2,
            0x0E, 0x13, 0x24, 0x7C, 0x1E, 0x83, 0xFE, 0x62, 0x28, 0x06, 0x1E, 0xC1, 0xFE, 0x64, 0x20, 0x06,
            0x7B, 0xE2, 0x0C, 0x3E, 0x87, 0xF2, 0xF0, 0x42, 0x90, 0xE0, 0x42, 0x15, 0x20, 0xD2, 0x05, 0x20,
            0x4F, 0x16, 0x20, 0x18, 0xCB, 0x4F, 0x06, 0x04, 0xC5, 0xCB, 0x11, 0x17, 0xC1, 0xCB, 0x11, 0x17,
            0x05, 0x20, 0xF5, 0x22, 0x23, 0x22, 0x23, 0xC9, 0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
            0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D, 0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E,
            0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99, 0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC,
            0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E, 0x3c, 0x42, 0xB9, 0xA5, 0xB9, 0xA5, 0x42, 0x4C,
            0x21, 0x04, 0x01, 0x11, 0xA8, 0x00, 0x1A, 0x13, 0xBE, 0x20, 0xFE, 0x23, 0x7D, 0xFE, 0x34, 0x20,
            0xF5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xFB, 0x86, 0x20, 0xFE, 0x3E, 0x01, 0xE0, 0x50]);
        this._memory.set(bios_data);
        this._biosLoaded = true;
    };

    MemoryManager.prototype.loadBIOS = function (file) {
        var reader = new FileReader();
        var rom;
        reader.onload = function(e) {
            rom = new Uint8Array(reader.result);
            var bios = new Uint8Array(reader.readAsArrayBuffer(file));
            // copy BIOS data to memory
            this._memory.set(bios);
            this._biosLoaded = true;
            events.dispatch(events.BIOSLoaded);

        }.bind(this);
        reader.readAsArrayBuffer(file);
    };

    MemoryManager.prototype.readByte = function(address) {
        return this._memory[address];
    };

    MemoryManager.prototype.writeByte = function(address, value) {
        this._memory[address] = value;

        // temp code; check for output when running blargg's test roms
        var data = this.readByte(0xFF02);
        if (address == 0xFF02 && data == 0x81) {
            console.log(this.readByte(0xFF01));
        }
    };

    MemoryManager.prototype.readWord = function(address) {
        // GB is little endian
        return (this._memory[address+1] << 8) + this._memory[address];
    };

    MemoryManager.prototype.writeWord = function(address, value) {
        this.writeByte(address, value & 255);
        this.writeByte(address+1, value>>8);
    };

    return new MemoryManager();
});