/** 
 * File caching extension for frontend HTTPD.
 * 
 * Will return cached files, and runs a regular 
 * file watcher. Also compresses cached data, reducing
 * CPU needed to handle requests.
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */
const fs = require("fs");
const path = require("path");
const fspromises = fs.promises;
const crypto = require("crypto");
const utils = require(conf.libdir+"/utils.js");
const SIZE_KEY = "__org_monkshu_httpd_cache_size_key___";
const gzipAsync = require("util").promisify(require("zlib").gzip);
const IGNORE_AFTER_MAX_HITS = conf.diskCache.ignoreAfterMaxHits||10;   // don't keep trying to read disk for 404 files

const cache = {}, uncacheableREs = []; 
let error, minifier, htmlMinifier, cssMinifier; 
try {minifier = require (conf.diskCache.minifier||"terser")} catch (err) {};
try {htmlMinifier = require ("html-minifier")} catch (err) {};
try {const CleanCSS = require ("clean-css"); cssMinifier = new CleanCSS();} catch (err) {};

exports.name = "diskcache";

exports.initSync = (_accessLog, errorLog) => {
    if (conf.diskCache && conf.diskCache.refresh != 0) utils.setIntervalImmediately(_=>{
        _runCachingDeamon(conf.webroot); _purgeDeletedFiles(conf.webroot); }, conf.diskCache.refresh||1000);
    if (conf.diskCache.maxSizeInMB) conf.diskCache.maxSize = conf.diskCache.maxSizeInMB*1024*1024;
    if (conf.diskCache.dontCache) for (const re of conf.diskCache.dontCache) uncacheableREs.push(new RegExp(re));
    cache[SIZE_KEY] = 0; error = errorLog;
}

exports.processRequest = async (req, res, dataSender, _errorSender, codeSender, _access, _error) => {
    if (!conf.diskCache || conf.diskCache.refresh == 0) return false;   // disk caching is disabled

    const pathname = new URL(req.url, `http://${req.headers.host}/`).pathname;

	let fileRequested = path.resolve(conf.webroot+"/"+pathname);
    const indexRequested = path.resolve(fileRequested+"/"+conf.indexfile);
    if (!cache[fileRequested] && cache[indexRequested]) fileRequested = indexRequested; // is an index request

    if (!cache[fileRequested]) cache[fileRequested] = {hits: 0}; cache[fileRequested].hits++;
    if (!cache[fileRequested].data && conf.diskCache.maxSize) _tryToCache(fileRequested, cache[fileRequested].hits);    // run LRU if there are size limits

    if (cache[fileRequested] && cache[fileRequested].data && fileRequested != SIZE_KEY) {
        const eTagMatches = utils.etagsMatch(req.headers["if-none-match"], cache[fileRequested].etag);
        if (eTagMatches) codeSender(req, res, 304, "No change."); else dataSender(res, 200, {
            "Content-Type": cache[fileRequested].mime, 
            "Content-Length": cache[fileRequested].size,
            "Last-Modified": cache[fileRequested].modified,
		    "ETag": cache[fileRequested].etag,
            "Content-Encoding": cache[fileRequested].encoding,
        }, cache[fileRequested].data);
        return true;
    } else return false;    // cache miss or non-cacheable asset
}

async function _runCachingDeamon(pathIn) {
    const _isCacheStale = (pathThis, stats) => {
        const cacheEntry = cache[path.resolve(pathThis)];
        return (cacheEntry && cacheEntry.mtimeMs == stats.mtimeMs && cacheEntry.sizeUncompressed == stats.size)?false:true;
    }

    const statsIn = await fspromises.stat(pathIn); 
    if (!statsIn.isDirectory() && _isCacheStale(pathIn, statsIn)) _cacheThis(pathIn, statsIn, 0);
    else for (const file of await fspromises.readdir(pathIn)) {
        const pathThis = `${pathIn}/${file}`, stats = await fspromises.stat(pathThis);
        if (!_isCacheStale(pathThis, stats)) continue;  // already cached and current

        if (conf.diskCache.maxSize && cache[SIZE_KEY] > conf.diskCache.maxSize) break;    // size exceeded
        
        if (stats.isDirectory()) _runCachingDeamon(pathThis); else _cacheThis(pathThis, stats, 0);
    }
}

