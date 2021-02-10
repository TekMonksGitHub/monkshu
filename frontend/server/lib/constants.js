/**  
 * (C) 2021 TekMonks. All rights reserved.
 * 
 */

const path = require("path");
const rootdir = path.resolve(__dirname + "/../");

exports.ROOTDIR = rootdir;
exports.CONFDIR = rootdir + "/conf";

/* Shared constants */
exports.SHARED_LIBDIR = path.resolve(rootdir + "/../../shared/lib");
if (!global.SHARED_CONSTANTS) global.SHARED_CONSTANTS = require(`${exports.SHARED_LIBDIR}/constants.js`);
