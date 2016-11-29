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
requirejs(["jquery"],function($){
    mocha.setup('bdd');
    requirejs(tests, function(){
        mocha.run();
    });
});