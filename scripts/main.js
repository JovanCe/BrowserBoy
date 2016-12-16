/**
 * Created by JovanCe on 11/8/15.
 */

require.config({
    paths: {
        dom: "dom-actions"
    }
});

require(["require-config"], function(){
    require(["dom", "CPU", "MemoryManager", "GPU"],
        function(dom, CPU, MM, GPU) {
            dom.setupDOM();
            CPU.resetNoBIOS();
            MM.reset();
            GPU.reset();
        });
});