/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const release = require("fs").readFileSync(CONSTANTS.RELEASEFILE, "utf8");

exports.doService = request => {return {"release": release, request}}