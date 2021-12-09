/**
 * Watches an object and serializes it to a file 
 * if provided. This will add a custom property 
 * _org_monkshu_watched to the object.
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const fs = require("fs");
const readline = require("readline");
const conf = require(CONSTANTS.OBJOBSERVERCONF);
const ffs = require(`${CONSTANTS.LIBDIR}/FastFileWriter.js`)

/**
 * Observes an object, and serlizes all recorded changes to the given
 * file in NDJSON format. 
 * @param {object} object The object to watch
 * @param {string} file The path to the file to serialize the changes 
 * @return Returns the proxy object which should then be used instead of the given object.
 */
function observe(object, file) {
    object._org_monkshu_watched = {filewriter: ffs.createFileWriter(file, conf.fileCloseTimeOut, "utf8")};
    return new Proxy(object, {
        get: function(target, property) {return Reflect.get(target, property);},
        set: function(target, property, value) {
            _objectChanged(target, property, value);
            return Reflect.set(target, property, value);
        },
        deleteProperty: function(target, property) {
            _objectChanged(target, property);
            return Reflect.deleteProperty(target, property);
        }
    });
}

/**
 * Restores the given object from the given file.
 * @param {object} object The object to restore into
 * @param {string} file The file to restore from
 * @return The timestamp of the time till which the object was restored
 */
async function restoreObject(object, file) {
    const readstream = fs.createReadStream(file), rl = readline.createInterface({input: readstream});
    let timeTill = 0; for await (const line of rl) {
        if (object._org_monkshu_watched?.stopRestore) {delete object._org_monkshu_watched.stopRestore; break;}
        if (line.trim() == "") continue;    // skip empty lines

        const change = JSON.parse(line); timeTill = change.time;
        if (change.op == "update") object[change.property] = change.value;
        if (change.op == "delete") delete object[change.property];
    }
    rl.close(); readstream.close(); return timeTill;
}

/** 
 * Stops restoring the given object 
 * @param object    The object to stop restoring. Must be the same object that restoreObject
 *                  was called on before.
 */
const stopRestoringObject = object => object._org_monkshu_watched.stopRestore = true;

/** @return The keyname for special key added to observed objects */
const getWatchedKeyName = _ => "_org_monkshu_watched";

function _objectChanged(target, property, value) {
    const change = {op:"update", property, value, time: Date.now()}
    if (!value) {change.op = "delete"; delete change.value;}
    target._org_monkshu_watched.filewriter.queuedWrite(JSON.stringify(change)+"\n", err => {
        if (err) LOG.error("Object change serialization error "+err)});
}

module.exports = {observe, restoreObject, stopRestoringObject, getWatchedKeyName};