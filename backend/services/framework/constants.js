/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

var path = require("path");
var rootdir = path.resolve(__dirname+"/../");

exports.ROOTDIR = rootdir;
exports.FRAMEWORKDIR = rootdir+"/framework";
exports.LOGSDIR = rootdir+"/logs";
exports.ACCESSLOG = rootdir+"/logs/server.log.json";
exports.SERVICE_REGISTRY = rootdir + "/conf/service_registry.json";
exports.TRANSPORT = rootdir + "/conf/transport.json";
   
/* SSL CERTIFICATE PATHS */
exports.APACHE_KEY				= '/etc/apache2/ssl/apache.key';
exports.APACHE_CRT 			= '/etc/apache2/ssl/apache.crt';