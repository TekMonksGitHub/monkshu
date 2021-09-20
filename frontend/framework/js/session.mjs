/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

////////////////////////////////////////////////
// Cookieless HTML5 Session Support
////////////////////////////////////////////////    

const set = (key, item) => {
    const value = JSON.stringify(item);
    if (key && item) sessionStorage.setItem(key, value);
}
const get = key => sessionStorage.getItem(key) ? _getProxy(JSON.parse(sessionStorage.getItem(key)),key) : undefined;
const remove = key => sessionStorage.removeItem(key);
const destroy = _ => sessionStorage.clear();
const contains = key => get(key)?true:false;
const keys = _ => Object.keys(sessionStorage);

class NativeWrapper {   // allows proxying strings and numbers
    constructor(native) {this.native = native;}
    toString() {return this.native;}
    valueOf() {return this.native;}
    [Symbol.toPrimitive](_hint) {return this.native;}
    toJson() {return this.native;}
}

function _getProxy(object, key) {
    const handler = {
        set(target, property, value) {  // modify session object
            target[property] = value;
            session.set(key, object);
            return true;    // we were able to modify the property
        },

        get(target, name) { // intercept for NativeWrappers to convert them to JSON
            if (name == "toJSON") {return target.toJson} 
            else if (typeof target[name] === 'object' && target[name] !== null) return new Proxy(target[name], handler);
            else return target[name];
        }
    }

    return new Proxy(typeof object == "string" || typeof object == "number" || typeof object == "boolean" || typeof object == "bigint"?new NativeWrapper(object):object, handler);
}

export const session = {set, get, remove, destroy, contains, keys};