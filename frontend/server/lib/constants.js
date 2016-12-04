/* 
 * (C) 2015 TekMonks. All rights reserved.
 */

var path = require("path");
var rootdir = path.resolve(__dirname+"/../");

exports.ROOTDIR = rootdir;
exports.LIBDIR = rootdir+"/lib";
exports.LOGSDIR = rootdir+"/logs";
exports.JT400 = rootdir+"/lib/jvmlib/jt400.jar";
exports.JT400TRACEPATH = rootdir+"/logs/jt_trace.log";
exports.ACCESSLOG = rootdir+"/logs/server.log.json";
exports.SERVICE_REGISTRY = rootdir + "/conf/service_registry.json";
exports.AS400_CONF = rootdir + "/conf/as400.json";
exports.ADMIN_CONF = rootdir + "/conf/admin.json";
exports.TRANSPORT = rootdir + "/conf/transport.json";
exports.CLUSTERCONF = rootdir+"/conf/cluster.json";
exports.MAX_LOG = 1024;
   
/* SSL CERTIFICATE PATHS */
exports.APACHE_KEY = '/etc/apache2/ssl/apache.key';
exports.APACHE_CRT = '/etc/apache2/ssl/apache.crt';

/* Constants for the FS Login subsystem */
exports.SALT_PW = '$2a$10$VFyiln/PpFyZc.ABoi4ppf';
exports.USERS_DB_PATH = path.resolve(rootdir+"/../db/users");
exports.USERS_FILE = path.resolve(rootdir+"/../db/users/users.json");

/* Encryption constants */
exports.CRPT_ALGO = "aes-256-ctr";
exports.CRYPT_PASS = "84932ndk9832rje290328jqkj3099rjioq";

/* APICL Constants */
exports.APIDIR = rootdir+"/apis";
exports.API_RELATIVE_DIR = "/apis";
exports.APICL_SCRIPTS_DIR = rootdir+"/apicl_scripts";
exports.APICLDIR = rootdir+"/apicl";
exports.APICLSUBDIR = rootdir+"/apicl/subcmds";
exports.APICL_TEMPLATE = rootdir+"/templates/apicl_template.js";
exports.CL_STRAPI = "STRAPI";
exports.CL_ENDAPI = "ENDAPI";
exports.FALSE_RESULT_OBJ = {"result":false};
exports.TRUE_RESULT_OBJ = {"result":true};
exports.APITYPE_CL = "apicl";
exports.APITYPE_JS = "apijs";
