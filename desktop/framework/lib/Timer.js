/* 
 * Timer.js - Resetable timer
 * 
 * (C) 2018 TekMonks. All rights reserved.
 */

class Timer {
    constructor(t, fn) {
        this.fn = fn;
        this.timeout = t;

        this.timer = setTimeout(this.fn, this.timeout);
    }

    reset() {
        clearTimeout(this.timer);
        this.timer = setTimeout(this.fn, this.timeout);
    }
}

exports.createTimer = (time, onTimeout) => {return new Timer(time, onTimeout);} 