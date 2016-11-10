/**
 * Created by JovanCe on 11/9/16.
 */

define(["lodash", "MemoryManager"], function(_, MM) {
    var GPU = function() {
        // canvas 2d context object
        this._canvas = null;
        // backing ImageData object
        this._screen = null;

        this._swidth = 160;
        this._sheight = 144;
    };

    GPU.prototype.reset = function() {
        var canvas = document.getElementById('screen');
        this._canvas = canvas.getContext('2d');
        this._screen = this._canvas.createImageData(this._swidth, this._sheight);
        
        // Initialise canvas to white
        this._screen.data.fill(255);
        this._canvas.putImageData(this._screen, 0, 0);
    };

    return new GPU();
});