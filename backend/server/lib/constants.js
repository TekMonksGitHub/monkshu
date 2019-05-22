/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const path = require("path");
const rootdir = path.resolve(__dirname+"/../");

exports.ROOTDIR = rootdir;
exports.APPROOTDIR = rootdir+"/../apps";
exports.LIBDIR = rootdir+"/lib";
exports.LOGDIR = rootdir+"/logs";
exports.ACCESSLOG = rootdir+"/logs/server.log.ndjson";
exports.API_REGISTRY = rootdir + "/conf/apiregistry.json";
exports.TRANSPORT = rootdir + "/conf/transport.json";
exports.CLUSTERCONF = rootdir+"/conf/cluster.json";
exports.LOGSCONF = rootdir+"/conf/log.json";
exports.LOGMAIN = rootdir+"/logs/server.log.ndjson";
exports.CRYPTCONF = rootdir+"/conf/crypt.json";
exports.SSLCONF = rootdir + "/conf/ssl.json";
exports.MAX_LOG = 1024;

/* Result objects */
exports.FALSE_RESULT = {"result":false};
exports.TRUE_RESULT = {"result":true};

/* Key name */
exports.APIKEY = "org_monkshu_apikey";
