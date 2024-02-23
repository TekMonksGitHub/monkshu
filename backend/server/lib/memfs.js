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
    if (_allocateMemory(stats.size)) { // cache if possible
        FSCACHE[path] = {data, accesstime: Date.now(), stats};
        LOG.info(`Memfs cached file ${path} using ${data.length} bytes of memory, total cache size is ${memused} bytes.`);
        return FSCACHE[path].data;
    } else return data;
}

exports.writeFile = async (path, data, options) => {
    path = pathmod.resolve(path);
    await fspromises.writeFile(path, data, options);
    FSCACHE[path] = {data, accesstime: Date.now(), stats: await fspromises.stat(path)};
}

function _allocateMemory(size) {
    if (size > conf.memsize) return false;  // file is just too big to cache

    if (memused+size <= conf.memsize) {
        memused += size;
        return true;   // we have enough mem already
    }
    
    (this["_freeMemory"+conf.algo]||_freeMemoryLRU)(memused+size-conf.memsize); // default to LRU

    memused += size;
    LOG.info(`Memfs allocated ${size} bytes, total FS cache size now is ${memused} bytes.`)
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