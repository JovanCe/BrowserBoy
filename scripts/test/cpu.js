/**
 * Created by JovanCe on 11/28/16.
 */

define(["CPU", "MemoryManager"], function(CPU, MM) {
    describe("CPU", function() {
        beforeEach(function() {
            CPU.reset();
            MM.reset();
        });

        it('should ensure the CPU is in the STOP state', function() {
            expect(CPU._stop).to.equal(true);
        });
        describe("_step()", function() {
            describe("when t is not defined", function(){
                it("should be equal to m*4", function() {
                    CPU._step(1);
                    expect(CPU._reg.M).to.equal(1);
                    expect(CPU._reg.T).to.equal(4);
                });
            });
            describe("when t is defined", function(){
                it("should be equal to provided value", function() {
                    CPU._step(1, 3);
                    expect(CPU._reg.M).to.equal(1);
                    expect(CPU._reg.T).to.equal(3);
                });
            });
            it("should also advance global clocks", function(){
                CPU._step(1, 3);
                CPU._step(2, 5);
                expect(CPU._clock.M).to.equal(3);
                expect(CPU._clock.T).to.equal(8);
            });
        });
        describe("_getFlag()", function(){
            describe("get zero flag", function(){
                it("should get current flag value", function(){
                    CPU._setFlag(CPU._FLAG_ZERO, true);
                    expect(CPU._getFlag(CPU._FLAG_ZERO)).to.equal(1);
                });
            });
            describe("get substract flag", function(){
                it("should get current flag value", function(){
                    CPU._setFlag(CPU._FLAG_SUBSTRACT, true);
                    expect(CPU._getFlag(CPU._FLAG_SUBSTRACT)).to.equal(1);
                });
            });
            describe("get half-carry flag", function(){
                it("should get current flag value", function(){
                    CPU._setFlag(CPU._FLAG_HALF_CARRY, true);
                    expect(CPU._getFlag(CPU._FLAG_HALF_CARRY)).to.equal(1);
                });
            });
            describe("get carry flag", function(){
                it("should get current flag value", function(){
                    CPU._setFlag(CPU._FLAG_CARRY, true);
                    expect(CPU._getFlag(CPU._FLAG_CARRY)).to.equal(1);
                });
            });
        });
        describe("_resetZeroFlag()", function(){
            it("should should set the zero flag to 0", function(){
                CPU._setFlag(CPU._FLAG_ZERO, false);
                expect(CPU._reg.F & 0x80).to.equal(0);
            });
        });
        describe("_setZeroFlag()", function(){
            it("should set the zero flag to 1", function(){
                CPU._setFlag(CPU._FLAG_ZERO, true);
                expect((CPU._reg.F & 0x80) >> 7).to.equal(1);
            });
        });
        describe("_resetSubstractFlag()", function(){
            it("should set the substract flag to 0", function(){
                CPU._setFlag(CPU._FLAG_SUBSTRACT, false);
                expect(CPU._reg.F & 0x40).to.equal(0);
            });
        });
        describe("_setSubstractFlag()", function(){
            it("should set the substract flag to 1", function(){
                CPU._setFlag(CPU._FLAG_SUBSTRACT, true);
                expect((CPU._reg.F & 0x40) >> 6).to.equal(1);
            });
        });
        describe("_resetHalfCarryFlag()", function(){
            it("should set the half-carry flag to 0", function(){
                CPU._setFlag(CPU._FLAG_HALF_CARRY, false);
                expect(CPU._reg.F & 0x20).to.equal(0);
            });
        });
        describe("_setHalfCarryFlag()", function(){
            it("should set the half-carry flag to 1", function(){
                CPU._setFlag(CPU._FLAG_HALF_CARRY, true);
                expect((CPU._reg.F & 0x20) >> 5).to.equal(1);
            });
        });
        describe("_resetCarryFlag()", function(){
            it("should set the carry flag to 0", function(){
                CPU._setFlag(CPU._FLAG_CARRY, false);
                expect(CPU._reg.F & 0x10).to.equal(0);
            });
        });
        describe("_setCarryFlag()", function(){
            it("should set the carry flag to 1", function(){
                CPU._setFlag(CPU._FLAG_CARRY, true);
                expect((CPU._reg.F & 0x10) >> 4).to.equal(1);
            });
        });

        describe("NOP", function(){
            it("should do nothing but advance the clock by 1 machine cycle", function(){
                CPU.NOP();
                expect(CPU._reg.M).to.equal(1);
                expect(CPU._reg.T).to.equal(4);
            })
        });
        describe("HALT", function(){
            it("should put the CPU in HALT state (pause)", function(){
                CPU.HALT();
                expect(CPU._halt).to.equal(true);
            })
        });

        describe("LDr", function(){
            it("should copy value from the register in the first argument to the register in the second" +
                "and advance the clock by 1 machine cycle", function(){
                CPU._reg.A=5;
                CPU.LDr("A", "B");
                expect(CPU._reg.B).to.equal(5);
                expect(CPU._reg.M).to.equal(1);
            });
        });
        describe("LDrn", function(){
            it("should load an immediate byte value into the provided register" +
                "and advance the clock by 2 machine cycles", function(){
                CPU._reg.PC=5;
                MM.writeByte(CPU._reg.PC, 1);
                CPU.LDrn("A");
                expect(CPU._reg.A).to.equal(1);
                expect(CPU._reg.M).to.equal(2);
            });
        });
        describe("LDrn16", function(){
            it("should load an immediate word value into two provided 8-bit registers, advance the PC by 2" +
                "and advance the clock by 3 machine cycles", function(){
                CPU._reg.PC=5;
                MM.writeByte(CPU._reg.PC, 1);
                MM.writeByte(CPU._reg.PC+1, 2);
                CPU.LDrn16("A", "B");
                expect(CPU._reg.A).to.equal(1);
                expect(CPU._reg.B).to.equal(2);
                expect(CPU._reg.PC).to.equal(7);
                expect(CPU._reg.M).to.equal(3);
            });
        });
        describe("LDr16n16", function(){
            it("should load an immediate word value into the provided 16-bit register, advance the PC by 2" +
                "and advance the clock by 3 machine cycles", function(){
                CPU._reg.PC=5;
                MM.writeByte(CPU._reg.PC, 1);
                MM.writeByte(CPU._reg.PC+1, 2);
                CPU.LDr16n16("SP");
                // CPU is little endian and memory works with binaries, not BCDs, that's why the expected result is
                // not 21
                expect(CPU._reg.SP).to.equal(513);
                expect(CPU._reg.PC).to.equal(7);
                expect(CPU._reg.M).to.equal(3);
            });
        });
        describe("LDrmm", function(){
            it("should load the value from the address provided by first two registers into the third one," +
                "and advance the clocks by 1 machine cycle and 8 cpu cycles respectively", function(){
                MM.writeByte(258, 1);
                CPU._reg.H=1;
                CPU._reg.L=2;
                CPU._ins.LDrmAHL();
                expect(CPU._reg.A).to.equal(1);
                expect(CPU._reg.M).to.equal(1);
                expect(CPU._reg.T).to.equal(8);
            });
        });
        describe("LDmmr", function(){
            it("should put the value from the first register to the address provided by the second two," +
                "and advance the clocks by 1 machine cycle and 8 cpu cycles respectively", function(){
                CPU._reg.A = 5;
                CPU._reg.H=1;
                CPU._reg.L=2;
                CPU.LDmmr("A", "H", "L");
                expect(MM.readByte(258)).to.equal(5);
                expect(CPU._reg.M).to.equal(1);
                expect(CPU._reg.T).to.equal(8);
            });
        });
        describe("LDmn", function(){
            it("should put the immediate byte value into the the address provided by two registers in params," +
                "and advance the clocks by 2 machine cycle and 12 cpu cycles respectively", function(){
                CPU._reg.PC = 5;
                MM.writeByte(CPU._reg.PC, 81);
                CPU._reg.H=1;
                CPU._reg.L=2;
                CPU.LDmn("H", "L");
                expect(MM.readByte(258)).to.equal(81);
                expect(CPU._reg.M).to.equal(2);
                expect(CPU._reg.T).to.equal(12);
            });
        });
        describe("LDa16r", function(){
            it("should put the byte value in the register to the immediate address value, advance the PC by 2" +
                "and advance the clocks by 3 machine cycle and 16 cpu cycles respectively", function(){
                CPU._reg.PC = 5;
                MM.writeByte(CPU._reg.PC, 2);
                MM.writeByte(CPU._reg.PC+1, 1);
                CPU._reg.A = 10;
                CPU.LDa16r("A");
                expect(MM.readByte(258)).to.equal(10);
                expect(CPU._reg.PC).to.equal(7);
                expect(CPU._reg.M).to.equal(3);
                expect(CPU._reg.T).to.equal(16);
            });
        });
        describe("LDa16r16", function(){
            it("should put the word value in the 16-bit register to the immediate address value, advance the PC by 2" +
                "and advance the clocks by 3 machine cycle and 20 cpu cycles respectively", function(){
                CPU._reg.PC = 5;
                MM.writeByte(CPU._reg.PC, 2);
                MM.writeByte(CPU._reg.PC+1, 1);
                CPU._reg.SP = 512;
                CPU.LDa16r16("SP");
                expect(MM.readWord(258)).to.equal(512);
                expect(CPU._reg.PC).to.equal(7);
                expect(CPU._reg.M).to.equal(3);
                expect(CPU._reg.T).to.equal(20);
            });
        });
        describe("LDra16", function(){
            it("should load the value in the immediate address, put it in the provided register, advance the PC by 2" +
                "and advance the clocks by 3 machine cycle and 16 cpu cycles respectively", function(){
                CPU._reg.PC = 5;
                MM.writeByte(CPU._reg.PC, 2);
                MM.writeByte(CPU._reg.PC+1, 1);
                MM.writeByte(MM.readWord(CPU._reg.PC), 8);
                CPU.LDra16("A");
                expect(CPU._reg.A).to.equal(8);
                expect(CPU._reg.PC).to.equal(7);
                expect(CPU._reg.M).to.equal(3);
                expect(CPU._reg.T).to.equal(16);
            });
        });
        describe("LDar", function(){
            it("should put the value from the register into the FF00 + immediate offset address, advance the PC by 1" +
                "and advance the clocks by 2 machine cycle and 12 cpu cycles respectively", function(){
                CPU._reg.PC = 5;
                MM.writeByte(CPU._reg.PC, 2);
                CPU._reg.A = 1;
                CPU.LDar("A");
                expect(MM.readByte(0xFF00 + 2)).to.equal(1);
                expect(CPU._reg.PC).to.equal(6);
                expect(CPU._reg.M).to.equal(2);
                expect(CPU._reg.T).to.equal(12);
            });
        });
        describe("LDra", function(){
            it("should load the value from the FF00 + immediate offset address into the provided register," +
                "and advance the clocks by 2 machine cycle and 12 cpu cycles respectively", function(){
                CPU._reg.PC = 5;
                MM.writeByte(CPU._reg.PC, 2);
                MM.writeByte(0xFF00 + 2, 1);
                CPU.LDra("A");
                expect(CPU._reg.A).to.equal(1);
                expect(CPU._reg.M).to.equal(2);
                expect(CPU._reg.T).to.equal(12);
            });
        });
        describe("LDmr", function(){
            it("should put the value from the first register into the FF00 + offset provided in the second register address," +
                "and advance the clocks by 2 machine cycle and 8 cpu cycles respectively", function(){
                CPU._reg.C = 5;
                CPU._reg.A = 1;
                CPU.LDmr("A", "C");
                expect(MM.readByte(0xFF00 + 5)).to.equal(1);
                expect(CPU._reg.M).to.equal(2);
                expect(CPU._reg.T).to.equal(8);
            });
        });
        describe("LDrm", function(){
            it("should load the value from the FF00 + offset provided in the second register address into the first register," +
                "and advance the clocks by 2 machine cycle and 8 cpu cycles respectively", function(){
                CPU._reg.C = 5;
                MM.writeByte(0xFF00 + 5, 13);
                CPU.LDrm("C", "A");
                expect(CPU._reg.A).to.equal(13);
                expect(CPU._reg.M).to.equal(2);
                expect(CPU._reg.T).to.equal(8);
            });
        });
        describe("LDr16rr", function(){
            it("should load the value from the first two 8-bit registers to the third 16-bit register," +
                "and advance the clocks by 1 machine cycle and 8 cpu cycles respectively", function(){
                CPU._reg.H = 2;
                CPU._reg.L = 5;
                CPU.LDr16rr("H", "L", "SP");
                expect(CPU._reg.SP).to.equal(517);
                expect(CPU._reg.M).to.equal(1);
                expect(CPU._reg.T).to.equal(8);
            });
        });
        describe("LDrrr16n", function(){
            function execute(regVal, offsetVal) {
                CPU._reg.SP=regVal;
                CPU._reg.PC=5;
                MM.writeByte(CPU._reg.PC, offsetVal);
                CPU.LDrrr16n("SP", "H", "L");
            }
            it("should load the value from the first 16-bit register added with the immediate signed byte offset, " +
                "into the second two 8-bit registers, set carry and half-carry flags accordingly" +
                "and advance the clocks by 2 machine cycle and 12 cpu cycles respectively", function(){
                execute(1000, 2);
                expect(CPU._reg.H).to.equal(3);
                expect(CPU._reg.L).to.equal(234);
                expect(CPU._reg.M).to.equal(2);
                expect(CPU._reg.T).to.equal(12);
            });
            describe("when the offset is negative", function() {
                it("should convert the offset from 2-complement representation", function() {
                    execute(1000, 254);
                    expect(CPU._reg.H).to.equal(3);
                    expect(CPU._reg.L).to.equal(230);
                });
            });
            describe("when there's a low nibble overflow", function() {
                it("set the half-carry flag", function() {
                    execute(1000, -2);
                    expect(CPU._reg.H).to.equal(3);
                    expect(CPU._reg.L).to.equal(230);
                    expect((CPU._reg.F & 0x20) >> 5).to.equal(1);
                });
            });
            describe("when there's an overflow", function() {
                it("should set the carry flag", function() {
                    execute(65535, 2);
                    expect(CPU._reg.H).to.equal(0);
                    expect(CPU._reg.L).to.equal(1);
                    expect((CPU._reg.F & 0x10) >> 4).to.equal(1);
                });
            });

        });
        describe("POPrr", function() {
            it("should pop two byte values from the stack, put them into provided registers, increasing the SP register twice in the meantime, " +
                "and advance the clocks by 1 machine cycle and 16 cpu cycles respectively", function() {
                CPU._reg.SP = 9;
                MM.writeByte(10, 5);
                MM.writeByte(9, 6);
                CPU.POPrr("D", "E");
                expect(CPU._reg.D).to.equal(5);
                expect(CPU._reg.E).to.equal(6);
                expect(CPU._reg.SP).to.equal(11);
                expect(CPU._reg.M).to.equal(1);
                expect(CPU._reg.T).to.equal(12);
            });
        });
        describe("PUSHrr", function() {
           it("should push provided registers to the stack, decreasing the SP register twice in the meantime, " +
               "and advance the clocks by 1 machine cycle and 16 cpu cycles respectively", function() {
               CPU._reg.SP = 10;
               CPU._reg.D = 5;
               CPU._reg.E = 6;
               CPU.PUSHrr("D", "E");
               var d = MM.readByte(9);
               var e = MM.readByte(8);
               expect(d).to.equal(CPU._reg.D);
               expect(e).to.equal(CPU._reg.E);
               expect(CPU._reg.SP).to.equal(8);
               expect(CPU._reg.M).to.equal(1);
               expect(CPU._reg.T).to.equal(16);
           });
        });
        describe("PUSHrr and POPrr", function() {
            it("", function() {
                CPU._reg.SP = 10;
                CPU._reg.D = 5;
                CPU._reg.E = 6;
                CPU.PUSHrr("D", "E");
                CPU.POPrr("D", "E")
                expect(CPU._reg.D).to.equal(5);
                expect(CPU._reg.E).to.equal(6);
                expect(CPU._reg.SP).to.equal(10);
                expect(CPU._clock.M).to.equal(2);
                expect(CPU._clock.T).to.equal(28);
            });
        });
    });


    return {
        name: "CPU tests"
    }
});
