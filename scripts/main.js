/**
 * Created by JovanCe on 11/8/15.
 */

requirejs.config({
    baseUrl: "scripts",
    paths: {
        emu: "emu"
    }
});

requirejs(["emu/CPU"],
    function(CPU) {

    });