async function _purgeDeletedFiles(webroot) {
    const findAllFiles = async (dir, all_files) => {
        const stats = await fspromises.stat(dir); if (!stats.isDirectory()) all_files.push(path.resolve(dir)); 
        else for (const dirent of await fspromises.readdir(dir, {withFileTypes: true})) {
            const pathThis = `${dir}/${dirent.name}`;
            if (!dirent.isFile()) await findAllFiles(pathThis, all_files); else all_files.push(path.resolve(pathThis));
        }
    }

    const all_files = []; await findAllFiles(webroot, all_files);

    for (const entry in cache) if (!all_files.includes(entry) && entry != SIZE_KEY && entry.data) { // file was deleted
        cache[SIZE_KEY] -= cache[entry].data.length; delete cache[entry]; }
}

async function _cacheThis(pathThis, stats, hits) {
    for (const re of uncacheableREs) if (path.resolve(pathThis).match(re)) return;    // not cacheable
    try {await fspromises.access(pathThis, fs.constants.R_OK)} catch(err) {return}; // bad path

    if (!stats) stats = await fspromises.stat(pathThis); 
    const mime = conf.mimeTypes[path.extname(pathThis)]||"application/octet-stream";
    let data = await fspromises.readFile(pathThis); const sizeUncompressed = data.length;
    
    if (conf.diskCache.autoUglifyJS && mime == "text/javascript" && minifier) {
        try{data = (await minifier.minify(data.toString("utf8"), {compress: true, mangle: true})).code } catch (err) {error.error(`Path: ${pathThis}, auto uglify failed due to ${err}`)}; }
    else if (conf.diskCache.autoUglifyJS && mime == "text/javascript" && !minifier) error.error(`Path: ${pathThis}, auto uglify selected, but terser is not installed.`);

    if (conf.diskCache.autoMinifyHTML && mime == "text/html" && htmlMinifier) {
        try{data = htmlMinifier.minify(data.toString("utf8"), {removeComments: true, collapseWhitespace: true, minifyCSS: true, minifyJS: true}) } catch (err) {error.error(`Path: ${pathThis}, auto HTML minify failed due to ${err}`)}; }
    else if (conf.diskCache.autoMinifyHTML && mime == "text/html" && !htmlMinifier) error.error(`Path: ${pathThis}, auto minifyHTML selected, but html-minify is not installed.`);

    if (conf.diskCache.autoMinifyCSS && mime == "text/css" && cssMinifier) {
        try{
            const cssResult = cssMinifier.minify(data.toString("utf8")); 
            if (!cssResult.errors.length) data = cssResult.styles; else throw `Errors in CSS minification ${cssResult.errors}`
        } catch (err) {error.error(`Path: ${pathThis}, auto CSS minify failed due to ${err}`)}; }
    else if (conf.diskCache.autoMinifyCSS && mime == "text/css" && !cssMinifier) error.error(`Path: ${pathThis}, auto minifyCSS selected, but clean-css is not installed.`);

    if (_canCompress(mime)) data = await gzipAsync(data);

    cache[path.resolve(pathThis)] = {
        modified: stats.mtime.toUTCString(), mtimeMs: stats.mtimeMs,
        mime, data, encoding: _canCompress(mime)?"gzip":"identity",
        etag: crypto.createHash("md5").update(data).digest("hex"),
        size: data.length, hits, sizeUncompressed
    }
    cache[SIZE_KEY] += data.length;
}

async function _tryToCache(pathThis, hits) {
    if ((conf.diskCache.maxSize && cache[SIZE_KEY] < conf.diskCache.maxSize) || (hits > IGNORE_AFTER_MAX_HITS)) return; // not cached for some other reasons
    
    let leastHits = 0, entryToEvict;
    for (const [key, entry] of Object.entries(cache)) if (entry.hits < leastHits) {leastHits = entry.hits; entryToEvict = key;}

    if (entryToEvict && leastHits < hits) {delete cache[entryToEvict]; await _cacheThis(pathThis, null, hits);}
}

const _canCompress = mime => mime && (!Array.isArray(mime) || Array.isArray(mime) && mime[1]);
