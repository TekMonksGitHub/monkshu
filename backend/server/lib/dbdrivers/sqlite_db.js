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
    if (!await _initDB(path.resolve(dbConnectInfo), dbCreationSQLs)) throw "DB initialization failed.";
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
        try{await mkdirAsync(APP_CONSTANTS.DB_DIR)} catch(err){if (err.code != "EEXIST") {LOG.error(`Error creating DB dir, ${err}`); return false;}}   
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
    return new Promise(resolve => {
        if (!dbInstance[dbPath]) dbInstance[dbPath] = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE|sqlite3.OPEN_CREATE, err => {
            if (err) {LOG.error(`Error opening DB, ${err}`); dbInstance[dbPath] = null; resolve(false);} 
            else {
                dbRunAsync[dbPath] = util.promisify(dbInstance[dbPath].run.bind(dbInstance[dbPath])); 
                dbAllAsync[dbPath] = util.promisify(dbInstance[dbPath].all.bind(dbInstance[dbPath])); 
                resolve(true);
            }
        }); else resolve(true);
    });
}