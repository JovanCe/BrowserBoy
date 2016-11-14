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

        this._mode = 0;
        this._line = 0;
        this._clock = {
            T:0
        };
    };

    GPU.prototype.reset = function() {
        var canvas = document.getElementById('screen');
        this._canvas = canvas.getContext('2d');
        this._screen = this._canvas.createImageData(this._swidth, this._sheight);

        // Initialise canvas to white
        this._screen.data.fill(255);
        this._refreshScreen();
    };

    GPU.prototype._refreshScreen = function() {
        this._canvas.putImageData(this._screen, 0, 0);
    };

    GPU.prototype.step = function() {
        switch(this._mode)
        {
            // OAM read mode, scanline active
            case 2:
                if(this._clock.T >= 80)
                {
                    // Enter scanline mode 3
                    this._clock.T = 0;
                    this._mode = 3;
                }
                break;

            // VRAM read mode, scanline active
            // Treat end of mode 3 as end of scanline
            case 3:
                if(this._clock.T >= 172)
                {
                    // Enter hblank
                    this._clock.T = 0;
                    this._mode = 0;

                    // Write a scanline to the framebuffer
                    this.renderScan();
                }
                break;

            // Hblank
            // After the last hblank, push the screen data to canvas
            case 0:
                if(this._clock.T >= 204)
                {
                    this._clock.T = 0;
                    this._line++;

                    if(this._line == 143)
                    {
                        // Enter vblank
                        this._mode = 1;
                        this._refreshScreen();
                    }
                    else
                    {
                        this._mode = 2;
                    }
                }
                break;

            // Vblank (10 lines)
            case 1:
                if(this._clock.T >= 456)
                {
                    this._clock.T = 0;
                    this._line++;

                    if(this._line > 153)
                    {
                        // Restart scanning modes
                        this._mode = 2;
                        this._line = 0;
                    }
                }
                break;
        }
    };

    GPU.prototype.renderScan = function() {

    };

    return new GPU();
});