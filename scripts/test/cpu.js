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
            it("should advance global clocks", function(){
                CPU._step(1, 3);
                CPU._step(2, 5);
                expect(CPU._clock.M).to.equal(3);
                expect(CPU._clock.T).to.equal(8);
            });
        });
        describe("_resetZeroFlag()", function(){
            it("should set the zero flag to 0", function(){
                CPU._resetZeroFlag();
                expect(CPU._reg.F & 0x80).to.equal(0);
            });
        });
        describe("_setZeroFlag()", function(){
            it("should set the zero flag to 1", function(){
                CPU._setZeroFlag();
                expect((CPU._reg.F & 0x80) >> 7).to.equal(1);
            });
        });
        describe("_resetSubstractFlag()", function(){
            it("should set the substract flag to 0", function(){
                CPU._resetSubstractFlag();
                expect(CPU._reg.F & 0x40).to.equal(0);
            });
        });
        describe("_setSubstractFlag()", function(){
            it("should set the substract flag to 1", function(){
                CPU._setSubstractFlag();
                expect((CPU._reg.F & 0x40) >> 6).to.equal(1);
            });
        });
        describe("_resetHalfCarryFlag()", function(){
            it("should set the half-carry flag to 0", function(){
                CPU._resetHalfCarryFlag();
                expect(CPU._reg.F & 0x20).to.equal(0);
            });
        });
        describe("_setHalfCarryFlag()", function(){
            it("should set the half-carry flag to 1", function(){
                CPU._setHalfCarryFlag();
                expect((CPU._reg.F & 0x20) >> 5).to.equal(1);
            });
        });
        describe("_resetCarryFlag()", function(){
            it("should set the carry flag to 0", function(){
                CPU._resetCarryFlag();
                expect(CPU._reg.F & 0x10).to.equal(0);
            });
        });
        describe("_setCarryFlag()", function(){
            it("should set the carry flag to 1", function(){
                CPU._setCarryFlag();
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
            it("should load an immediate word value into two provided 8 bit registers, advance the PC by 2" +
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
            it("should load an immediate word value into the provided 16 bit register, advance the PC by 2" +
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
            it("should load a value from the address provided by first two registers and into the third one," +
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
    });

    return {
        name: "CPU tests"
    }
});