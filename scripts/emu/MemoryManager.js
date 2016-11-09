/**
 * Created by JovanCe on 11/22/15.
 */


define(["lodash"], function(_) {
    function MemoryManager() {
        // Flag indicating BIOS is mapped in
        // BIOS is unmapped with the first instruction above 0x00FF
        this._biosLoaded = true;

        // Memory regions
        this._bios = [];
        this._rom = [];
        this._wram = [];
        this._eram = [];
        this._zram = [];
    }

    MemoryManager.prototype.reset = function() {
        this._biosLoaded = true;
        this._bios = [];
        this._rom = [];
        this._wram = [];
        this._eram = [];
        this._zram = [];
    };

    MemoryManager.prototype.loadROM = function(file) {
        var reader = new FileReader();
        var rom = reader.readAsArrayBuffer(file);
        this._rom = new Int8Array(rom);
    };

    MemoryManager.prototype.readByte = function(address) {

    };

    MemoryManager.prototype.writeByte = function(address, value) {

    };

    MemoryManager.prototype.readWord = function(address) {

    };

    MemoryManager.prototype.writeWord = function(address, value) {

    };

    return MemoryManager;
});