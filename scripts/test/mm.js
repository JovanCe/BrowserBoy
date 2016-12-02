/**
 * Created by JovanCe on 12/2/16.
 */

define(["MemoryManager"], function(MM) {
    describe("MemoryManager", function() {
        beforeEach(function () {
            MM.reset();
        });

        describe("readByte", function() {
           it("should return a byte from the provided address", function() {
               MM._memory[5] = 81;
               var v = MM.readByte(5);
                expect(v).to.equal(81);
           });
        });
        describe("writeByte", function() {
            it("should write the provided byte value to the provided address", function() {
                MM.writeByte(5, 81);
                expect(MM.readByte(5)).to.equal(81);
            });
        });
        describe("readWord", function() {
            it("should return a word from the provided address", function() {
                MM._memory[5] = 5;
                MM._memory[6] = 1;
                var v = MM.readWord(5);
                expect(v).to.equal(261);
            });
        });
        describe("writeWord", function() {
            it("should write the provided word value to the provided address", function() {
                MM.writeWord(5, 261);
                expect(MM.readByte(5)).to.equal(5);
                expect(MM.readByte(6)).to.equal(1);
            });
        });
    });

    return {
        name: "MemoryManager tests"
    }
});
