/**
 * Simply returns the current release of the server. 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 */

const release = require("fs").readFileSync(CONSTANTS.RELEASEFILE, "utf8");

exports.doService = (request, _servObject, headers, _url, _apiconf) => {return {"release": release, request, headers}}