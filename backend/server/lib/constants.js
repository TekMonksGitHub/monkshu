/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

const path = require("path");
const rootdir = path.resolve(__dirname+"/../");
const args = require(`${rootdir}/lib/processargs.js`).getArgs();
const confdir = path.resolve(args["c"] || args["conf"] ? (args["c"] || args["conf"])[0] : rootdir+"/conf");

exports.ARGS = args;
exports.ROOTDIR = rootdir;
exports.CONFDIR = confdir;
exports.HOSTNAME = require("fs").existsSync(`${confdir}/hostname.json`) ? require(`${confdir}/hostname.json`) : require("os").hostname();
exports.APPROOTDIR = rootdir + "/../apps";
exports.LIBDIR = rootdir + "/lib";
exports.LOGDIR = rootdir + "/logs";
exports.JAVADIR = rootdir + "/java";
exports.GLOBALMEMLOGDIR = rootdir+"/logs";
exports.API_REGISTRY = confdir + "/apiregistry.json";
exports.TRANSPORT = confdir + "/transport.json";
exports.CLUSTERCONF = confdir + "/cluster.json";
exports.LOGSCONF = confdir + "/log.json";
exports.CRYPTCONF = confdir + "/crypt.json";
exports.HTTPDCONF = confdir + "/httpd.json";
exports.IPBLACKLIST = confdir + "/ipblacklist.json";
exports.IPWHITELIST = confdir + "/ipwhitelist.json";
exports.BLACKBOARDCONF = confdir + "/blackboard.json";
exports.GLOBALMEMCONF = confdir + "/globalmemory.json";
exports.NETCHECKCONF = confdir + "/netcheck.json";
exports.OBJOBSERVERCONF = confdir + "/objectobserver.json";
exports.RELEASEFILE = rootdir + "/../../RELEASE";
exports.MAX_LOG = 1024;

/* Shared namespace */
exports.SHARED_PROC_MEMORY = {};

/* Result objects */
exports.FALSE_RESULT = {"result":false};
exports.TRUE_RESULT = {"result":true};

/* API Manager Constants */
exports.API_MANAGER_HEADERS_KEY = "__org_monkshu_apimanager_headers"
exports.API_MANAGER_DECODERS_CONF = confdir+"/apiregistry.decoders.json";
exports.API_MANAGER_ENCODERS_CONF = confdir+"/apiregistry.encoders.json";
exports.API_MANAGER_SECURITYCHECKERS_CONF = confdir+"/apiregistry.securitycheckers.json";
exports.API_MANAGER_HEADERMANAGERS_CONF = confdir+"/apiregistry.headermanagers.json";
