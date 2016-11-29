/**
 * Created by JovanCe on 11/28/16.
 */

define(["CPU"], function(CPU) {
    describe("Sample Module", function() {
        it('should have a name', function() {
            expect(CPU.name).to.be.a("string");
            expect(CPU.name).to.equal("CPU");
        });

        it('should have its own dependencies', function() {
            expect(CPU.dependency).to.equal("GPU");
        });

    });

    return {
        name: "CPU tests"
    }
});