/** 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

////////////////////////////////////////////////
// Cookieless HTML5 Session Support
////////////////////////////////////////////////    

let _internalHash = {};   // within the same browser tab (unless refreshed) makes sure get returns same objects.

const set = (key, item) => {
    const value = JSON.stringify(item);
    if (key && item) {_internalHash[key] = item; sessionStorage.setItem(key, value);}
}
const get = (key, initIfUndefined) => {
    if ((!_internalHash[key]) && sessionStorage.getItem(key)) _internalHash[key] = JSON.parse(sessionStorage.getItem(key));
    return _internalHash[key]?_getProxy(_internalHash[key], key):initIfUndefined?_getProxy(initIfUndefined):undefined;
}
const remove = key => {delete _internalHash[key]; sessionStorage.removeItem(key);}
const destroy = _ => {sessionStorage.clear(); _internalHash = {};}
const contains = key => get(key)?true:false;
const keys = _ => Object.keys(_internalHash||sessionStorage);

class NativeWrapper {   // allows proxying strings and numbers
    constructor(native) {this.native = native;}
    toString() {return this.native;}
    valueOf() {return this.native;}
    [Symbol.toPrimitive](_hint) {return this.native;}
    toJSON() {return this.native;}
}

function _getProxy(object, sessionKey) {
    const _isProxyAlready = object => object["_______org_monkshu_clientwebsession_wrapped_object_______"] != null;
    const _getObjectToWrap = object => typeof object == "string" || typeof object == "number" || 
        typeof object == "boolean" || typeof object == "bigint" ? new NativeWrapper(object) : object;
    
    const handler = {
        set(target, property, value) {  // modify session object
            target[property] = value;
            session.set(sessionKey, object);
            return true;    // we were able to modify the property
        },

        get(target, property) { // intercept for NativeWrappers to convert them to JSON
            if (property == "toJSON") {return target.toJSON} 
            if (property == "_______org_monkshu_clientwebsession_wrapped_object_______") return target;
            else if ( (typeof target[property] === "object") && (target[property] !== null) ) {
                const objectToWrap = _getObjectToWrap(target[property]);
                if (_isProxyAlready(objectToWrap)) return objectToWrap; else return new Proxy(objectToWrap, handler);
            }
            else return target[property];
        }
    }

    const objectToWrap = _getObjectToWrap(object);
    if (_isProxyAlready(objectToWrap)) return objectToWrap; else return new Proxy(objectToWrap, handler);
}

export const session = {set, get, remove, destroy, contains, keys};