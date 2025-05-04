/**
 * XForge Build file for Monkshu web app. Deploys to the current VM with
 * a self signed certificate. Duplicates VS-Code's tasks.json.
 */

const path = require("path");
const {os_cmd} = require(`${CONSTANTS.EXTDIR}/os_cmd.js`);

const workspaceFolder = path.resolve(`${__dirname}/../`);

// build
exports.make = async function(appname="use_default_app") {
    try {
        // Build Cachelists
        await os_cmd(`'${workspaceFolder}/../xforge/xforge' -c -f '${workspaceFolder}/build/genCacheableFilesList.xf.js'`);

        // Generate SSL Config
        await os_cmd(`'${workspaceFolder}/../xforge/xforge' -c -f '${workspaceFolder}/build/genSSLConfig.xf.js' -o '${workspaceFolder}/../etc' -o '${workspaceFolder}/../etc/openssl.cfg' -o ${appname}`);

        // Build Webbundle
        await os_cmd(`'${workspaceFolder}/../xforge/xforge' -c -f '${workspaceFolder}/build/webbundle.xf.js'`);

        CONSTANTS.LOGSUCCESS();
    } catch (err) {
        CONSTANTS.LOGHELP("Build command format: xforge -c -f buildWebapp.xf.js [-o monkshu_app_name]")
        return CONSTANTS.HANDLE_BUILD_ERROR(err);
    }
}