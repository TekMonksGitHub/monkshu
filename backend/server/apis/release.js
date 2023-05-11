/**
 * Simply returns the current release of the server. 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 */

const fs = require("fs");
const release = fs.readFileSync(CONSTANTS.RELEASEFILE, "utf8").trim();
const build_number = fs.readFileSync(CONSTANTS.BUILD_NUMBER_FILE, "utf8").trim();

exports.doService = (request, _servObject, headers, _url, _apiconf) => {return {release, build_number, request, headers}}