/** 
 * sqlite_db.js - DB driver. Auto creates the DB with the DDL if needed.
 * This version uses SQLite.
 * 
 * (C) 2020 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
const fs = require("fs");
const path = require("path");
const util = require("util");
const sqlite3 = require("sqlite3");
const mkdirAsync = util.promisify(fs.mkdir);
const accessAsync = util.promisify(fs.access);
const rest = require(`${CONSTANTS.LIBDIR}/rest.js`);
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);
const conf = require(`${CONSTANTS.CONFDIR}/db.json`).sqlite_db||{};

let dbInstance = [], dbRunAsync = [], dbAllAsync = [];

/**
 * Runs the given SQL command e.g. insert, delete etc.
 * @param {string} cmd The command to run
 * @param {array} params The params for SQL
 * @param {string} dbConnectInfo DB connection info. For this driver it is the path to the DB file.
 * @param {array} dbCreationSQLs The DB creation SQLs as string array, else default is used from the constants
 * @return true on success, and false on error
 */
exports.runCmd = async (cmd, params=[], dbConnectInfo, dbCreationSQLs) => {
    if (_isNetworkPath(dbConnectInfo)) return await _networkCall("runCmd", [cmd, params], dbConnectInfo, dbCreationSQLs);

    dbConnectInfo = path.resolve(dbConnectInfo);
    if (!(await _initDB(dbConnectInfo, dbCreationSQLs))) {LOG.error(`DB error running, ${cmd}, with params ${params}, error: DB Init Error`) ; return false;}
    params = Array.isArray(params)?params:[params];
    try {await dbRunAsync[dbConnectInfo](cmd, params); return true}
    catch (err) {LOG.error(`DB error running, ${cmd}, with params ${params}, error: ${err}`); return false;}
}

/**
 * Runs the given query e.g. select and returns the rows from the result.
 * @param {string} cmd The command to run
 * @param {array} params The params for SQL
 * @param {string} dbConnectInfo DB connection info. For this driver it is the path to the DB file.
 * @param {array} dbCreationSQLs The DB creation SQLs as string array
 * @return rows array on success, and false on error. The returned array contains row data as JSON objects.
 */
exports.getQuery = async(cmd, params=[], dbConnectInfo, dbCreationSQLs) => {
    if (_isNetworkPath(dbConnectInfo)) return await _networkCall("getQuery", [cmd, params], dbConnectInfo, dbCreationSQLs);

    dbConnectInfo = path.resolve(dbConnectInfo);
    if (!(await _initDB(dbConnectInfo, dbCreationSQLs))) {LOG.error(`DB error running, ${cmd}, with params ${params}, error: DB Init Error`) ; return false;}
    params = Array.isArray(params)?params:[params];
    try {const rows = await dbAllAsync[dbConnectInfo](cmd, params); return rows}
    catch (err) {LOG.error(`DB error running, ${cmd}, with params ${params}, error: ${err}`); return false;}
}

/**
 * Inits the database.
 * @param {string} dbConnectInfo DB connection info. For this driver it is the path to the DB file.
 * @param {array} dbCreationSQLs The DB creation SQLs as string array
 */
exports.init = async (dbConnectInfo, dbCreationSQLs) => {
    if (_isNetworkPath(dbConnectInfo)) {
        await _listenDB(dbConnectInfo);
        return await _networkCall("init", undefined, dbConnectInfo, dbCreationSQLs);
    } else if (!await _initDB(path.resolve(dbConnectInfo), dbCreationSQLs)) throw "DB initialization failed.";
}

/**
 * Runs the given array of commands as an ACID transaction.
 * @param {array} cmdObjs Array of {cmd: "command_to_run", params: []} objects which will be run as a single transaction.
 * @param {string} dbConnectInfo DB connection info. For this driver it is the path to the DB file.
 * @param {array} dbCreationSQLs The DB creation SQLs as string array
 * @returns true on success, and false on error
 */
exports.runTransaction = async (cmdObjs, dbConnectInfo, dbCreationSQLs) => {
    if (_isNetworkPath(dbConnectInfo)) return await _networkCall("runTransaction", [cmdObjs], dbConnectInfo, dbCreationSQLs);

    const cmdsToRun = [{cmd: "BEGIN TRANSACTION", params: []}, ...cmdObjs, {cmd: "COMMIT", params: []}];
    for (const cmdObj of cmdsToRun) if (!(await exports.runCmd(cmdObj.cmd, cmdObj.params, dbConnectInfo, dbCreationSQLs)))
        {await exports.runCmd("ROLLBACK", [], dbConnectInfo, dbCreationSQLs); return false;}
    return true;
}

/**
 * Listens as an API for database calls, for networked SQLite server operation.
 * @param {object} jsonReq Incoming request in {method, params, path: db_path, dbCreationSQLs} format
 * @returns The raw result of the call 
 */
