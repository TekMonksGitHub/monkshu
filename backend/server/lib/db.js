/** 
 * db.js - DB driver subsystem. Supports pluggable DB drivers.
 * 
 * The following functions are available from any driver returned by the
 * getDBDriver call.
 * 
 * aysnc function init(dbConnectInfo, dbCreationSQLs)
 * Initializes the database. Throws error if the initialization fails.
 * @param {string} dbConnectInfo DB connection info. This depends on each database driver.
 * @param {array} dbCreationSQLs The DB creation SQLs as string array
 * 
 * async function runCmd(cmd, params=[], dbConnectInfo, dbCreationSQLs)
 * Runs the given SQL command e.g. insert, delete etc.
 * @param {string} cmd The command to run
 * @param {array} params The params for SQL
 * @param {string} dbConnectInfo DB connection info. This depends on each database driver.
 * @param {array} dbCreationSQLs The DB creation SQLs as string array
 * @return true on success, and false on error
 *
 * async function getQuery(cmd, params=[], dbConnectInfo, dbCreationSQLs)
 * Runs the given query e.g. select and returns the rows from the result.
 * @param {string} cmd The command to run
 * @param {array} params The params for SQL
 * @param {string} dbConnectInfo DB connection info. This depends on each database driver.
 * @param {array} dbCreationSQLs The DB creation SQLs as string array
 * @return rows array on success, and false on error. The returned array contains row data as JSON objects.
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

/**
 * Returns the DB driver requested.
 * @param {string} driver The DB driver needed.
 * @param {string} dbConnectInfo DB connection info. For this driver it is the path to the DB file.
 * @param {array} dbCreationSQLs The DB creation SQLs as string array, else default is used from the constants.
 * @returns Returns the DB driver requested, throws an exception if not found.
 */
exports.getDBDriver = (driver, dbConnectInfo, dbCreationSQLs) => {
    const dbDriver = require(`${CONSTANTS.LIBDIR}/dbdrivers/${driver}_db.js`);
    return { 
        init: _ => dbDriver.init(dbConnectInfo, dbCreationSQLs),
        runCmd: (cmd, params) => dbDriver.runCmd(cmd, params, dbConnectInfo, dbCreationSQLs),
        getQuery: (cmd, params) => dbDriver.getQuery(cmd, params, dbConnectInfo, dbCreationSQLs)
    };
}