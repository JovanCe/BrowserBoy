/**
 * Created by JovanCe on 11/8/15.
 */

require(["require-config"], function(){
    require(["CPU", "MemoryManager", "GPU"],
        function(CPU, MM, GPU) {
            CPU.reset();
            MM.reset();
            MM.embedBios();
            GPU.reset();
            CPU.dispatch();
        });
});
