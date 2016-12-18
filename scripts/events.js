/**
 * Created by JovanCe on 12/3/16.
 */

define(function(require) {
    function Event(name){
        this.name = name;
        this.callbacks = [];
    }
    Event.prototype.registerCallback = function(callback){
        this.callbacks.push(callback);
    };

    function Events(){
        this.events = {};

        this.ROM_LOADED = "ROMloaded";
        this.BIOS_LOADED = "BIOSloaded";
        this.register(this.ROM_LOADED);
        this.register(this.BIOS_LOADED);
    }

    Events.prototype.register = function(eventName){
        this.events[eventName] = new Event(eventName);
    };

    Events.prototype.dispatch = function(eventName, eventArgs){
        this.events[eventName].callbacks.forEach(function(callback){
            callback(eventArgs);
        });
    };

    Events.prototype.addEventListener = function(eventName, callback){
        this.events[eventName].registerCallback(callback);
    };

    return new Events();
});
