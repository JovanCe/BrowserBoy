/**
 * Created by JovanCe on 11/28/16.
 */

define(["CPU"], function(CPU) {
    describe("CPU", function() {
        beforeEach(function() {
            CPU.reset();
        });

        it('should ensure the CPU is in the STOP state', function() {
            expect(CPU._stop).to.equal(true);
        });
        describe("#_step()", function() {
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
        });
        describe("#_resetZeroFlag()", function(){
            it("should set the zero flag to 0", function(){
                CPU._resetZeroFlag();
                expect(CPU._reg.F & 0x80).to.equal(0);
            });
        });
        describe("#_setZeroFlag()", function(){
            it("should set the zero flag to 1", function(){
                CPU._setZeroFlag();
                expect((CPU._reg.F & 0x80) >> 7).to.equal(1);
            });
        });
        describe("#_resetSubstractFlag()", function(){
            it("should set the substract flag to 0", function(){
                CPU._resetSubstractFlag();
                expect(CPU._reg.F & 0x40).to.equal(0);
            });
        });
        describe("#_setSubstractFlag()", function(){
            it("should set the substract flag to 1", function(){
                CPU._setSubstractFlag();
                expect((CPU._reg.F & 0x40) >> 6).to.equal(1);
            });
        });
        describe("#_resetHalfCarryFlag()", function(){
            it("should set the half-carry flag to 0", function(){
                CPU._resetHalfCarryFlag();
                expect(CPU._reg.F & 0x20).to.equal(0);
            });
        });
        describe("#_setHalfCarryFlag()", function(){
            it("should set the half-carry flag to 1", function(){
                CPU._setHalfCarryFlag();
                expect((CPU._reg.F & 0x20) >> 5).to.equal(1);
            });
        });
        describe("#_resetCarryFlag()", function(){
            it("should set the carry flag to 0", function(){
                CPU._resetCarryFlag();
                expect(CPU._reg.F & 0x10).to.equal(0);
            });
        });
        describe("#_setCarryFlag()", function(){
            it("should set the carry flag to 1", function(){
                CPU._setCarryFlag();
                expect((CPU._reg.F & 0x10) >> 4).to.equal(1);
            });
        });

    });

    return {
        name: "CPU tests"
    }
});