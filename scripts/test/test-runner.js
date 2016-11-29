/**
 * Created by JovanCe on 11/28/16.
 */

requirejs.config({
    paths: {
        tests: "test"
    }
});
tests = [
    "tests/cpu"
];
requirejs(tests, function(){
    mocha.setup('bdd');
    requirejs(['testCPU'], function(module){
        console.log("module: ", module);
        mocha.run();
    });
});