/**
 * Created by JovanCe on 12/3/16.
 */

define(function(require) {
    function Event(name){
        this.name = name;
        this.callbacks = [];

        this.ROMLoaded = "ROMloaded";
        this.BIOSLoaded = "BIOSloaded";
    }
    Event.prototype.registerCallback = function(callback){
        this.callbacks.push(callback);
    };

    function Events(){
        this.events = {};
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
