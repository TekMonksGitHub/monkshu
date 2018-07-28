/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

var path = require("path");
var rootdir = path.resolve(__dirname+"/../");

exports.ROOTDIR = rootdir;
exports.LIBDIR = rootdir+"/lib";
exports.LOGSDIR = rootdir+"/logs";
exports.ACCESSLOG = rootdir+"/logs/server.log.json";
exports.SERVICE_REGISTRY = rootdir + "/conf/service_registry.json";
exports.TRANSPORT = rootdir + "/conf/transport.json";
exports.CLUSTERCONF = rootdir+"/conf/cluster.json";
exports.MAX_LOG = 1024;

/* SSL CERTIFICATE PATHS */
exports.APACHE_KEY				= '/etc/apache2/ssl/apache.key';
exports.APACHE_CRT 			= '/etc/apache2/ssl/apache.crt';

/* Constants for the FS Login subsystem */
exports.SALT_PW = '$2a$10$VFyiln/PpFyZc.ABoi4ppf';
exports.USERS_DB_PATH = path.resolve(rootdir+"/../db/users");
exports.USERS_FILE = path.resolve(rootdir+"/../db/users/users.json");

/* Result objects */
exports.FALSE_RESULT = {"result":false};
exports.TRUE_RESULT = {"result":true};

/* Encryption constants */
exports.CRPT_ALGO = "aes-256-ctr";
exports.CRYPT_PASS = "92457kwq2941low438938jwkj3029rqqox";