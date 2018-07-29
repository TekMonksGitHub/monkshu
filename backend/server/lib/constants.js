/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

var path = require("path");
var rootdir = path.resolve(__dirname+"/../");

exports.ROOTDIR = rootdir;
exports.LIBDIR = rootdir+"/lib";
exports.LOGSDIR = rootdir+"/../log";
exports.ACCESSLOG = rootdir+"/../log/admin_api.log.json";
exports.SERVICE_REGISTRY = rootdir + "/conf/service_registry.json";
exports.TRANSPORT = rootdir + "/conf/transport.json";
exports.CLUSTERCONF = rootdir+"/conf/cluster.json";
exports.MAX_LOG = 1024;

/* Result objects */
exports.FALSE_RESULT = {"result":false};
exports.TRUE_RESULT = {"result":true};

/* Encryption constants */
exports.CRPT_ALGO = "aes-256-ctr";
exports.CRYPT_PASS = "21887als2141rwq294938jwkj3029rqsnj";

/* Key name */
exports.APIKEY = "org_monkshu_apikey";