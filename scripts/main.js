/**
 * Created by JovanCe on 11/8/15.
 */

require.config({
    baseUrl: "scripts",
    paths: {
        CPU: "emu/CPU",
        MemoryManager: "emu/MemoryManager",
        lodash: "lib/lodash"
    }
});

require(["CPU", "MemoryManager"],
    function(CPU, MM) {
        CPU.reset();
        MM.reset();
        MM.embedBios();
        CPU.dispatch();
    });