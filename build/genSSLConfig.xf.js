/**
 * XForge Build file to generate SSL config for a given application
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const fspromises = require("fs").promises;
const MONKSHU_PATH = path.resolve(`${__dirname}/../`);
const {os_cmd} = require(`${CONSTANTS.EXTDIR}/os_cmd.js`);
const BUILD_CONF = require(`${MONKSHU_PATH}/build/build.json`);
const BLACKBOARD_CONF_FILE = path.resolve(`${MONKSHU_PATH}/backend/server/conf/blackboard.json`);
const LOCAL_IP = require(`${MONKSHU_PATH}/backend/server/lib/utils.js`).getLocalIPs(true)[0]||"127.0.0.1";
const DEFAULT_APP_NAME = _resolveDefaultAppNameSync();
 
// build
exports.make = async function(etcdir, open_ssl_conf, appname) {
    try {
        if ((!etcdir) || (!open_ssl_conf)) throw "Bad incoming arguments."; // check usage
        if (appname.toLowerCase() == "use_default_app") appname = null;

        if (!fs.existsSync(etcdir)) fs.mkdirSync(etcdir, {recursive: true}); 

        CONSTANTS.LOGINFO(`Detected IP as ${LOCAL_IP}.`);

        CONSTANTS.LOGINFO("Generating SSL certificates."); etcdir = path.resolve(etcdir); open_ssl_conf = path.resolve(open_ssl_conf);
        if (!await CONSTANTS.SHELL.test("-e", etcdir)) await CONSTANTS.SHELL.mkdir("-p", etcdir);  // create the cert directory if it doesn't exist
        await os_cmd(`openssl req${BUILD_CONF.OPENSSLCONF && os.platform=="darwin"?` -config ${BUILD_CONF.OPENSSLCONF}`:""} -newkey rsa:2048 -nodes -keyout "${etcdir}/dnsip_privkey.pem" -x509 -days 365 -subj "/CN=*/C=US/L=San Fransisco/OU=Test/O=Test" -out "${etcdir}/dnsip_fullchain.pem"`, 
            false, os.platform=="darwin"?{OPENSSL_CONF: open_ssl_conf}:undefined);

        CONSTANTS.LOGINFO("Setting hostnames");
        CONSTANTS.LOGINFO(`Resolved app name as ${appname||DEFAULT_APP_NAME}`);
        const frontend_host_file = path.resolve(`${MONKSHU_PATH}/frontend/apps/${appname||DEFAULT_APP_NAME}/conf/hostname.json`);
        const backend_host_file = path.resolve(`${MONKSHU_PATH}/backend/apps/${appname||DEFAULT_APP_NAME}/conf/hostname.json`);
        
        CONSTANTS.LOGINFO("Writing hostname to "+backend_host_file);
        await _makePathWritable(backend_host_file); await fspromises.writeFile(backend_host_file, `"${LOCAL_IP}"`);
        CONSTANTS.LOGINFO("Writing hostname to "+frontend_host_file);
        await _makePathWritable(frontend_host_file); await fspromises.writeFile(frontend_host_file, `"${LOCAL_IP}"`);
        
        CONSTANTS.LOGINFO("Writing blackboard config to "+BLACKBOARD_CONF_FILE);
        const blackboard_conf = (await fspromises.readFile(BLACKBOARD_CONF_FILE, "utf8")).replace(/\"secure\"\s*:\s*false/, `"secure": true`);
        await _makePathWritable(BLACKBOARD_CONF_FILE); await fspromises.writeFile(BLACKBOARD_CONF_FILE, blackboard_conf);
        
        const backend_httpd_file = path.resolve(`${MONKSHU_PATH}/backend/apps/${appname||DEFAULT_APP_NAME}/conf/httpd.json`);
        CONSTANTS.LOGINFO("Adding SSL certificate paths to "+backend_httpd_file);
        await _makePathWritable(backend_httpd_file); await _modifyHTTPDConf(backend_httpd_file, etcdir, false);
        const frontend_httpd_file = path.resolve(`${MONKSHU_PATH}/frontend/apps/${appname||DEFAULT_APP_NAME}/conf/httpd.json`);
        CONSTANTS.LOGINFO("Adding SSL certificate paths to "+frontend_httpd_file);
        await _makePathWritable(frontend_httpd_file); await _modifyHTTPDConf(frontend_httpd_file, etcdir, true);

        CONSTANTS.LOGSUCCESS();
    } catch (err) { 
        CONSTANTS.LOGHELP("Build command format: xforge -c -f genSSLConfig.xf.js -o [app_name] -o [cert_dir] -o [open_ssl_conf]");
        CONSTANTS.LOGHELP("app_name is the application name, cert_dir is the directory for generated certs, and open_ssl_conf is the path to the OpenSSL config file.");
        return CONSTANTS.HANDLE_BUILD_ERROR(err); 
    }
}

async function _modifyHTTPDConf(file, etcdir, setPort443) {
    CONSTANTS.LOGINFO("Writing httpd SSL config to the file "+file);
    
    let httpd_conf; try {httpd_conf = JSON.parse(await fspromises.readFile(file, "utf8"));} catch (err) {httpd_conf = {}};
    
    httpd_conf.ssl = true; httpd_conf.sslKeyFile = path.resolve(`${etcdir}/dnsip_privkey.pem`);
    httpd_conf.sslCertFile = path.resolve(`${etcdir}/dnsip_fullchain.pem`); if (setPort443) httpd_conf.port = 443;
    CONSTANTS.LOGINFO("Checking path exists "+path.dirname(file));
    await fspromises.writeFile(file, JSON.stringify(httpd_conf, null, 4));
}

async function _makePathWritable(file) {
    if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file), {recursive: true}); 
}

function _resolveDefaultAppNameSync() {
    if (!fs.existsSync(`${MONKSHU_PATH}/frontend/apps`)) return null;
    
    for (const direntry of fs.readdirSync(`${MONKSHU_PATH}/frontend/apps`)) 
        if (fs.statSync(`${MONKSHU_PATH}/frontend/apps/${direntry}`).isDirectory()) return direntry;

    return null;
}