/**
 * Created by JovanCe on 12/3/16.
 */

define(["MemoryManager"], function(MM) {
    return {
        setupDOM: function() {
            var fileInput = document.getElementById('rom');
            fileInput.addEventListener("change", function(e) {
                var file = fileInput.files[0];
                MM.loadROM(file);

            }, false);
        }
    }
});