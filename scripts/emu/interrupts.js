/**
 * Created by JovanCe on 12/18/16.
 */

define(["lodash", "MemoryManager", "events"], function (_, MM, events) {
    function InterruptHandler() {
        // interrupt masks
        this.VBLANK = 0;
        this.LCD_STAT = 1;
        this.TIMER = 2;
        this.SERIAL = 3;
        this.JOYPAD = 4;
        this._iv = [0x80, 0x40, 0x20, 0x10, 0x08];
    }

    InterruptHandler.prototype._getInterrupt = function (interrupt) {
        var request = MM.readByte(MM.if);
        return (request & this._iv[interrupt]) > 0;
    };

    InterruptHandler.prototype._getInterruptEnabled = function (interrupt) {
        var request = MM.readByte(MM.ie);
        return (request & this._iv[interrupt]) > 0;
    };

    InterruptHandler.prototype._resetInterrupt = function (interrupt) {
        var request = MM.readByte(MM.if);
        MM.writeByte(request & this._iv[interrupt] ^ 0xFF);
    };

    InterruptHandler.prototype.requestInterrupt = function (interrupt) {
        var request = MM.readByte(MM.if);
        MM.writeByte(request | this._iv[interrupt]);
    };

    InterruptHandler.prototype.handleInterrupts = function () {
        for(var i=0; i<5; i++) {
            if(this._getInterruptEnabled(i) && this._getInterrupt(i)) {
                events.dispatch("INTERRUPT_" + i);
            }
        }
    };

    return new InterruptHandler();
});