exports.doService = async jsonReq => {
    const _validateRequest = jsonReq => jsonReq && jsonReq.method && jsonReq.params && jsonReq.path && jsonReq.dbCreationSQLs;
    if (!_validateRequest(jsonReq)) {LOG.error("SQLite DB API validation failure."); return CONSTANTS.FALSE_RESULT;}
    
    const function_arguments = [...(jsonReq.params||[]), jsonReq.path, jsonReq.dbCreationSQLs];
    try {
        const dbresult = await module.exports[jsonReq.method](...function_arguments);
        return {dbresult, result: true};
    } catch (err) {return CONSTANTS.FALSE_RESULT;}
}

async function _listenDB(dbConnectInfo) {
    const listeningHostsRaw = new URL(dbConnectInfo).hostname.split(",");
    let localIPs = utils.getLocalIPs(), weNeedToListen = false;
    for (const listeningHostRaw of listeningHostsRaw) { // all the DB hosts DNS
        const listeningHostsThis = await utils.dnsResolve(listeningHostRaw);
        for (const listeningHostThis of listeningHostsThis) // one DNS can be multiple IPs
            if (localIPs.includes(listeningHostThis.address)) {weNeedToListen = true; break;}   // if any of those final IPs is our local IP as well, then listen
    }
    if (weNeedToListen) APIREGISTRY.addAPI(conf.api_path, `${CONSTANTS.ROOTDIR}/${conf.api_entry}`, undefined, true); // this makes us listen as an API
}

async function _networkCall(method, params=[], dbConnectInfo, dbCreationSQLs) {
    const urlConnection = new URL(dbConnectInfo), path = urlConnection.pathname, 
        hosts = urlConnection.hostname.split(","), port = urlConnection.port||conf.api_default_port;
    let lastError = `Network call failed for method ${method} in SQLite database.`; 
    for (let i = 0; i < hosts.length; i++) {  // try all hosts one by one for the first one that succeeds
        const host = hosts[i]; try {    
            const request = {method, params, dbCreationSQLs, path}, headers = {"x-api-key": conf.api_key};
            const result = await rest[conf.secure?"postHttps":"post"](host, port, conf.api_path, headers, request); 
            if (result && (!result.error) && result.data && (result.data.result)) return result.data.dbresult;
        } catch (err) {lastError = err; LOG.error(`Network error in SQLite database call: ${lastError.toString()}`)}
    }
    throw lastError;
}

const _isNetworkPath = dbConnectInfo => {
    try {
        const protocolTest = new URL(dbConnectInfo).protocol.toLowerCase();
        return protocolTest == "sqlite:"; 
    } catch (err) {return false;}
}

async function _initDB(dbPath, dbCreationSQLs) {
    if (!(await _createDB(dbPath, dbCreationSQLs))) return false;
    if (!(await _openDB(dbPath))) return false; else return true;
}

async function _createDB(dbPath, dbCreationSQLs) {
    try {
        await accessAsync(dbPath, fs.constants.F_OK | fs.constants.W_OK); 
        return true;
    } catch (err) {  // db doesn't exist
        LOG.error("DB doesn't exist, creating and initializing");
        try{await mkdirAsync(path.dirname(dbPath))} catch(err){if (err.code != "EEXIST") {LOG.error(`Error creating DB dir, ${err}`); return false;}}   
        if (!(await _openDB(dbPath))) return false; // creates the DB file
        
        for (const dbCreationSQL of dbCreationSQLs) {
            if (!dbCreationSQL.trim().startsWith("/*")) try{await dbRunAsync[dbPath](dbCreationSQL, [])} catch(err) {
                LOG.error(`DB creation DDL failed on: ${dbCreationSQL}, due to ${err}`); 
                return false;
            }
        }
        LOG.info("DB created successfully."); return true;
    }
}

function _openDB(dbPath) {
    const dbOpenPromise = new Promise(async resolve => {
        if (!dbInstance[dbPath]) {
            const dbInstanceTemp = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE|sqlite3.OPEN_CREATE, err => {
                if (err) {LOG.error(`Error opening DB, ${err}`); dbInstance[dbPath] = null; resolve(false);} 
                else {
                    dbRunAsync[dbPath] = util.promisify(dbInstanceTemp.run.bind(dbInstanceTemp)); 
                    dbAllAsync[dbPath] = util.promisify(dbInstanceTemp.all.bind(dbInstanceTemp)); 
                    dbInstance[dbPath] = dbInstanceTemp;
                    resolve(true);
                }
            }); 
        } 
        else if (dbInstance[dbPath] instanceof Promise) {
            const result = await dbInstance[dbPath]; resolve(result) }
        else return resolve(true);  
    });
    if (!dbInstance[dbPath]) dbInstance[dbPath] = dbOpenPromise;
    return dbOpenPromise;
}