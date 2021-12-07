/**
 * (C) 2021 TekMonks. All rights reserved. 
 */
const monkshu_root = require("path").resolve(__dirname + "/../../../");
const cryptReal = require(`${monkshu_root}/backend/server/lib/crypt.js`);

module.exports = {...cryptReal};

if (require.main === module) cryptReal.main();