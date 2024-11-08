/**
 * Memory based caching filesystem - uses CPU RAM for cache. 
 * Algo is LRU for ejection. Tries to be compatible with 
 * fs.promises in NodeJS.
 * 
 * This module does not watch the file on the filesystem for
 * external modifications. So if it is being used then read and 
 * write - both - must be routed through this module for cache
 * coherency.
 * 
 * Also active caching is on READ only, not WRITES. So writes must
 * go on to the disk if the file is not cached already as the replay
 * log can be corrupted otherwise (eg told to create a directory, cached it
 * as an op, then told to write a file which is not cached, so it will write
 * to the disk, but the directly op is still pending in the replay log).
 * 
 * The data to write can be a UTF8 string or a Buffer object 
 * (Buffer preferred).
 * 
 * (C) 2024 TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 */

const pathmod = require("path");
const fspromises = require("fs").promises;
const conf = require(`${CONSTANTS.CONFDIR}/memfs.json`);

const NATIVE_FS = fspromises, FSCACHE = {}, PENDING_PROMISES=[]; let memused = 0, flush_resolver, flush_promise;

exports.readFile = async (path, options) => {
    path = pathmod.resolve(path);
    if (FSCACHE[path] && (!FSCACHE[path].deleted)) {
        FSCACHE[path].accesstime = Date.now();  // update last access, eg for LRU preservation
        LOG.info(`memfs cache hit ${path}`);
        return FSCACHE[path].data;
    }

    LOG.info(`memfs cache miss ${path}`);
    const data = await _runNativeFSFunction("readFile", [path, options]), 
        stats = await _runNativeFSFunction("stat", [path]);
    if ((!options?.memfs_dontcache) && _allocateMemory(stats.size)) { // cache if possible, unless explicitly disabled
        FSCACHE[path] = {data, accesstime: Date.now(), stats};
        LOG.info(`Memfs cached file ${path} using ${data.length} bytes of memory, total cache size is ${memused} bytes.`);
        return FSCACHE[path].data;
    } else return data;
}

exports.writeFile = async (path, data, options) => {
    path = pathmod.resolve(path);
    if (FSCACHE[path]) {
        delete FSCACHE[path].deleted;   // file is no longer deleted
        FSCACHE[path].data = data; FSCACHE[path].accesstime = Date.now(); FSCACHE[path].stats.size = Buffer.from(data).length;  // update data, last access and sizes
        _addPendingPromises(_=>_runNativeFSFunction("writeFile", [path, data, options]));  // no need for await as file is cached and read will be via the cache
    } else await _runNativeFSFunction("writeFile",[path, data, options]); // we don't cache on writes, unless already cached
}

exports.appendFile = async (path, data, options) => {
    path = pathmod.resolve(path);
    if (FSCACHE[path]) {
        if (FSCACHE[path].deleted) return exports.writeFile(path, data, options);   // it was deleted so append is a write
        FSCACHE[path].data = typeof data === "string" ? FSCACHE[path].data + data :
            Buffer.concat([Buffer.from(FSCACHE[path].data), Buffer.from(data)]);    // add data
        FSCACHE[path].accesstime = Date.now();                                      // update last access timestamp
        FSCACHE[path].stats.size += Buffer.from(data).length                        // update size
        _addPendingPromises(_=>_runNativeFSFunction("appendFile", [path, data, options]));  // no need for await as file is cached and read will be via the cache
    } else try{
        await _runNativeFSFunction("appendFile",[path, data, options]);    // we don't cache on writes, unless already cached
    } catch (err) {_handleError(err, "appendFile")}
}

exports.stat = async path => FSCACHE[path]?.stats || await _runNativeFSFunction("stat",[path]);   // if cached, we have the stats

exports.unlink = async path => {
    path = pathmod.resolve(path);
    _addPendingPromises(async _ => {
        await _runNativeFSFunction("unlink",[path]); if (FSCACHE[path]?.deleted) delete FSCACHE[path];});
    _setPathDeleted(path);  // will ensure read doesn't read it, even if the disk has this
}

exports.unlinkIfExists = async path => {
    path = pathmod.resolve(path);
    const safe_unlink = async path => {
        try{await _runNativeFSFunction("unlink",[path],true); if (FSCACHE[path]?.deleted) delete FSCACHE[path]; } 
        catch(err) {if (err.code != "ENOENT") throw err;}
    }
    _addPendingPromises(_=>safe_unlink(path));
    _setPathDeleted(path);  // will ensure read doesn't read it, even if the disk has this
}

