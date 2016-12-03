/**
 * Created by JovanCe on 11/8/15.
 */

require(["require-config"], function(){
    require(["CPU", "MemoryManager", "GPU"],
        function(CPU, MM, GPU) {
            var fileInput = document.getElementById('rom');
            fileInput.addEventListener("change", function(e) {
                var file = fileInput.files[0];
                MM.loadROM(file);

            }, false);

            CPU.reset();
            MM.reset();
            //MM.embedBios();
            GPU.reset();
        });
});
