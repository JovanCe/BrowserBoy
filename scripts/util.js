/**
 * Created by JovanCe on 11/24/16.
 */

Function.prototype.curry = function()
{
    var func = this, args = arguments;
    return function()
    {
        return func.apply(this, args);
    };
};