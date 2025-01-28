/**
 * Timed cache, will uncache with expiry indicated. 
 * Sort of like an auto memory garbage collected cache.
 * 
 * Useful to remember things, but only for a short period.
 *  
 * (C) 2024 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

class TimedCache {
    #CACHE = {}; #expiry = 500;

    constructor(expiry=500) {this.#expiry = expiry;}
    set(key, value) {this.#CACHE[key] = value; setTimeout(_=>delete this.#CACHE[key], this.#expiry);}
    get(key) {return this.#CACHE[key];}
}

exports.newcache = expiry => new TimedCache(expiry);