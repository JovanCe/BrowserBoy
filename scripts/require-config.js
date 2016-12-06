/**
 * Created by JovanCe on 11/29/16.
 */

requirejs.config({
    baseUrl: "scripts",
    paths: {
        CPU: "emu/CPU",
        GPU: "emu/GPU",
        MemoryManager: "emu/MemoryManager",

        config: "config",
        events: "events",

        lodash: "lib/lodash",
        jquery: "lib/jquery-3.1.1.min"
    }
});