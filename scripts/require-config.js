/**
 * Created by JovanCe on 11/29/16.
 */

requirejs.config({
    baseUrl: "scripts",
    paths: {
        CPU: "emu/CPU",
        GPU: "emu/GPU",
        MemoryManager: "emu/MemoryManager",
        interrupts: "emu/interrupts",

        config: "config",
        events: "events",

        lodash: "lib/lodash"
    }
});