exports.readdir = async (path, options) => (await _runNativeFSFunction("readdir",[path, options])).filter(  // filter out deleted files (they may still be on the disk)
    entry => FSCACHE[pathmod.resolve(path+"/"+(entry.name||entry.toString()))]?.deleted != true);   // entry.name||entry.toString() takes care of string names, dirent object and buffer objects

exports.mkdir = (path, options) => _runNativeFSFunction("mkdir",[path, options]); // can't cache this easily, anyways it doesn't take long

exports.rmdir = (path, options) => _runNativeFSFunction("rmdir",[path, options]);  // can't cache this easily, anyways it doesn't take long

exports.access = async (path, mode) => {
    if (FSCACHE[pathmod.resolve(path)]?.deleted) return false;  // deleted in memory, no need to check the disk
    if (FSCACHE[pathmod.resolve(path)]) return true;   // have it locally and it is not deleted
    else return await _runNativeFSFunction("access",[path, mode]);    // go to the disk
}

exports.rm = async (path, options) => {
    path = pathmod.resolve(path);
    _addPendingPromises(async _ => {
        await _runNativeFSFunction("rm",[path, options]); 
        if (options?.recursive) for (const pathToTest of Object.keys(FSCACHE)) 
            if (pathToTest.startsWith(path)) delete FSCACHE[pathToTest];    // remove nested entries as parent dir went away
        if (FSCACHE[path]?.deleted) delete FSCACHE[path];
    }); 
    if (options?.recursive) for (const pathToTest of Object.keys(FSCACHE)) 
        if (pathToTest.startsWith(path)) _setPathDeleted(pathToTest);    // remove nested entries as parent dir went away
    _setPathDeleted(path);  // will ensure read doesn't read it, even if the disk has this
}

exports.flush = _ => {
    if (!flush_promise) flush_promise = new Promise(resolve=>flush_resolver=resolve);
    return flush_promise;
}

async function _runNativeFSFunction(functionName, params, noerrorOnException) {
    try {
        if (conf.debug_all_ops) LOG.info(`memfs running ${functionName} with params ${JSON.stringify(params)}`);
        return await NATIVE_FS[functionName](...params);
    } catch (err) {
        if (noerrorOnException) return; // this means that an exception is expected and ok
        LOG.error(`memfs ${functionName} error in the native FS: ${err}`);
        throw err;
    }
}

function _addPendingPromises(async_function) {
    const wrapper = async _ => {
        await async_function(); 
        if (PENDING_PROMISES.length) (PENDING_PROMISES.pop())();    // runs the wrapper
        else if (flush_resolver) {flush_resolver(); flush_resolver = undefined; flush_promise = undefined;}  // tell flush all work is done for now
    };
    PENDING_PROMISES.unshift(wrapper);
    if (PENDING_PROMISES.length == 1) (PENDING_PROMISES.pop())();   // start the loop if needed
}

function _allocateMemory(size) {
    if (size > conf.memsize) return false;  // the chunk is just too big to cache

    if (memused+size <= conf.memsize) {
        memused += size;
        return true;   // we have enough mem already
    }
    
    (this["_freeMemory"+conf.algo]||_freeMemoryLRU)(memused+size-conf.memsize); // default to LRU

    memused += size;
    LOG.info(`Memfs allocated ${size} bytes, total memory cache size now is ${memused} bytes.`)
    return true;
}

function _freeMemoryLRU(sizeToFree) {
    const entries = Object.entries(FSCACHE), sortedEntries = entries.sort((a,b) => 
        FSCACHE[a].accesstime < FSCACHE[b].accesstime ? -1 : FSCACHE[a].accesstime > FSCACHE[b].accesstime ? 1 : 0);
    let freed = 0; for (const oldestEntry of sortedEntries) {
        freed += FSCACHE[oldestEntry].stats.size; 
        LOG.info(`Memfs uncached file ${oldestEntry} for size ${FSCACHE[oldestEntry].stats.size} bytes.`);
        delete FSCACHE[oldestEntry];  // delete ejects it from cache, freeing memory
        if (freed >= sizeToFree) break;
    }
    memused -= freed;
    LOG.info(`Memfs freed memory ${freed} bytes.`);
}

function _setPathDeleted(path) {
    if (!FSCACHE[path]) return;
    FSCACHE[path].deleted = true;
}