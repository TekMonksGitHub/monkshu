/** 
 * db.js - DB driver subsystem. Supports pluggable DB drivers.
 * 
 * The following functions are available from any driver returned by the
 * getDBDriver call.
 * 
 * aysnc function init()
 * Initializes the database. Throws error if the initialization fails.
 * 
 * async function runCmd(cmd, params=[])
 * Runs the given SQL command e.g. insert, delete etc.
 * @param {string} cmd The command to run
 * @param {array} params The params for SQL
 * @return true on success, and false on error
 * 
 * async function runTransaction(cmdObjs)
 * Runs the given commands as an ACID transaction. If it returns false then
 * it would roll the transaction back automatically.
 * @param {array} cmdObjs Array of {cmd: "command_to_run", params: []} objects which will be run as a single transaction.
 * @return true on success, and false on error
 *
 * async function getQuery(cmd, params=[])
 * Runs the given query e.g. select and returns the rows from the result.
 * @param {string} cmd The command to run
 * @param {array} params The params for SQL
 * @return rows array on success, and false on error. The returned array contains row data as JSON objects.
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

/**
 * Returns the DB driver requested.
 * @param {string} driver The DB driver needed.
 * @param {string} dbConnectInfo DB connection info. For example, for SQLite it is the path to the DB file.
 * @param {array} dbCreationSQLs The DB creation SQLs as string array, else default is used from the constants.
 * @returns Returns the DB driver requested, throws an exception if not found.
 */
exports.getDBDriver = (driver, dbConnectInfo, dbCreationSQLs) => {
    const dbDriver = require(`${global.CONSTANTS?.MONKSHU_BACKEND?CONSTANTS.LIBDIR:__dirname}/dbdrivers/${driver}_db.js`);
    return { 
        init: _ => dbDriver.init(dbConnectInfo, dbCreationSQLs),
        runCmd: (cmd, params) => dbDriver.runCmd(cmd, params, dbConnectInfo, dbCreationSQLs),
        getQuery: (cmd, params) => dbDriver.getQuery(cmd, params, dbConnectInfo, dbCreationSQLs),
        runTransaction: cmdObjs => dbDriver.runTransaction(cmdObjs, dbConnectInfo, dbCreationSQLs)
    };
}