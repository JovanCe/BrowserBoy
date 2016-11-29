/**
 * Created by JovanCe on 11/28/16.
 */

define(["CPU"], function(CPU) {
    describe("Sample Module", function() {

        it('should have its own dependencies', function() {
            expect(CPU._stop).to.equal(true);
        });

    });

    return {
        name: "CPU tests"
    }
});