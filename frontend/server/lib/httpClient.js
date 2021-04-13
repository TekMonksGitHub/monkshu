/**
 * (C) 2021 TekMonks. All rights reserved. 
 * 
 */

const path = require("path");
const monkshu_root = path.resolve(__dirname + "/../../../");
const httpClientReal = require(`${monkshu_root}/backend/server/lib/httpClient.js`);

module.exports = {...httpClientReal};

if (require.main === module) httpClientReal.main();