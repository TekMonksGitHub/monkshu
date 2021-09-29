/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const path = require("path");
const ROOTDIR = path.resolve(__dirname+"/../");
const APPNAME = path.resolve(ROOTDIR).split(path.sep).pop();
const DATADIR = process.env.APPDATA || (process.platform == "darwin" ? process.env.HOME + "/Library/Application Support" : process.env.HOME + "/.config");

exports.APPNAME = APPNAME;
exports.ROOTDIR = ROOTDIR;
exports.LIBDIR = ROOTDIR+"/lib";
exports.DATADIR = DATADIR;