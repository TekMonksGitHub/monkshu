/**
 * XForge Build file to generate SSL config for a given application
 */
const fs = require("fs");
const path = require("path");
const fspromises = require("fs").promises;
const MONKSHU_PATH = path.resolve(`${__dirname}/../`);
const {os_cmd} = require(`${CONSTANTS.EXTDIR}/os_cmd.js`);
const BACKEND_HOST_FILE = path.resolve(`${MONKSHU_PATH}/backend/server/conf/hostname.json`);
const BLACKBOARD_CONF_FILE = path.resolve(`${MONKSHU_PATH}/backend/server/conf/blackboard.json`);
const LOCAL_IP = Object.values(require("os").networkInterfaces()).reduce((r, list) => r.concat(list.reduce((rr, i) => 
    rr.concat(i.family=="IPv4" && !i.internal && i.address || []), [])), []);
const DEFAULT_APP_NAME = fs.existsSync(`${MONKSHU_PATH}/frontend/apps`) ? 
    fs.readdirSync(`${MONKSHU_PATH}/frontend/apps`)[0] : null;
 
// build
exports.make = async function(etcdir, open_ssl_conf, appname) {
    try {
        if ((!etcdir) || (!open_ssl_conf)) throw "Bad incoming arguments."; // check usage
        if (appname.toLowerCase() == "use_default_app") appname = null;

        CONSTANTS.LOGINFO(`Detected IP as ${LOCAL_IP}.`);

        CONSTANTS.LOGINFO("Generating SSL certificates."); etcdir = path.resolve(etcdir); open_ssl_conf = path.resolve(open_ssl_conf);
        await os_cmd(`openssl req -newkey rsa:2048 -nodes -keyout ${etcdir}/dnsip_privkey.pem -x509 -days 365 -subj "/CN=${LOCAL_IP}/C=US/L=San Fransisco/OU=Test/O=Test" -out ${etcdir}/dnsip_fullchain.pem`, 
            false, {OPENSSL_CONF: open_ssl_conf});

        CONSTANTS.LOGINFO("Setting hostnames");
        const frontend_host_file = path.resolve(`${MONKSHU_PATH}/frontend/apps/${appname||DEFAULT_APP_NAME}/conf/hostname.json`);
        CONSTANTS.LOGINFO("Writing hostname to "+BACKEND_HOST_FILE);
        await fspromises.writeFile(BACKEND_HOST_FILE, `"${LOCAL_IP}"`);
        CONSTANTS.LOGINFO("Writing hostname to "+frontend_host_file);
        await fspromises.writeFile(frontend_host_file, `"${LOCAL_IP}"`);
        CONSTANTS.LOGINFO("Writing blackboard config to "+BLACKBOARD_CONF_FILE);
        const blackboard_conf = (await fspromises.readFile(BLACKBOARD_CONF_FILE, "utf8")).replace(/\"secure\"\s*:\s*false/, `"secure": true`);
        await fspromises.writeFile(BLACKBOARD_CONF_FILE, blackboard_conf);

        CONSTANTS.LOGSUCCESS();
    } catch (err) { 
        CONSTANTS.LOGHELP("Build command format: xforge -c -f genSSLConfig.xf.js -o [app_name] -o [cert_dir] -o [open_ssl_conf]");
        CONSTANTS.LOGHELP("app_name is the application name, cert_dir is the directory for generated certs, and open_ssl_conf is the path to the OpenSSL config file.");
        return CONSTANTS.HANDLE_BUILD_ERROR(err); 
    }
}
 