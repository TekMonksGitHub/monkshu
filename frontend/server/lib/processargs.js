/**
 * (C) 2021 TekMonks. All rights reserved. 
 */
const monkshu_root = require("path").resolve(__dirname + "/../../../");
const argsReal = require(`${monkshu_root}/backend/server/lib/processargs.js`);

module.exports = {...argsReal};