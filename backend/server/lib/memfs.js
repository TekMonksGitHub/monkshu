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
 * The data to write can be a UTF8 string or a Buffer object 
 * (Buffer preferred).
 * 
 * (C) 2024 TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 */

const pathmod = require("path");
const fspromises = require("fs").promises;
const conf = require(`${CONSTANTS.CONFDIR}/memfs.json`);

const FSCACHE = {}; let memused = 0;

exports.readFile = async (path, options) => {
    path = pathmod.resolve(path);
    if (FSCACHE[path]) {
        FSCACHE[path].accesstime = Date.now();  // update last access, eg for LRU preservation
        return FSCACHE[path].data;
    }

    const data = await fspromises.readFile(path, options), stats = await fspromises.stat(path)
    if ((!options.memfs_dontcache) && _allocateMemory(stats.size)) { // cache if possible, unless explicitly disabled
        FSCACHE[path] = {data, accesstime: Date.now(), stats};
        LOG.info(`Memfs cached file ${path} using ${data.length} bytes of memory, total cache size is ${memused} bytes.`);
        return FSCACHE[path].data;
    } else return data;
}

exports.writeFile = async (path, data, options) => {
    path = pathmod.resolve(path);
    if (FSCACHE[path]) {
        FSCACHE[path] = {data, accesstime: Date.now(), stats: await fspromises.stat(path)};
        fspromises.writeFile(path, data, options);  // no need for await as file is cached and read will be via the cache
    } else await fspromises.writeFile(path, data, options);
}

exports.appendFile = async (path, data, options) => {
    path = pathmod.resolve(path);
    if (FSCACHE[path]) {
        FSCACHE[path] = {data: typeof data === "string" ? FSCACHE[path].data + data :
            Buffer.concat([Buffer.from(FSCACHE[path].data), Buffer.from(data)]), accesstime: Date.now(), 
            stats: await fspromises.stat(path)};
        fspromises.appendFile(path, data, options);  // no need for await as file is cached and read will be via the cache
    } else await fspromises.appendFile(path, data, options);
}

exports.unlink = async path => {
    path = pathmod.resolve(path);
    if (FSCACHE[path]) fspromises.unlink(path); else await fspromises.unlink(path);
    delete FSCACHE[path];
}

exports.unlinkIfExists = async path => {
    const safe_unlink = async path => {try{await fspromises.unlink(path)} catch(err){if (err.code != "ENOENT") throw err;}}
    path = pathmod.resolve(path);
    if (FSCACHE[path]) safe_unlink(path); else await safe_unlink(path);
    delete FSCACHE[path];
}

exports.readdir = (path, options) => fspromises.readdir(path, options);

exports.mkdir = (path, options) => fspromises.mkdir(path, options);

exports.access = (path, mode) => fspromises.access(path, mode);

exports.rm = async (path, options) => {
    path = pathmod.resolve(path);
    if (FSCACHE[path]) fspromises.rm(path, options); else await fspromises.rm(path, options);
    delete FSCACHE[path];
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