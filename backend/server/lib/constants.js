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
exports.WS_API_REGISTRY = rootdir + "/conf/wsapiregistry.json";
exports.TRANSPORT = rootdir + "/conf/transport.json";
exports.CLUSTERCONF = rootdir+"/conf/cluster.json";
exports.LOGSCONF = rootdir+"/conf/log.json";
exports.LOGMAIN = rootdir+"/logs/server.log.ndjson";
exports.CRYPTCONF = rootdir+"/conf/crypt.json";
exports.HTTPDCONF = rootdir + "/conf/httpd.json";
exports.TOKENMANCONF = rootdir + "/conf/apitoken.json";
exports.MAX_LOG = 1024;

/* Result objects */
exports.FALSE_RESULT = {"result":false};
exports.TRUE_RESULT = {"result":true};

/* Key name */
exports.APIKEYS = ["X-API-Key", "org_monkshu_apikey"];
