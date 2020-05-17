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
exports.HTTPDCONF = rootdir + "/conf/httpd.json";
exports.BLACKBOARDCONF = rootdir + "/conf/blackboard.json";
exports.RELEASEFILE = rootdir+"/../../RELEASE";
exports.MAX_LOG = 1024;

/* Shared namespace */
exports.SHARED_PROC_MEMORY = {};

/* Result objects */
exports.FALSE_RESULT = {"result":false};
exports.TRUE_RESULT = {"result":true};

/* API Manager Constants */
exports.API_MANAGER_HEADERS_KEY = "__org_monkshu_apimanager_headers"
exports.API_MANAGER_DECODERS_CONF = "/conf/apiregistry.decoders.json";
exports.API_MANAGER_ENCODERS_CONF = "/conf/apiregistry.encoders.json";
exports.API_MANAGER_SECURITYCHECKERS_CONF = "/conf/apiregistry.securitycheckers.json";
exports.API_MANAGER_HEADERMANAGERS_CONF = "/conf/apiregistry.headermanagers.json";