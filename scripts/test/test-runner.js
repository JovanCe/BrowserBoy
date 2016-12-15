/**
 * Created by JovanCe on 11/28/16.
 */

requirejs.config({
    //urlArgs: "now="+Date.now(),
    paths: {
        tests: "test",
        jquery: "lib/jquery-3.1.1.min"
    }
});
tests = [
    "tests/cpu",
    "tests/mm"
];
requirejs(["jquery"],function($){
    mocha.setup('bdd');
    requirejs(tests, function(){
        mocha.run();
    });
});