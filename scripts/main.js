/**
 * Created by JovanCe on 11/8/15.
 */

require.config({
    baseUrl: "scripts",
    paths: {
        CPU: "emu/CPU",
        GPU: "emu/GPU",
        MemoryManager: "emu/MemoryManager",
        lodash: "lib/lodash"
    }
});

require(["CPU", "MemoryManager", "GPU"],
    function(CPU, MM, GPU) {
        CPU.reset();
        MM.reset();
        MM.embedBios();
        GPU.reset();
        CPU.dispatch();
    });